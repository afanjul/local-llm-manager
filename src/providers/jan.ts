import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { StoredArtifact, ProviderStats } from '../types.js';

function getJanDataRoot(): string {
  if (process.env.JAN_DATA_FOLDER) return process.env.JAN_DATA_FOLDER;
  return path.join(os.homedir(), 'Library', 'Application Support', 'Jan', 'data');
}

function dirSize(dirPath: string): number {
  let total = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      try {
        if (entry.isDirectory()) {
          total += dirSize(fullPath);
        } else if (entry.isFile()) {
          total += fs.statSync(fullPath).size;
        }
      } catch {}
    }
  } catch {}
  return total;
}

export function scanJan(): ProviderStats {
  const dataRoot = getJanDataRoot();
  const modelsDir = path.join(dataRoot, 'models');
  const artifacts: StoredArtifact[] = [];

  try {
    const entries = fs.readdirSync(modelsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const modelPath = path.join(modelsDir, entry.name);
      let mtime = new Date(0);
      try { mtime = fs.statSync(modelPath).mtime; } catch {}
      const size = dirSize(modelPath);

      artifacts.push({
        id: `jan::${modelPath}`,
        provider: 'jan',
        resourceType: 'model',
        logicalName: entry.name,
        localPath: modelPath,
        sizeBytes: size,
        rootPath: dataRoot,
        isDeletable: true,
        deleteStrategy: 'repo_delete',
        lastSeenAt: mtime,
      });
    }
  } catch {}

  return {
    provider: 'jan',
    label: 'Jan',
    rootPath: dataRoot,
    isAvailable: artifacts.length > 0 || fs.existsSync(modelsDir),
    artifacts,
    totalSize: artifacts.reduce((s, a) => s + a.sizeBytes, 0),
  };
}
