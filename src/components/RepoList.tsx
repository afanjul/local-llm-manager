import React from 'react';
import { Box, Text } from 'ink';
import { formatSize, getSizeBar, getSizeColor } from '../utils.js';
import type { CachedRepo } from '../types.js';

interface Props {
  repos: CachedRepo[];
  selectedIndex: number;
  scrollOffset: number;
  visibleCount: number;
  width: number;
}

const TYPE_BADGE: Record<string, string> = {
  model:   'MODEL',
  dataset: 'DATA ',
  space:   'SPACE',
};

const TYPE_COLOR: Record<string, string> = {
  model:   'cyan',
  dataset: 'green',
  space:   'yellow',
};

// Fixed column widths (chars)
const CURSOR_W = 2;  // "> "
const BADGE_W  = 9;  // "[MODEL] " = 8 + 1 gap
const REVS_W   = 7;  // " 2 revs"
const BAR_W    = 8;  // " ██████ "
const SIZE_W   = 9;  // " 4.23 GB"
const FIXED_W  = CURSOR_W + BADGE_W + REVS_W + BAR_W + SIZE_W; // 35

export default function RepoList({
  repos,
  selectedIndex,
  scrollOffset,
  visibleCount,
  width,
}: Props) {
  if (repos.length === 0) {
    return (
      <Box height={visibleCount} alignItems="center" justifyContent="center">
        <Text dimColor>No cached repositories found.</Text>
      </Box>
    );
  }

  const nameW = Math.max(10, width - FIXED_W);
  const maxSize = Math.max(...repos.map((r) => r.size));
  const visible = repos.slice(scrollOffset, scrollOffset + visibleCount);

  return (
    <Box flexDirection="column">
      {visible.map((repo, i) => {
        const absIndex = scrollOffset + i;
        const isSelected = absIndex === selectedIndex;
        const bar = getSizeBar(repo.size, maxSize, 6);
        const sizeColor = getSizeColor(repo.size);
        const revCount = repo.revisions.length;
        const revsLabel = `${revCount} ${revCount === 1 ? 'rev ' : 'revs'}`;
        const sizeLabel = formatSize(repo.size);

        return (
          <Box key={repo.path}>

            {/* Cursor — fixed 2 */}
            <Box width={CURSOR_W} flexShrink={0}>
              <Text bold color="cyan">{isSelected ? '> ' : '  '}</Text>
            </Box>

            {/* Badge — fixed 9 */}
            <Box width={BADGE_W} flexShrink={0}>
              <Text color={TYPE_COLOR[repo.repoType]} bold={isSelected} wrap="truncate">
                {`[${TYPE_BADGE[repo.repoType]}]`}
              </Text>
            </Box>

            {/* Name — flexible, fills remaining space */}
            <Box width={nameW} flexShrink={0} overflow="hidden">
              <Text bold={isSelected} wrap="truncate">
                {repo.repoId}
              </Text>
            </Box>

            {/* Revisions — fixed 7 */}
            <Box width={REVS_W} flexShrink={0} justifyContent="flex-end">
              <Text dimColor wrap="truncate">{revsLabel}</Text>
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
