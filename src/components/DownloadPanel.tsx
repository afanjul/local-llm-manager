import React from 'react';
import { Box, Text } from 'ink';

type DownloadRepoType = 'model' | 'dataset' | 'space';

interface Props {
  query: string;
  repoType: DownloadRepoType;
  isDownloading: boolean;
  output: string;
  width: number;
}

const REPO_TYPES: DownloadRepoType[] = ['model', 'dataset', 'space'];
const TYPE_COLOR: Record<DownloadRepoType, string> = {
  model: 'cyan',
  dataset: 'green',
  space: 'yellow',
};

export default function DownloadPanel({ query, repoType, isDownloading, output, width }: Props) {
  const cmdPreview = query
    ? `hf download ${query} --repo-type ${repoType}`
    : 'hf download <model-id> --repo-type model';

  // Show last N lines of output that fit
  const outputLines = output.split('\n').filter(Boolean);
  const maxOutputLines = 10;
  const shownLines = outputLines.slice(-maxOutputLines);

  return (
    <Box flexDirection="column" paddingTop={1}>
      <Text bold color="cyan"> Download from HuggingFace Hub</Text>
      <Text dimColor>{'─'.repeat(width)}</Text>

      {/* Input */}
      <Box paddingTop={1} flexDirection="column" gap={1}>
        <Box>
          <Text bold> Repo ID: </Text>
          <Text color="white">{query || ' '}</Text>
          {!isDownloading && <Text color="cyan">_</Text>}
        </Box>

        {/* Type selector */}
        <Box gap={1}>
          <Text bold> Type:   </Text>
          {REPO_TYPES.map((t) => (
            <Text
              key={t}
              color={repoType === t ? TYPE_COLOR[t] : undefined}
              bold={repoType === t}
              dimColor={repoType !== t}
            >
              {repoType === t ? `[${t}]` : ` ${t} `}
              {' '}
            </Text>
          ))}
          <Text dimColor>(tab to switch)</Text>
        </Box>
      </Box>

      {/* Command preview */}
      <Box paddingTop={1} flexDirection="column">
        <Text dimColor>{'─'.repeat(width)}</Text>
        <Text dimColor> Command:</Text>
        <Text color="yellow">{`  ${cmdPreview}`}</Text>
      </Box>

      {/* Output */}
      {(isDownloading || output) && (
        <Box paddingTop={1} flexDirection="column">
          <Text dimColor>{'─'.repeat(width)}</Text>
          <Text dimColor>
            {' Output:'}
            {isDownloading && <Text color="cyan"> (downloading…)</Text>}
          </Text>
          {shownLines.map((line, i) => (
            <Text key={i} dimColor={!line.includes('Error') && !line.includes('error')}>
              {`  ${line}`}
            </Text>
          ))}
        </Box>
      )}

      {!isDownloading && !output && (
        <Box paddingTop={1}>
          <Text dimColor>
            {' '}
            <Text color="cyan">Tip:</Text> Make sure{' '}
            <Text color="yellow">hf</Text> is installed:{' '}
            <Text dimColor>pip install huggingface_hub</Text>
          </Text>
        </Box>
      )}
    </Box>
  );
}
