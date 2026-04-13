import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Text, useInput, useApp, useStdout } from 'ink';

import { scanCache, deleteRepo, deleteRevision, downloadModel } from './cache.js';
import type { CacheStats, CachedRepo, FilterType, SortBy, ViewMode, DeleteTarget } from './types.js';

import Header from './components/Header.js';
import FilterBar from './components/FilterBar.js';
import RepoList from './components/RepoList.js';
import DetailView from './components/DetailView.js';
import DeleteConfirm from './components/DeleteConfirm.js';
import DownloadPanel from './components/DownloadPanel.js';
import StatusBar from './components/StatusBar.js';

type DownloadRepoType = 'model' | 'dataset' | 'space';
const DOWNLOAD_TYPES: DownloadRepoType[] = ['model', 'dataset', 'space'];

// Fixed UI chrome heights
const HEADER_H = 2;   // title + divider
const FILTER_H = 2;   // filter row + divider
const STATUS_H = 2;   // divider + keybindings

export default function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();

  const termWidth = stdout?.columns ?? process.stdout.columns ?? 80;
  const termHeight = stdout?.rows ?? process.stdout.rows ?? 24;

  // ─── State ──────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('list');

  // List state
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('size');
  const [filterType, setFilterType] = useState<FilterType>('all');

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
    // Run in next tick so UI can render "scanning..." first
    setTimeout(() => {
      const data = scanCache();
      setStats(data);
      setIsLoading(false);
    }, 10);
  }, []);

  useEffect(() => {
    refreshCache();
  }, []);

  // ─── Derived: filtered + sorted repos ────────────────────────────────────────
  const filteredRepos = useMemo((): CachedRepo[] => {
    if (!stats) return [];
    let repos = [...stats.repos];

    if (filterType !== 'all') {
      repos = repos.filter((r) => r.repoType === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      repos = repos.filter((r) => r.repoId.toLowerCase().includes(q));
    }

    switch (sortBy) {
      case 'size':     repos.sort((a, b) => b.size - a.size); break;
      case 'name':     repos.sort((a, b) => a.repoId.localeCompare(b.repoId)); break;
      case 'accessed': repos.sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime()); break;
      case 'modified': repos.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime()); break;
    }

    return repos;
  }, [stats, filterType, searchQuery, sortBy]);

  const selectedRepo = filteredRepos[selectedIndex] ?? null;

  // ─── Scroll logic ────────────────────────────────────────────────────────────
  const listAreaH = termHeight - HEADER_H - FILTER_H - STATUS_H;
  const scrollOffset = Math.max(
    0,
    Math.min(selectedIndex - Math.floor(listAreaH / 2), filteredRepos.length - listAreaH),
  );

  const detailAreaH = termHeight - HEADER_H - STATUS_H;
  const revListH = Math.min(
    selectedRepo?.revisions.length ?? 0,
    Math.floor(detailAreaH * 0.35),
  );
  const fileAreaH = Math.max(4, detailAreaH - 6 - revListH);

  // Clamp selected index when list changes
  useEffect(() => {
    setSelectedIndex((i) => Math.max(0, Math.min(i, filteredRepos.length - 1)));
  }, [filteredRepos.length]);

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
        if (deleteTarget.revision) {
          deleteRevision(deleteTarget.repo.path, deleteTarget.revision.commitHash);
        } else {
          deleteRepo(deleteTarget.repo.path);
        }
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
      } else if (key.tab) {
        setDownloadRepoType((t) => {
          const idx = DOWNLOAD_TYPES.indexOf(t);
          return DOWNLOAD_TYPES[(idx + 1) % DOWNLOAD_TYPES.length];
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
    if (view === 'detail' && selectedRepo) {
      const repo = selectedRepo;

      if (key.escape || input === 'q') {
        setView('list');
        setSelectedRevisionIndex(0);
        setFileScrollMode(false);
        setFileScrollOffset(0);
        return;
      }

      if (input === 'f') {
        // Toggle file scroll mode
        setFileScrollMode((m) => !m);
        return;
      }

      if (fileScrollMode) {
        // Scroll files
        if (key.upArrow || input === 'k') {
          setFileScrollOffset((o) => Math.max(0, o - 1));
        } else if (key.downArrow || input === 'j') {
          const rev = repo.revisions[selectedRevisionIndex];
          const max = rev ? Math.max(0, rev.files.length - fileAreaH) : 0;
          setFileScrollOffset((o) => Math.min(max, o + 1));
        }
        return;
      }

      // Navigate revisions
      if (key.upArrow || input === 'k') {
        setSelectedRevisionIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow || input === 'j') {
        setSelectedRevisionIndex((i) => Math.min(repo.revisions.length - 1, i + 1));
      } else if (input === 'd' && repo.revisions.length > 0) {
        const revision = repo.revisions[selectedRevisionIndex];
        if (revision) {
          setDeleteTarget({ repo, revision });
          setView('delete-confirm');
        }
      } else if (input === 'D') {
        setDeleteTarget({ repo });
        setView('delete-confirm');
      }
      return;
    }

    // ── List view ─────────────────────────────────────────────────────────────
    if (input === 'q') {
      exit();
    } else if (key.upArrow || input === 'k') {
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex((i) => Math.min(filteredRepos.length - 1, i + 1));
    } else if (key.pageUp) {
      setSelectedIndex((i) => Math.max(0, i - listAreaH));
    } else if (key.pageDown) {
      setSelectedIndex((i) => Math.min(filteredRepos.length - 1, i + listAreaH));
    } else if (key.return && selectedRepo) {
      setView('detail');
      setSelectedRevisionIndex(0);
      setFileScrollOffset(0);
    } else if (input === '/') {
      setIsSearching(true);
    } else if (key.escape) {
      setSearchQuery('');
      setFilterType('all');
    } else if (input === 'd' && selectedRepo) {
      setDeleteTarget({ repo: selectedRepo });
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
    } else if (input === '1') {
      setFilterType('all');
      setSelectedIndex(0);
    } else if (input === '2') {
      setFilterType('model');
      setSelectedIndex(0);
    } else if (input === '3') {
      setFilterType('dataset');
      setSelectedIndex(0);
    } else if (input === '4') {
      setFilterType('space');
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
              repos={filteredRepos}
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

  if (view === 'detail' && selectedRepo) {
    return (
      <Box flexDirection="column" width={w}>
        <Header stats={stats} isLoading={isLoading} width={w} />
        <Box height={detailAreaH}>
          <DetailView
            repo={selectedRepo}
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
      <Box flexDirection="column" width={w}>
        <Header stats={stats} isLoading={isLoading} width={w} />
        <Box flexGrow={1}>
          <DownloadPanel
            query={downloadQuery}
            repoType={downloadRepoType}
            isDownloading={isDownloading}
            output={downloadOutput}
            width={w}
          />
        </Box>
        <StatusBar view="download" isSearching={false} isDownloading={isDownloading} width={w} />
      </Box>
    );
  }

  // Fallback (shouldn't happen)
  return (
    <Box>
      <Text dimColor>Loading…</Text>
    </Box>
  );
}
