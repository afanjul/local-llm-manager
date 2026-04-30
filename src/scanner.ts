import * as fs from 'node:fs';
import { scanHfHub, deleteHfHubArtifact } from './providers/hf-hub.js';
import { scanHfDatasets } from './providers/hf-datasets.js';
import { scanHfAssets } from './providers/hf-assets.js';
import { scanOllama } from './providers/ollama.js';
import { scanLmStudio } from './providers/lmstudio.js';
import { scanLlamaCpp } from './providers/llamacpp.js';
import { scanGpt4All } from './providers/gpt4all.js';
import { scanJan } from './providers/jan.js';
import { scanOmlx } from './providers/omlx.js';
import type { AppStats, StoredArtifact, CachedRevision } from './types.js';

export function scanAll(): AppStats {
  const providers = [
    scanHfHub(),
    scanHfDatasets(),
    scanHfAssets(),
    scanOllama(),
    scanLmStudio(),
    scanLlamaCpp(),
    scanGpt4All(),
    scanJan(),
    scanOmlx(),
  ];
  const artifacts = providers.flatMap((p) => p.artifacts);
  return {
    totalSize: artifacts.reduce((s, a) => s + a.sizeBytes, 0),
    providers,
    artifacts,
  };
}

export function deleteArtifact(artifact: StoredArtifact, revision?: CachedRevision): void {
  switch (artifact.deleteStrategy) {
    case 'revision_delete':
    case 'repo_delete':
      if (artifact.provider === 'huggingface-hub') {
        deleteHfHubArtifact(artifact, revision);
      } else {
        fs.rmSync(artifact.localPath, { recursive: true, force: true });
      }
      break;
    case 'file_delete':
      fs.unlinkSync(artifact.localPath);
      break;
  }
}
