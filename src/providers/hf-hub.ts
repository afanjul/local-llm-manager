import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type {
  CachedFile,
  CachedRevision,
  CachedRepo,
  RepoType,
  StoredArtifact,
  ProviderStats,
} from '../types.js';

export function getCacheDir(): string {
  if (process.env.HF_HUB_CACHE) return process.env.HF_HUB_CACHE;
  if (process.env.HF_HOME) return path.join(process.env.HF_HOME, 'hub');
  return path.join(os.homedir(), '.cache', 'huggingface', 'hub');
}

function parseRepoDirName(dirName: string): { repoType: RepoType; repoId: string } | null {
  const typeMap: Record<string, RepoType> = {
    models: 'model',
    datasets: 'dataset',
    spaces: 'space',
  };

  const sep = dirName.indexOf('--');
  if (sep === -1) return null;

  const typeKey = dirName.slice(0, sep);
  const rest = dirName.slice(sep + 2);
  const repoType = typeMap[typeKey];
  if (!repoType) return null;

  const repoId = rest.replace(/--/g, '/');
  return { repoType, repoId };
}

export function walkDir(
  dirPath: string,
  callback: (fullPath: string, relName: string) => void,
  prefix = '',
): void {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relName = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walkDir(fullPath, callback, relName);
      } else {
        callback(fullPath, relName);
      }
    }
  } catch {}
}

function scanBlobs(blobsDir: string): Map<string, { size: number; atime: Date; mtime: Date }> {
  const map = new Map<string, { size: number; atime: Date; mtime: Date }>();
  try {
    const entries = fs.readdirSync(blobsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      try {
        const stat = fs.statSync(path.join(blobsDir, entry.name));
        map.set(entry.name, { size: stat.size, atime: stat.atime, mtime: stat.mtime });
      } catch {}
    }
  } catch {}
  return map;
}

function scanRefs(refsDir: string): Map<string, string[]> {
  const commitToRefs = new Map<string, string[]>();
  try {
    walkDir(refsDir, (fullPath, relName) => {
      try {
        const hash = fs.readFileSync(fullPath, 'utf-8').trim();
        if (!commitToRefs.has(hash)) commitToRefs.set(hash, []);
        commitToRefs.get(hash)!.push(relName);
      } catch {}
    });
  } catch {}
  return commitToRefs;
}

function scanRepo(cacheDir: string, dirName: string): CachedRepo | null {
  const parsed = parseRepoDirName(dirName);
  if (!parsed) return null;

  const repoPath = path.join(cacheDir, dirName);
  const blobsDir = path.join(repoPath, 'blobs');
  const snapshotsDir = path.join(repoPath, 'snapshots');
  const refsDir = path.join(repoPath, 'refs');

  const blobMap = scanBlobs(blobsDir);
  const totalSize = Array.from(blobMap.values()).reduce((s, b) => s + b.size, 0);
  const commitToRefs = scanRefs(refsDir);

  const revisions: CachedRevision[] = [];
  let globalLastAccessed = new Date(0);
  let globalLastModified = new Date(0);

  try {
    const snapDirs = fs.readdirSync(snapshotsDir, { withFileTypes: true });

    for (const snapDir of snapDirs) {
      if (!snapDir.isDirectory()) continue;

      const commitHash = snapDir.name;
      const snapPath = path.join(snapshotsDir, commitHash);
      const refs = commitToRefs.get(commitHash) ?? [];
      const files: CachedFile[] = [];
      let revSize = 0;
      let revLastModified = new Date(0);

      walkDir(snapPath, (filePath, relName) => {
        try {
          const lstat = fs.lstatSync(filePath);
          let blobHash = '';
          let size = 0;
          let lastModified = new Date(0);
          let lastAccessed = new Date(0);

          if (lstat.isSymbolicLink()) {
            const linkTarget = fs.readlinkSync(filePath);
            blobHash = path.basename(linkTarget);
            const blobInfo = blobMap.get(blobHash);
            if (blobInfo) {
              size = blobInfo.size;
              lastModified = blobInfo.mtime;
              lastAccessed = blobInfo.atime;
            }
          } else if (lstat.isFile()) {
            size = lstat.size;
            lastModified = lstat.mtime;
            lastAccessed = lstat.atime;
          } else {
            return;
          }

          files.push({ name: relName, blobHash, size, lastModified, lastAccessed });
          revSize += size;
          if (lastModified > revLastModified) revLastModified = lastModified;
          if (lastAccessed > globalLastAccessed) globalLastAccessed = lastAccessed;
        } catch {}
      });

      if (revLastModified > globalLastModified) globalLastModified = revLastModified;

      revisions.push({
        commitHash,
        shortHash: commitHash.slice(0, 8),
        refs,
        files: files.sort((a, b) => b.size - a.size),
        size: revSize,
        lastModified: revLastModified,
      });
    }
  } catch {}

  revisions.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

  const nbFiles = revisions.reduce((s, r) => s + r.files.length, 0);

  return {
    repoId: parsed.repoId,
    repoType: parsed.repoType,
    dirName,
    path: repoPath,
    revisions,
    size: totalSize,
    nbFiles,
    lastAccessed: globalLastAccessed,
    lastModified: globalLastModified,
  };
}

