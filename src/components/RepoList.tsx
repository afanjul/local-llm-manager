import React from 'react';
import { Box, Text } from 'ink';
import { formatSize, getSizeBar, getSizeColor } from '../utils.js';
import type { StoredArtifact, Provider, ResourceType } from '../types.js';

interface Props {
  artifacts: StoredArtifact[];
  selectedIndex: number;
  scrollOffset: number;
  visibleCount: number;
  width: number;
}

const RESOURCE_BADGE: Record<ResourceType, string> = {
  model:               'MODEL',
  dataset:             'DATA ',
  space:               'SPACE',
  asset:               'ASSET',
  unknown:             'UNKNW',
  'incomplete-download': 'GHOST',
};

const RESOURCE_COLOR: Record<ResourceType, string> = {
  model:               'cyan',
  dataset:             'green',
  space:               'yellow',
  asset:               'magenta',
  unknown:             'white',
  'incomplete-download': 'red',
};

const PROVIDER_BADGE: Record<Provider, string> = {
  'huggingface-hub':      'HF   ',
  'huggingface-datasets': 'HFD  ',
  'huggingface-assets':   'HFA  ',
  'ollama':               'OLL  ',
  'lmstudio':             'LMS  ',
  'llamacpp':             'LLC  ',
  'gpt4all':              'G4A  ',
  'jan':                  'JAN  ',
  'omlx':                 'OMLX ',
};

const PROVIDER_COLOR: Record<Provider, string> = {
  'huggingface-hub':      'cyan',
  'huggingface-datasets': 'cyan',
  'huggingface-assets':   'cyan',
  'ollama':               'green',
  'lmstudio':             'blue',
  'llamacpp':             'yellow',
  'gpt4all':              'magenta',
  'jan':                  'white',
  'omlx':                 'green',
};

// Fixed column widths (chars)
const CURSOR_W = 2;   // "> "
const BADGE_W  = 9;   // "[MODEL] " = 8 + 1 gap
const PROV_W   = 7;   // "[HF  ] " = 6 + 1 gap
const BAR_W    = 8;   // " ██████ "
const SIZE_W   = 9;   // " 4.23 GB"
const FIXED_W  = CURSOR_W + BADGE_W + PROV_W + BAR_W + SIZE_W; // 35

export default function RepoList({
  artifacts,
  selectedIndex,
  scrollOffset,
  visibleCount,
  width,
}: Props) {
  if (artifacts.length === 0) {
    return (
      <Box height={visibleCount} alignItems="center" justifyContent="center">
        <Text dimColor>No cached artifacts found.</Text>
      </Box>
    );
  }

  const nameW = Math.max(10, width - FIXED_W);
  const maxSize = Math.max(...artifacts.map((a) => a.sizeBytes));
  const visible = artifacts.slice(scrollOffset, scrollOffset + visibleCount);

  return (
    <Box flexDirection="column">
      {visible.map((artifact, i) => {
        const absIndex = scrollOffset + i;
        const isSelected = absIndex === selectedIndex;
        const bar = getSizeBar(artifact.sizeBytes, maxSize, 6);
        const sizeColor = getSizeColor(artifact.sizeBytes);
        const sizeLabel = formatSize(artifact.sizeBytes);

        return (
          <Box key={artifact.id}>

            {/* Cursor — fixed 2 */}
            <Box width={CURSOR_W} flexShrink={0}>
              <Text bold color="cyan">{isSelected ? '> ' : '  '}</Text>
            </Box>

            {/* Resource type badge — fixed 9 */}
            <Box width={BADGE_W} flexShrink={0}>
              <Text color={RESOURCE_COLOR[artifact.resourceType]} bold={isSelected} wrap="truncate">
                {`[${RESOURCE_BADGE[artifact.resourceType]}]`}
              </Text>
            </Box>

            {/* Provider badge — fixed 7 */}
            <Box width={PROV_W} flexShrink={0}>
              <Text color={PROVIDER_COLOR[artifact.provider]} dimColor={!isSelected} wrap="truncate">
                {`[${PROVIDER_BADGE[artifact.provider].trim()}]`}
              </Text>
            </Box>

            {/* Name — flexible */}
            <Box width={nameW} flexShrink={0} overflow="hidden">
              <Text bold={isSelected} wrap="truncate">
                {artifact.logicalName}
              </Text>
            </Box>

            {/* Bar — fixed 8 */}
            <Box width={BAR_W} flexShrink={0} justifyContent="center">
              <Text color={sizeColor}>{` ${bar} `}</Text>
            </Box>

            {/* Size — fixed 9 */}
            <Box width={SIZE_W} flexShrink={0} justifyContent="flex-end">
              <Text color={sizeColor} bold={isSelected} wrap="truncate">
                {sizeLabel}
              </Text>
            </Box>

          </Box>
        );
      })}
    </Box>
  );
}
