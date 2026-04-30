import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { StoredArtifact, ProviderStats } from '../types.js';

function getOmlxRoot(): string {
  return process.env.OMLX_MODELS ?? path.join(os.homedir(), '.omlx', 'models');
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

export function scanOmlx(): ProviderStats {
  const rootPath = getOmlxRoot();
  const artifacts: StoredArtifact[] = [];

  try {
    const entries = fs.readdirSync(rootPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue;
      const modelPath = path.join(rootPath, entry.name);
      let mtime = new Date(0);
      try { mtime = fs.statSync(modelPath).mtime; } catch {}
      const size = dirSize(modelPath);

      artifacts.push({
        id: `omlx::${modelPath}`,
        provider: 'omlx',
        resourceType: 'model',
        logicalName: entry.name,
        localPath: modelPath,
        sizeBytes: size,
        rootPath,
        isDeletable: true,
        deleteStrategy: 'repo_delete',
        lastSeenAt: mtime,
      });
    }
  } catch {}

  return {
    provider: 'omlx',
    label: 'OMLX',
    rootPath,
    isAvailable: artifacts.length > 0 || fs.existsSync(rootPath),
    artifacts,
    totalSize: artifacts.reduce((s, a) => s + a.sizeBytes, 0),
  };
}