export function deleteRepo(repoPath: string): void {
  fs.rmSync(repoPath, { recursive: true, force: true });
}

export function deleteRevision(repoPath: string, commitHash: string): void {
  const snapshotsDir = path.join(repoPath, 'snapshots');
  const blobsDir = path.join(repoPath, 'blobs');

  const keepBlobs = new Set<string>();
  try {
    const revDirs = fs.readdirSync(snapshotsDir);
    for (const rev of revDirs) {
      if (rev === commitHash) continue;
      walkDir(path.join(snapshotsDir, rev), (filePath) => {
        try {
          const lstat = fs.lstatSync(filePath);
          if (lstat.isSymbolicLink()) {
            keepBlobs.add(path.basename(fs.readlinkSync(filePath)));
          }
        } catch {}
      });
    }
  } catch {}

  try {
    fs.rmSync(path.join(snapshotsDir, commitHash), { recursive: true, force: true });
  } catch {}

  const refsDir = path.join(repoPath, 'refs');
  try {
    walkDir(refsDir, (fullPath) => {
      try {
        const hash = fs.readFileSync(fullPath, 'utf-8').trim();
        if (hash === commitHash) fs.unlinkSync(fullPath);
      } catch {}
    });
  } catch {}

  try {
    const blobs = fs.readdirSync(blobsDir);
    for (const blob of blobs) {
      if (!keepBlobs.has(blob)) {
        try { fs.unlinkSync(path.join(blobsDir, blob)); } catch {}
      }
    }
  } catch {}
}

const RESOURCE_TYPE_MAP: Record<RepoType, StoredArtifact['resourceType']> = {
  model: 'model',
  dataset: 'dataset',
  space: 'space',
};

export function scanHfHub(): ProviderStats {
  const cacheDir = getCacheDir();
  const artifacts: StoredArtifact[] = [];

  try {
    const entries = fs.readdirSync(cacheDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (!/^(models|datasets|spaces)--/.test(entry.name)) continue;
      const repo = scanRepo(cacheDir, entry.name);
      if (!repo) continue;

      const isIncomplete = repo.revisions.length === 0 || repo.size === 0;
      let lastSeenAt = repo.lastModified.getTime() > 0 ? repo.lastModified : repo.lastAccessed;
      if (isIncomplete) {
        // No revisions — use the repo directory mtime as the "initiated at" timestamp
        try { lastSeenAt = fs.statSync(repo.path).mtime; } catch {}
      }

      const artifact: StoredArtifact = {
        id: `huggingface-hub::${repo.path}`,
        provider: 'huggingface-hub',
        resourceType: isIncomplete ? 'incomplete-download' : RESOURCE_TYPE_MAP[repo.repoType],
        logicalName: repo.repoId,
        repoId: repo.repoId,
        localPath: repo.path,
        sizeBytes: repo.size,
        rootPath: cacheDir,
        isDeletable: true,
        deleteStrategy: 'repo_delete',
        lastSeenAt,
        hfCacheClass: 'hub',
        cachedRepo: repo,
      };
      artifacts.push(artifact);
    }
  } catch {}

  return {
    provider: 'huggingface-hub',
    label: 'HF Hub',
    rootPath: cacheDir,
    isAvailable: artifacts.length > 0 || fs.existsSync(cacheDir),
    artifacts,
    totalSize: artifacts.reduce((s, a) => s + a.sizeBytes, 0),
  };
}

export function deleteHfHubArtifact(artifact: StoredArtifact, revision?: import('../types.js').CachedRevision): void {
  if (revision) {
    deleteRevision(artifact.localPath, revision.commitHash);
  } else {
    deleteRepo(artifact.localPath);
  }
}
