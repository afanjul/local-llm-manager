import React from 'react';
import { Box, Text } from 'ink';
import { formatSize, formatDate, formatFullDate, truncate } from '../utils.js';
import type { CachedRepo } from '../types.js';

interface Props {
  repo: CachedRepo;
  selectedRevisionIndex: number;
  fileScrollOffset: number;
  visibleFileCount: number;
  width: number;
  height: number;
}

const TYPE_COLOR: Record<string, string> = {
  model: 'cyan',
  dataset: 'green',
  space: 'yellow',
};

export default function DetailView({
  repo,
  selectedRevisionIndex,
  fileScrollOffset,
  visibleFileCount,
  width,
  height,
}: Props) {
  const selectedRev = repo.revisions[selectedRevisionIndex];

  // Layout: 2 lines header + 1 divider + revisions list + 1 divider + files header + file list
  const revListHeight = Math.min(repo.revisions.length, Math.floor(height * 0.35));
  const filesAvailable = height - 3 - revListHeight - 3; // rough estimate
  const visibleFiles = selectedRev
    ? selectedRev.files.slice(fileScrollOffset, fileScrollOffset + visibleFileCount)
    : [];

  return (
    <Box flexDirection="column">
      {/* Repo header */}
      <Box>
        <Text dimColor>{'← '}</Text>
        <Text bold color={TYPE_COLOR[repo.repoType]}>
          {repo.repoType.toUpperCase()}
        </Text>
        <Text bold>{`  ${repo.repoId}`}</Text>
      </Box>
      <Box>
        <Text dimColor>
          {`  ${repo.revisions.length} revision${repo.revisions.length !== 1 ? 's' : ''}  ·  ${formatSize(repo.size)}  ·  ${repo.nbFiles} files  ·  modified ${formatDate(repo.lastModified)}`}
        </Text>
      </Box>
      <Text dimColor>{'─'.repeat(width)}</Text>

      {/* Revisions */}
      <Box>
        <Text bold dimColor> Revisions</Text>
      </Box>
      {repo.revisions.slice(0, revListHeight).map((rev, i) => {
        const isSelected = i === selectedRevisionIndex;
        const refsLabel = rev.refs.length > 0 ? `  [${rev.refs.join(', ')}]` : '';
        return (
          <Box key={rev.commitHash}>
            <Text bold color="cyan">{isSelected ? '  > ' : '    '}</Text>
            <Text bold={isSelected} color={isSelected ? 'white' : undefined}>
              {rev.shortHash}
            </Text>
            <Text color="yellow">{refsLabel}</Text>
            <Text dimColor>{`  ${rev.files.length} files`}</Text>
            <Text>{`  ${formatSize(rev.size).padStart(9)}`}</Text>
            <Text dimColor>{`  ${formatFullDate(rev.lastModified)}`}</Text>
          </Box>
        );
      })}

      <Text dimColor>{'─'.repeat(width)}</Text>

      {/* Files */}
      {selectedRev ? (
        <>
          <Box>
            <Text bold dimColor>
              {` Files in ${selectedRev.shortHash}`}
              {selectedRev.refs.length > 0 ? ` (${selectedRev.refs[0]})` : ''}
              {` — ${selectedRev.files.length} files, ${formatSize(selectedRev.size)}`}
            </Text>
          </Box>
          {visibleFiles.map((file) => {
            const nameW = Math.max(10, width - 14);
            return (
              <Box key={file.name}>
                <Text dimColor>{'    '}</Text>
                <Box width={nameW} overflow="hidden">
                  <Text wrap="truncate" dimColor={file.size === 0}>
                    {truncate(file.name, nameW)}
                  </Text>
                </Box>
                <Text color={file.size > 100 * 1024 * 1024 ? 'yellow' : undefined}>
                  {formatSize(file.size).padStart(10)}
                </Text>
              </Box>
            );
          })}
          {selectedRev.files.length > visibleFileCount && (
            <Text dimColor>{`    … ${selectedRev.files.length - visibleFileCount - fileScrollOffset} more files`}</Text>
          )}
        </>
      ) : (
        <Text dimColor>  No revisions cached.</Text>
      )}
    </Box>
  );
}
