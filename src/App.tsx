import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Text, useInput, useApp, useStdout } from 'ink';

import { scanAll, deleteArtifact } from './scanner.js';
import { downloadModel } from './cache.js';
import type {
  AppStats,
  StoredArtifact,
  FilterType,
  ProviderFilter,
  Provider,
  SortBy,
  ViewMode,
  DeleteTarget,
} from './types.js';

import Header from './components/Header.js';
import FilterBar from './components/FilterBar.js';
import RepoList from './components/RepoList.js';
import DetailView from './components/DetailView.js';
import DeleteConfirm from './components/DeleteConfirm.js';
import DownloadPanel from './components/DownloadPanel.js';
import StatusBar from './components/StatusBar.js';

type DownloadRepoType = 'model' | 'dataset' | 'space';
const DOWNLOAD_TYPES: DownloadRepoType[] = ['model', 'dataset', 'space'];

const PROVIDER_CYCLE: ProviderFilter[] = [
  'all',
  'huggingface-hub',
  'huggingface-datasets',
  'huggingface-assets',
  'ollama',
  'lmstudio',
  'llamacpp',
  'gpt4all',
  'jan',
  'omlx',
];

const TYPE_CYCLE: FilterType[] = ['all', 'model', 'dataset', 'space', 'asset'];

// Fixed UI chrome heights
const HEADER_H = 2;   // title + divider
const FILTER_H = 3;   // type row + provider row + divider
const STATUS_H = 2;   // divider + keybindings

