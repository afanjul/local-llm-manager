export type RepoType = 'model' | 'dataset' | 'space';
export type SortBy = 'size' | 'name' | 'accessed' | 'modified';
export type FilterType = 'all' | 'model' | 'dataset' | 'space' | 'asset';
export type ViewMode = 'list' | 'detail' | 'download' | 'delete-confirm';

export type Provider =
  | 'huggingface-hub'
  | 'huggingface-datasets'
  | 'huggingface-assets'
  | 'ollama'
  | 'lmstudio'
  | 'llamacpp'
  | 'gpt4all'
  | 'jan'
  | 'omlx';

export type ResourceType = 'model' | 'dataset' | 'space' | 'asset' | 'unknown' | 'incomplete-download';

export type DeleteStrategy =
  | 'file_delete'           // single file (llama.cpp, GPT4All loose GGUFs)
  | 'repo_delete'           // whole directory (HF hub repo, Jan model dir, Ollama manifest)
  | 'revision_delete'       // one HF Hub revision (snapshot + orphaned blobs)
  | 'root_delete_guarded';  // entire provider root — only behind extra confirmation

export type ProviderFilter = 'all' | Provider;

export interface CachedFile {
  name: string;
  blobHash: string;
  size: number;
  lastModified: Date;
  lastAccessed: Date;
}

export interface CachedRevision {
  commitHash: string;
  shortHash: string;
  refs: string[];
  files: CachedFile[];
  size: number;
  lastModified: Date;
}

export interface CachedRepo {
  repoId: string;
  repoType: RepoType;
  dirName: string;
  path: string;
  revisions: CachedRevision[];
  size: number;
  nbFiles: number;
  lastAccessed: Date;
  lastModified: Date;
}

export interface CacheStats {
  totalSize: number;
  repos: CachedRepo[];
  modelCount: number;
  datasetCount: number;
  spaceCount: number;
  cacheDir: string;
}

export interface StoredArtifact {
  id: string;                    // `${provider}::${localPath}`
  provider: Provider;
  resourceType: ResourceType;
  logicalName: string;           // display name
  repoId?: string;               // HF repo id or source if known
  revision?: string;
  localPath: string;             // absolute path of the artifact root
  sizeBytes: number;
  rootPath: string;              // provider cache root (for context)
  isDeletable: boolean;
  deleteStrategy: DeleteStrategy;
  lastSeenAt: Date;
  hfCacheClass?: 'hub' | 'datasets' | 'assets'; // HF-only guard
  cachedRepo?: CachedRepo;       // populated for HF Hub entries (enables revision detail)
}

export interface ProviderStats {
  provider: Provider;
  label: string;                 // display name e.g. "Ollama"
  rootPath: string | null;
  isAvailable: boolean;
  artifacts: StoredArtifact[];
  totalSize: number;
}

export interface AppStats {
  totalSize: number;
  providers: ProviderStats[];
  artifacts: StoredArtifact[];   // flat list across all providers
}

export interface DeleteTarget {
  artifact: StoredArtifact;
  revision?: CachedRevision;     // only for HF Hub revision-level deletion
}
