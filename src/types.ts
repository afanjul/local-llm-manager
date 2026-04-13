export type RepoType = 'model' | 'dataset' | 'space';
export type SortBy = 'size' | 'name' | 'accessed' | 'modified';
export type FilterType = 'all' | 'model' | 'dataset' | 'space';
export type ViewMode = 'list' | 'detail' | 'download' | 'delete-confirm';

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

export interface DeleteTarget {
  repo: CachedRepo;
  revision?: CachedRevision;
}
