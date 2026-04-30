import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { StoredArtifact, ProviderStats } from '../types.js';

function getLlamaCppRoot(): string {
  return process.env.LLAMA_CACHE ?? path.join(os.homedir(), '.cache', 'llama.cpp');
}

const MODEL_EXTENSIONS = new Set(['.gguf', '.bin', '.ggml']);

export function scanLlamaCpp(): ProviderStats {
  const rootPath = getLlamaCppRoot();
  const artifacts: StoredArtifact[] = [];

  // llama.cpp has two storage patterns:
  //   1. Flat files directly in root (auto-downloaded via --hf-repo) → file_delete each
  //   2. Subdirectories containing a model + companion files (mmproj, shards) → repo_delete the dir
  try {
    const entries = fs.readdirSync(rootPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(rootPath, entry.name);

      if (entry.isDirectory()) {
        // Treat the whole subdir as one artifact if it contains model files
        let size = 0;
        let mtime = new Date(0);
        let hasModelFile = false;
        try {
          for (const f of fs.readdirSync(fullPath, { withFileTypes: true })) {
            if (!f.isFile()) continue;
            if (!MODEL_EXTENSIONS.has(path.extname(f.name).toLowerCase())) continue;
            hasModelFile = true;
            try {
              const stat = fs.statSync(path.join(fullPath, f.name));
              size += stat.size;
              if (stat.mtime > mtime) mtime = stat.mtime;
            } catch {}
          }
        } catch {}
        if (!hasModelFile) continue;

        artifacts.push({
          id: `llamacpp::${fullPath}`,
          provider: 'llamacpp',
          resourceType: 'model',
          logicalName: entry.name,
          localPath: fullPath,
          sizeBytes: size,
          rootPath,
          isDeletable: true,
          deleteStrategy: 'repo_delete',
          lastSeenAt: mtime,
        });

      } else if (entry.isFile() && MODEL_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        let size = 0;
        let mtime = new Date(0);
        try {
          const stat = fs.statSync(fullPath);
          size = stat.size;
          mtime = stat.mtime;
        } catch {}

        artifacts.push({
          id: `llamacpp::${fullPath}`,
          provider: 'llamacpp',
          resourceType: 'model',
          logicalName: entry.name,
          localPath: fullPath,
          sizeBytes: size,
          rootPath,
          isDeletable: true,
          deleteStrategy: 'file_delete',
          lastSeenAt: mtime,
        });
      }
    }
  } catch {}


  return {
    provider: 'llamacpp',
    label: 'llama.cpp',
    rootPath,
    isAvailable: artifacts.length > 0 || fs.existsSync(rootPath),
    artifacts,
    totalSize: artifacts.reduce((s, a) => s + a.sizeBytes, 0),
  };
}
