import React from 'react';
import { Box, Text } from 'ink';
import { formatSize } from '../utils.js';
import type { CacheStats } from '../types.js';

interface Props {
  stats: CacheStats | null;
  isLoading: boolean;
  width: number;
}

export default function Header({ stats, isLoading, width }: Props) {
  const title = ' HuggingFace Cache Manager';
  const right = isLoading
    ? ' scanning...'
    : stats
    ? ` ${formatSize(stats.totalSize)} · ${stats.repos.length} repos`
    : ' no cache found';

  const gap = Math.max(0, width - title.length - right.length);

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold color="cyan">
          {title}
        </Text>
        <Text dimColor>{' '.repeat(gap)}</Text>
        <Text dimColor>{right}</Text>
      </Box>
      <Text dimColor>{'─'.repeat(width)}</Text>
    </Box>
  );
}
