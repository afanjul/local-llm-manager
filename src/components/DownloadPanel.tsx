import React from 'react';
import { Box, Text } from 'ink';

type DownloadRepoType = 'model' | 'dataset' | 'space';

interface Props {
  query: string;
  repoType: DownloadRepoType;
  isDownloading: boolean;
  output: string;
  width: number;
  height: number;
}

const REPO_TYPES: DownloadRepoType[] = ['model', 'dataset', 'space'];
const TYPE_COLOR: Record<DownloadRepoType, string> = {
  model: 'cyan',
  dataset: 'green',
  space: 'yellow',
};

export default function DownloadPanel({ query, repoType, isDownloading, output, width, height }: Props) {
  const cmdPreview = query
    ? `hf download ${query} --repo-type ${repoType}`
    : 'hf download <model-id> --repo-type model';

  const outputLines = output.split('\n').filter(Boolean);
  // Reserve lines for chrome: title(1) + subtitle(1) + blank(1) + repo(1) + type(1) + blank(1) + divider(1) + cmd label(1) + cmd(1) + blank(1) + output header(1) + status bar(3)
  const reservedLines = 15;
  const maxOutputLines = Math.max(3, height - reservedLines);
  const shownLines = outputLines.slice(-maxOutputLines);

  // Inner width accounts for border (1 char each side) + padding (1 each side)
  const innerW = width - 6;

  return (
    <Box flexDirection="column" width={width} height={height} alignItems="center" justifyContent="center">
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="cyan"
        width={width - 4}
        paddingX={1}
        paddingY={1}
      >
        {/* Header */}
        <Box marginBottom={1}>
          <Text bold color="cyan"> Download from HuggingFace Hub</Text>
        </Box>

        {/* Input */}
        <Box flexDirection="column" gap={1}>
          <Box>
            <Text bold> Repo ID  </Text>
            <Text color="white">{query || ' '}</Text>
            {!isDownloading && <Text color="cyan">_</Text>}
          </Box>

          {/* Type selector */}
          <Box>
            <Text bold> Type     </Text>
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
            <Text dimColor> (←→)</Text>
          </Box>
        </Box>

        {/* Command preview */}
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>{'─'.repeat(innerW)}</Text>
          <Text dimColor> Command</Text>
          <Text color="yellow">{`  ${cmdPreview}`}</Text>
        </Box>

        {/* Output */}
        {(isDownloading || output) ? (
          <Box flexDirection="column" marginTop={1}>
            <Text dimColor>{'─'.repeat(innerW)}</Text>
            <Text dimColor>
              {' Output'}
              {isDownloading && <Text color="cyan"> (downloading…)</Text>}
            </Text>
            {shownLines.map((line, i) => (
              <Text key={i} dimColor={!line.includes('Error') && !line.includes('error')}>
                {`  ${line}`}
              </Text>
            ))}
          </Box>
        ) : (
          <Box marginTop={1}>
            <Text dimColor>
              {' '}
              <Text color="cyan">Tip:</Text> Make sure{' '}
              <Text color="yellow">hf</Text> is installed:{' '}
              <Text dimColor>pip install huggingface_hub</Text>
            </Text>
          </Box>
        )}

        {/* Footer keybindings */}
        <Box marginTop={1}>
          <Text dimColor>{'─'.repeat(innerW)}</Text>
        </Box>
        <Box gap={0}>
          <Text dimColor> </Text>
          <Text bold color="cyan">enter</Text>
          <Text dimColor> download  · </Text>
          <Text bold color="cyan">←→</Text>
          <Text dimColor> type  · </Text>
          <Text bold color="cyan">esc</Text>
          <Text dimColor> cancel</Text>
        </Box>
      </Box>
    </Box>
  );
}
