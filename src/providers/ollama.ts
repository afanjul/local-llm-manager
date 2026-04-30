import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { StoredArtifact, ProviderStats } from '../types.js';

function getOllamaRoot(): string {
  return process.env.OLLAMA_MODELS ?? path.join(os.homedir(), '.ollama', 'models');
}

interface OllamaLayer {
  digest: string;
  size: number;
}

interface OllamaManifest {
  layers?: OllamaLayer[];
}

function parseManifest(filePath: string): OllamaManifest | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as OllamaManifest;
  } catch {
    return null;
  }
}

export function scanOllama(): ProviderStats {
  const rootPath = getOllamaRoot();
  const manifestsDir = path.join(rootPath, 'manifests');
  const artifacts: StoredArtifact[] = [];

  try {
    // Walk manifests/{registry}/{namespace}/{name}/{tag}
    const registries = fs.readdirSync(manifestsDir, { withFileTypes: true });
    for (const registry of registries) {
      if (!registry.isDirectory()) continue;
      const registryPath = path.join(manifestsDir, registry.name);

      const namespaces = fs.readdirSync(registryPath, { withFileTypes: true });
      for (const ns of namespaces) {
        if (!ns.isDirectory()) continue;
        const nsPath = path.join(registryPath, ns.name);

        const names = fs.readdirSync(nsPath, { withFileTypes: true });
        for (const modelName of names) {
          if (!modelName.isDirectory()) continue;
          const modelPath = path.join(nsPath, modelName.name);

          const tags = fs.readdirSync(modelPath, { withFileTypes: true });
          for (const tag of tags) {
            if (!tag.isFile()) continue;
            const manifestPath = path.join(modelPath, tag.name);
            const manifest = parseManifest(manifestPath);

            let sizeBytes = 0;
            if (manifest?.layers) {
              sizeBytes = manifest.layers.reduce((s, l) => s + (l.size ?? 0), 0);
            }

            let mtime = new Date(0);
            try { mtime = fs.statSync(manifestPath).mtime; } catch {}

            const logicalName = `${ns.name}/${modelName.name}:${tag.name}`;

            artifacts.push({
              id: `ollama::${manifestPath}`,
              provider: 'ollama',
              resourceType: 'model',
              logicalName,
              localPath: manifestPath,
              sizeBytes,
              rootPath,
              isDeletable: true,
              deleteStrategy: 'file_delete',
              lastSeenAt: mtime,
            });
          }
        }
      }
    }
  } catch {}

  return {
    provider: 'ollama',
    label: 'Ollama',
    rootPath,
    isAvailable: artifacts.length > 0 || fs.existsSync(rootPath),
    artifacts,
    totalSize: artifacts.reduce((s, a) => s + a.sizeBytes, 0),
  };
}
