import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { StoredArtifact, ProviderStats } from '../types.js';

function getGpt4AllRoot(): string {
  if (process.env.GPT4ALL_MODELS) return process.env.GPT4ALL_MODELS;
  // macOS path
  return path.join(os.homedir(), 'Library', 'Application Support', 'nomic.ai', 'GPT4All');
}

export function scanGpt4All(): ProviderStats {
  const rootPath = getGpt4AllRoot();
  const artifacts: StoredArtifact[] = [];

  try {
    const entries = fs.readdirSync(rootPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!entry.name.toLowerCase().endsWith('.gguf')) continue;

      const filePath = path.join(rootPath, entry.name);
      let size = 0;
      let mtime = new Date(0);
      try {
        const stat = fs.statSync(filePath);
        size = stat.size;
        mtime = stat.mtime;
      } catch {}

      artifacts.push({
        id: `gpt4all::${filePath}`,
        provider: 'gpt4all',
        resourceType: 'model',
        logicalName: entry.name,
        localPath: filePath,
        sizeBytes: size,
        rootPath,
        isDeletable: true,
        deleteStrategy: 'file_delete',
        lastSeenAt: mtime,
      });
    }
  } catch {}

  return {
    provider: 'gpt4all',
    label: 'GPT4All',
    rootPath,
    isAvailable: artifacts.length > 0 || fs.existsSync(rootPath),
    artifacts,
    totalSize: artifacts.reduce((s, a) => s + a.sizeBytes, 0),
  };
}
