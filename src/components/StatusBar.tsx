import React from 'react';
import { Box, Text } from 'ink';
import type { ViewMode } from '../types.js';

interface Props {
  view: ViewMode;
  isSearching: boolean;
  isDownloading: boolean;
  width: number;
}

interface Binding {
  key: string;
  desc: string;
}

const BINDINGS: Record<string, Binding[]> = {
  list: [
    { key: '↑↓/jk', desc: 'navigate' },
    { key: 'enter', desc: 'detail' },
    { key: 'd', desc: 'delete' },
    { key: 'n', desc: 'download' },
    { key: '/', desc: 'search' },
    { key: '←→', desc: 'type filter' },
    { key: 'tab/⇧tab', desc: 'provider' },
    { key: 's', desc: 'sort' },
    { key: 'r', desc: 'refresh' },
    { key: 'q', desc: 'quit' },
  ],
  searching: [
    { key: 'type', desc: 'filter' },
    { key: 'enter', desc: 'confirm' },
    { key: 'esc', desc: 'clear' },
  ],
  detail: [
    { key: '↑↓/jk', desc: 'revisions' },
    { key: '↑↓/jk + f', desc: 'files' },
    { key: 'd', desc: 'del revision' },
    { key: 'D', desc: 'del all' },
    { key: 'esc/q', desc: 'back' },
  ],
  'delete-confirm': [
    { key: 'y/enter', desc: 'confirm' },
    { key: 'n/esc', desc: 'cancel' },
  ],
  download: [
    { key: 'type', desc: 'enter model id' },
    { key: '←→', desc: 'switch type' },
    { key: 'enter', desc: 'download' },
    { key: 'esc', desc: 'cancel' },
  ],
};

export default function StatusBar({ view, isSearching, isDownloading, width }: Props) {
  const key = isSearching ? 'searching' : isDownloading ? 'download' : view;
  const bindings = BINDINGS[key] ?? BINDINGS.list;

  return (
    <Box flexDirection="column">
      <Text dimColor>{'─'.repeat(width)}</Text>
      <Box flexWrap="wrap" gap={0}>
        {bindings.map((b, i) => (
          <Text key={i} dimColor>
            {' '}
            <Text bold color="cyan">{b.key}</Text>
            {` ${b.desc}`}
            {i < bindings.length - 1 ? '  ·' : ''}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
