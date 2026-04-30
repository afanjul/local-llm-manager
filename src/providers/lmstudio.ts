import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { StoredArtifact, ProviderStats } from '../types.js';

const MODEL_EXTENSIONS = new Set(['.gguf', '.bin', '.safetensors', '.pt', '.ggml']);

function getLmStudioRoot(): string {
  return process.env.LMSTUDIO_MODELS ?? path.join(os.homedir(), '.lmstudio', 'models');
}

function folderSize(dirPath: string): { size: number; mtime: Date } {
  let size = 0;
  let mtime = new Date(0);
  try {
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      try {
        const stat = fs.statSync(path.join(dirPath, entry.name));
        size += stat.size;
        if (stat.mtime > mtime) mtime = stat.mtime;
      } catch {}
    }
  } catch {}
  return { size, mtime };
}

export function scanLmStudio(): ProviderStats {
  const rootPath = getLmStudioRoot();
  const artifacts: StoredArtifact[] = [];

  // Structure: publisher/model-family/{all model files including mmproj, shards, safetensors}
  // Treat the model-family folder as the atomic unit — deleting it removes all companion files.
  try {
    const publishers = fs.readdirSync(rootPath, { withFileTypes: true });
    for (const publisher of publishers) {
      if (!publisher.isDirectory()) continue;
      const publisherPath = path.join(rootPath, publisher.name);

      const modelFamilies = fs.readdirSync(publisherPath, { withFileTypes: true });
      for (const family of modelFamilies) {
        if (!family.isDirectory()) continue;
        const familyPath = path.join(publisherPath, family.name);

        // Only emit an artifact if the folder contains at least one recognized model file
        const files = fs.readdirSync(familyPath, { withFileTypes: true });
        const hasModelFile = files.some(
          f => f.isFile() && MODEL_EXTENSIONS.has(path.extname(f.name).toLowerCase())
        );
        if (!hasModelFile) continue;

        const { size, mtime } = folderSize(familyPath);

        artifacts.push({
          id: `lmstudio::${familyPath}`,
          provider: 'lmstudio',
          resourceType: 'model',
          logicalName: `${publisher.name}/${family.name}`,
          localPath: familyPath,
          sizeBytes: size,
          rootPath,
          isDeletable: true,
          deleteStrategy: 'repo_delete',
          lastSeenAt: mtime,
        });
      }
    }
  } catch {}

  return {
    provider: 'lmstudio',
    label: 'LM Studio',
    rootPath,
    isAvailable: artifacts.length > 0 || fs.existsSync(rootPath),
    artifacts,
    totalSize: artifacts.reduce((s, a) => s + a.sizeBytes, 0),
  };
}
