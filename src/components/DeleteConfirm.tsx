import React from 'react';
import { Box, Text } from 'ink';
import { formatSize } from '../utils.js';
import type { DeleteTarget } from '../types.js';

interface Props {
  target: DeleteTarget;
  width: number;
}

export default function DeleteConfirm({ target, width }: Props) {
  const { repo, revision } = target;

  const isRevision = !!revision;
  const label = isRevision
    ? `revision ${revision!.shortHash}${revision!.refs.length > 0 ? ` (${revision!.refs[0]})` : ''} of ${repo.repoId}`
    : repo.repoId;

  const size = isRevision ? revision!.size : repo.size;
  const warning = !isRevision && repo.revisions.length > 1
    ? `  This will delete all ${repo.revisions.length} revisions.`
    : '';

  const lineW = Math.min(width - 4, 60);
  const pad = Math.floor((width - lineW) / 2);
  const indent = ' '.repeat(pad);

  return (
    <Box flexDirection="column" paddingTop={2}>
      <Text>{indent}{'─'.repeat(lineW)}</Text>
      <Box paddingTop={1} paddingBottom={1} flexDirection="column">
        <Text>{indent}<Text bold color="red"> DELETE</Text></Text>
        <Text>{indent}  {label}</Text>
        <Text>{indent}  <Text color="yellow">Will free ~{formatSize(size)}</Text></Text>
        {warning ? <Text>{indent}<Text color="red">{warning}</Text></Text> : null}
      </Box>
      <Text>{indent}{'─'.repeat(lineW)}</Text>
      <Box paddingTop={1} justifyContent="center">
        <Text>
          {'  '}
          <Text bold color="red">[Y] Confirm</Text>
          {'    '}
          <Text bold color="green">[N] Cancel</Text>
        </Text>
      </Box>
    </Box>
  );
}
