import React from 'react';
import { Box, Text } from 'ink';
import type { FilterType, SortBy } from '../types.js';

interface Props {
  filterType: FilterType;
  sortBy: SortBy;
  searchQuery: string;
  isSearching: boolean;
  width: number;
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'model', label: 'Models' },
  { key: 'dataset', label: 'Datasets' },
  { key: 'space', label: 'Spaces' },
];

const SORT_LABELS: Record<SortBy, string> = {
  size: 'Size',
  name: 'Name',
  accessed: 'Accessed',
  modified: 'Modified',
};

export default function FilterBar({ filterType, sortBy, searchQuery, isSearching, width }: Props) {
  const searchDisplay = isSearching
    ? `/${searchQuery}_`
    : searchQuery
    ? `/${searchQuery}`
    : '/ search…';

  const sortLabel = `[s] Sort: ${SORT_LABELS[sortBy]}`;

  const filterTabs = FILTERS.map((f) => {
    const isActive = f.key === filterType;
    return { ...f, isActive };
  });

  return (
    <Box flexDirection="column">
      <Box gap={1}>
        <Text color={isSearching ? 'cyan' : 'white'} dimColor={!isSearching && !searchQuery}>
          {searchDisplay}
        </Text>
        <Text dimColor>{'  '}</Text>
        {filterTabs.map((f) => (
          <Box key={f.key}>
            <Text
              color={f.isActive ? 'cyan' : 'white'}
              bold={f.isActive}
              dimColor={!f.isActive}
            >
              [{f.label}]
            </Text>
            <Text> </Text>
          </Box>
        ))}
        <Text dimColor>{sortLabel}</Text>
      </Box>
      <Text dimColor>{'─'.repeat(width)}</Text>
    </Box>
  );
}
