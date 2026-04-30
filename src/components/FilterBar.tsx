import React from 'react';
import { Box, Text } from 'ink';
import type { FilterType, SortBy, ProviderFilter, Provider } from '../types.js';

interface Props {
  filterType: FilterType;
  filterProvider: ProviderFilter;
  sortBy: SortBy;
  searchQuery: string;
  isSearching: boolean;
  width: number;
}

const TYPE_FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'model', label: 'Models' },
  { key: 'dataset', label: 'Datasets' },
  { key: 'space', label: 'Spaces' },
  { key: 'asset', label: 'Assets' },
];

const PROVIDER_FILTERS: { key: ProviderFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'huggingface-hub', label: 'HF Hub' },
  { key: 'huggingface-datasets', label: 'HF Data' },
  { key: 'huggingface-assets', label: 'HF Assets' },
  { key: 'ollama', label: 'Ollama' },
  { key: 'lmstudio', label: 'LMStudio' },
  { key: 'llamacpp', label: 'llama.cpp' },
  { key: 'gpt4all', label: 'GPT4All' },
  { key: 'jan', label: 'Jan' },
  { key: 'omlx', label: 'OMLX' },
];

const SORT_LABELS: Record<SortBy, string> = {
  size: 'Size',
  name: 'Name',
  accessed: 'Accessed',
  modified: 'Modified',
};

export default function FilterBar({
  filterType,
  filterProvider,
  sortBy,
  searchQuery,
  isSearching,
  width,
}: Props) {
  const searchDisplay = isSearching
    ? `/${searchQuery}_`
    : searchQuery
    ? `/${searchQuery}`
    : '/ search…';

  const sortLabel = `[s] Sort: ${SORT_LABELS[sortBy]}`;

  return (
    <Box flexDirection="column">
      {/* Row 1: search + type filter + sort */}
      <Box gap={1}>
        <Text color={isSearching ? 'cyan' : 'white'} dimColor={!isSearching && !searchQuery}>
          {searchDisplay}
        </Text>
        <Text dimColor>{'  [←→] '}</Text>
        {TYPE_FILTERS.map((f) => (
          <Box key={f.key}>
            <Text
              color={f.key === filterType ? 'cyan' : 'white'}
              bold={f.key === filterType}
              dimColor={f.key !== filterType}
            >
              [{f.label}]
            </Text>
            <Text> </Text>
          </Box>
        ))}
        <Text dimColor>{sortLabel}</Text>
      </Box>
      {/* Row 2: provider filter */}
      <Box gap={1}>
        <Text dimColor>{'[tab] '}</Text>
        {PROVIDER_FILTERS.map((f) => (
          <Box key={f.key}>
            <Text
              color={f.key === filterProvider ? 'yellow' : 'white'}
              bold={f.key === filterProvider}
              dimColor={f.key !== filterProvider}
            >
              [{f.label}]
            </Text>
            <Text> </Text>
          </Box>
        ))}
      </Box>
      <Text dimColor>{'─'.repeat(width)}</Text>
    </Box>
  );
}