export default function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();

  const termWidth = stdout?.columns ?? process.stdout.columns ?? 80;
  const termHeight = stdout?.rows ?? process.stdout.rows ?? 24;

  // ─── State ──────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<AppStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('list');

  // List state
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('size');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterProvider, setFilterProvider] = useState<ProviderFilter>('all');

  // Detail state
  const [selectedRevisionIndex, setSelectedRevisionIndex] = useState(0);
  const [fileScrollOffset, setFileScrollOffset] = useState(0);
  const [fileScrollMode, setFileScrollMode] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // Download state
  const [downloadQuery, setDownloadQuery] = useState('');
  const [downloadRepoType, setDownloadRepoType] = useState<DownloadRepoType>('model');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadOutput, setDownloadOutput] = useState('');

  // ─── Load cache ─────────────────────────────────────────────────────────────
  const refreshCache = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      const data = scanAll();
      setStats(data);
      setIsLoading(false);
    }, 10);
  }, []);

  useEffect(() => {
    refreshCache();
  }, []);

  // ─── Derived: filtered + sorted artifacts ────────────────────────────────────
  const filteredArtifacts = useMemo((): StoredArtifact[] => {
    if (!stats) return [];
    let items = [...stats.artifacts];

    if (filterProvider !== 'all') {
      items = items.filter((a) => a.provider === filterProvider);
    }

    if (filterType !== 'all') {
      items = items.filter((a) => a.resourceType === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((a) => a.logicalName.toLowerCase().includes(q));
    }

    switch (sortBy) {
      case 'size':     items.sort((a, b) => b.sizeBytes - a.sizeBytes); break;
      case 'name':     items.sort((a, b) => a.logicalName.localeCompare(b.logicalName)); break;
      case 'accessed': items.sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime()); break;
      case 'modified': items.sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime()); break;
    }

    return items;
  }, [stats, filterProvider, filterType, searchQuery, sortBy]);

  const selectedArtifact = filteredArtifacts[selectedIndex] ?? null;

  // ─── Scroll logic ────────────────────────────────────────────────────────────
  const listAreaH = termHeight - HEADER_H - FILTER_H - STATUS_H;
  const scrollOffset = Math.max(
    0,
    Math.min(selectedIndex - Math.floor(listAreaH / 2), filteredArtifacts.length - listAreaH),
  );

  const detailAreaH = termHeight - HEADER_H - STATUS_H;
  const revListH = selectedArtifact?.cachedRepo
    ? Math.min(selectedArtifact.cachedRepo.revisions.length, Math.floor(detailAreaH * 0.35))
    : 0;
  const fileAreaH = Math.max(4, detailAreaH - 6 - revListH);

  // Clamp selected index when list changes
  useEffect(() => {
    setSelectedIndex((i) => Math.max(0, Math.min(i, filteredArtifacts.length - 1)));
  }, [filteredArtifacts.length]);

  // Reset file scroll when revision changes
  useEffect(() => {
    setFileScrollOffset(0);
  }, [selectedRevisionIndex]);

  // ─── Keyboard ────────────────────────────────────────────────────────────────
  useInput((input, key) => {
    // ── Search mode ──────────────────────────────────────────────────────────
    if (isSearching) {
      if (key.escape) {
        setIsSearching(false);
        setSearchQuery('');
      } else if (key.return) {
        setIsSearching(false);
      } else if (key.backspace || key.delete) {
        setSearchQuery((q) => q.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setSearchQuery((q) => q + input);
      }
      return;
    }

    // ── Delete confirm ────────────────────────────────────────────────────────
    if (view === 'delete-confirm') {
      if ((input === 'y' || key.return) && deleteTarget) {
        deleteArtifact(deleteTarget.artifact, deleteTarget.revision);
        setDeleteTarget(null);
        setView('list');
        setSelectedIndex(0);
        refreshCache();
      } else if (input === 'n' || key.escape) {
        setDeleteTarget(null);
        setView(deleteTarget?.revision ? 'detail' : 'list');
      }
      return;
    }

    // ── Download panel ────────────────────────────────────────────────────────
    if (view === 'download') {
      if (isDownloading) return;

      if (key.escape) {
        setView('list');
        setDownloadQuery('');
        setDownloadOutput('');
      } else if (key.rightArrow) {
        setDownloadRepoType((t) => {
          const idx = DOWNLOAD_TYPES.indexOf(t);
          return DOWNLOAD_TYPES[(idx + 1) % DOWNLOAD_TYPES.length];
        });
      } else if (key.leftArrow) {
        setDownloadRepoType((t) => {
          const idx = DOWNLOAD_TYPES.indexOf(t);
          return DOWNLOAD_TYPES[(idx - 1 + DOWNLOAD_TYPES.length) % DOWNLOAD_TYPES.length];
        });
      } else if (key.return && downloadQuery.trim()) {
        setIsDownloading(true);
        setDownloadOutput('');
        downloadModel(downloadQuery.trim(), downloadRepoType, (chunk) => {
          setDownloadOutput((o) => o + chunk);
        }).then((result) => {
          setIsDownloading(false);
          if (result.success) {
            refreshCache();
          }
        });
      } else if (key.backspace || key.delete) {
        setDownloadQuery((q) => q.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setDownloadQuery((q) => q + input);
      }
      return;
    }

    // ── Detail view ───────────────────────────────────────────────────────────
    if (view === 'detail' && selectedArtifact) {
      const artifact = selectedArtifact;

      if (key.escape || input === 'q') {
        setView('list');
        setSelectedRevisionIndex(0);
        setFileScrollMode(false);
        setFileScrollOffset(0);
        return;
      }

      // File scroll mode only applies to HF Hub (cachedRepo present)
      if (artifact.cachedRepo) {
        if (input === 'f') {
          setFileScrollMode((m) => !m);
          return;
        }

        if (fileScrollMode) {
          if (key.upArrow || input === 'k') {
            setFileScrollOffset((o) => Math.max(0, o - 1));
          } else if (key.downArrow || input === 'j') {
            const rev = artifact.cachedRepo!.revisions[selectedRevisionIndex];
            const max = rev ? Math.max(0, rev.files.length - fileAreaH) : 0;
            setFileScrollOffset((o) => Math.min(max, o + 1));
          }
          return;
        }

        // Navigate revisions
        if (key.upArrow || input === 'k') {
          setSelectedRevisionIndex((i) => Math.max(0, i - 1));
        } else if (key.downArrow || input === 'j') {
          setSelectedRevisionIndex((i) => Math.min(artifact.cachedRepo!.revisions.length - 1, i + 1));
        } else if (input === 'd' && artifact.cachedRepo.revisions.length > 0) {
          const revision = artifact.cachedRepo.revisions[selectedRevisionIndex];
          if (revision) {
            setDeleteTarget({ artifact, revision });
            setView('delete-confirm');
          }
        } else if (input === 'D') {
          setDeleteTarget({ artifact });
          setView('delete-confirm');
        }
      } else {
        // Simple artifact: only whole-artifact delete
        if (input === 'd' || input === 'D') {
          setDeleteTarget({ artifact });
          setView('delete-confirm');
        }
      }
      return;
    }

    // ── List view ─────────────────────────────────────────────────────────────
    if (input === 'q') {
      exit();
    } else if (key.upArrow || input === 'k') {
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex((i) => Math.min(filteredArtifacts.length - 1, i + 1));
    } else if (key.pageUp) {
      setSelectedIndex((i) => Math.max(0, i - listAreaH));
    } else if (key.pageDown) {
      setSelectedIndex((i) => Math.min(filteredArtifacts.length - 1, i + listAreaH));
    } else if (key.return && selectedArtifact) {
      setView('detail');
      setSelectedRevisionIndex(0);
      setFileScrollOffset(0);
    } else if (input === '/') {
      setIsSearching(true);
    } else if (key.escape) {
      setSearchQuery('');
      setFilterType('all');
      setFilterProvider('all');
    } else if (input === 'd' && selectedArtifact) {
      setDeleteTarget({ artifact: selectedArtifact });
      setView('delete-confirm');
    } else if (input === 'n') {
      setView('download');
      setDownloadQuery('');
      setDownloadOutput('');
    } else if (input === 's') {
      const sorts: SortBy[] = ['size', 'name', 'accessed', 'modified'];
      setSortBy((s) => sorts[(sorts.indexOf(s) + 1) % sorts.length]);
    } else if (input === 'r') {
      setSelectedIndex(0);
      refreshCache();
    } else if (key.tab) {
      const forward = !key.shift;
      setFilterProvider((current) => {
        const idx = PROVIDER_CYCLE.indexOf(current);
        const next = forward
          ? (idx + 1) % PROVIDER_CYCLE.length
          : (idx - 1 + PROVIDER_CYCLE.length) % PROVIDER_CYCLE.length;
        return PROVIDER_CYCLE[next];
      });
      setSelectedIndex(0);
    } else if (key.leftArrow) {
      setFilterType((current) => {
        const idx = TYPE_CYCLE.indexOf(current);
        return TYPE_CYCLE[(idx - 1 + TYPE_CYCLE.length) % TYPE_CYCLE.length];
      });
      setSelectedIndex(0);
    } else if (key.rightArrow) {
      setFilterType((current) => {
        const idx = TYPE_CYCLE.indexOf(current);
        return TYPE_CYCLE[(idx + 1) % TYPE_CYCLE.length];
      });
      setSelectedIndex(0);
    }
  });

  // ─── Render ───────────────────────────────────────────────────────────────
  const w = termWidth;

  if (view === 'list' || view === 'delete-confirm') {
    return (
      <Box flexDirection="column" width={w}>
        <Header stats={stats} isLoading={isLoading} width={w} />
        <FilterBar
          filterType={filterType}
          filterProvider={filterProvider}
          sortBy={sortBy}
          searchQuery={searchQuery}
          isSearching={isSearching}
          width={w}
        />

        {view === 'delete-confirm' && deleteTarget ? (
          <Box height={listAreaH}>
            <DeleteConfirm target={deleteTarget} width={w} />
          </Box>
        ) : (
          <Box height={listAreaH}>
            <RepoList
              artifacts={filteredArtifacts}
              selectedIndex={selectedIndex}
              scrollOffset={scrollOffset}
              visibleCount={listAreaH}
              width={w}
            />
          </Box>
        )}

        <StatusBar
          view={view}
          isSearching={isSearching}
          isDownloading={false}
          width={w}
        />
      </Box>
    );
  }

  if (view === 'detail' && selectedArtifact) {
    return (
      <Box flexDirection="column" width={w}>
        <Header stats={stats} isLoading={isLoading} width={w} />
        <Box height={detailAreaH}>
          <DetailView
            artifact={selectedArtifact}
            selectedRevisionIndex={selectedRevisionIndex}
            fileScrollOffset={fileScrollOffset}
            visibleFileCount={fileAreaH}
            width={w}
            height={detailAreaH}
          />
        </Box>
        <StatusBar view="detail" isSearching={false} isDownloading={false} width={w} />
      </Box>
    );
  }

  if (view === 'download') {
    return (
      <Box flexDirection="column" width={w} height={termHeight}>
        <DownloadPanel
          query={downloadQuery}
          repoType={downloadRepoType}
          isDownloading={isDownloading}
          output={downloadOutput}
          width={w}
          height={termHeight}
        />
      </Box>
    );
  }

  // Fallback
  return (
    <Box>
      <Text dimColor>Loading…</Text>
    </Box>
  );
}
