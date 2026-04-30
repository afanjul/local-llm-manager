import React from 'react';
import { Box, Text } from 'ink';
import { formatSize, formatDate, formatFullDate, truncate } from '../utils.js';
import type { StoredArtifact, CachedRepo, ResourceType, Provider } from '../types.js';

interface Props {
  artifact: StoredArtifact;
  selectedRevisionIndex: number;
  fileScrollOffset: number;
  visibleFileCount: number;
  width: number;
  height: number;
}

const TYPE_COLOR: Record<ResourceType, string> = {
  model:               'cyan',
  dataset:             'green',
  space:               'yellow',
  asset:               'magenta',
  unknown:             'white',
  'incomplete-download': 'red',
};

const PROVIDER_LABEL: Record<Provider, string> = {
  'huggingface-hub':      'HF Hub',
  'huggingface-datasets': 'HF Datasets',
  'huggingface-assets':   'HF Assets',
  'ollama':               'Ollama',
  'lmstudio':             'LM Studio',
  'llamacpp':             'llama.cpp',
  'gpt4all':              'GPT4All',
  'jan':                  'Jan',
  'omlx':                 'OMLX',
};

function HfHubDetail({
  repo,
  artifact,
  selectedRevisionIndex,
  fileScrollOffset,
  visibleFileCount,
  width,
  height,
}: {
  repo: CachedRepo;
  artifact: StoredArtifact;
  selectedRevisionIndex: number;
  fileScrollOffset: number;
  visibleFileCount: number;
  width: number;
  height: number;
}) {
  const selectedRev = repo.revisions[selectedRevisionIndex];
  const revListHeight = Math.min(repo.revisions.length, Math.floor(height * 0.35));
  const visibleFiles = selectedRev
    ? selectedRev.files.slice(fileScrollOffset, fileScrollOffset + visibleFileCount)
    : [];

  return (
    <Box flexDirection="column">
      {/* Repo header */}
      <Box>
        <Text dimColor>{'← '}</Text>
        <Text bold color={TYPE_COLOR[artifact.resourceType]}>
          {artifact.resourceType.toUpperCase()}
        </Text>
        <Text bold>{`  ${repo.repoId}`}</Text>
      </Box>
      <Box>
        <Text dimColor>
          {`  ${repo.revisions.length} revision${repo.revisions.length !== 1 ? 's' : ''}  ·  ${formatSize(repo.size)}  ·  ${repo.nbFiles} files  ·  modified ${formatDate(repo.lastModified)}`}
        </Text>
      </Box>
      <Box>
        <Text dimColor>{`  ${artifact.localPath}`}</Text>
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

function IncompleteDetail({
  artifact,
  width,
}: {
  artifact: StoredArtifact;
  width: number;
}) {
  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>{'← '}</Text>
        <Text bold color="red">INCOMPLETE DOWNLOAD</Text>
        <Text bold>{`  ${artifact.logicalName}`}</Text>
      </Box>
      <Box>
        <Text dimColor>  HF Hub  ·  0 B  ·  download was interrupted before any files were saved</Text>
      </Box>
      <Box>
        <Text dimColor>{`  ${artifact.localPath}`}</Text>
      </Box>
      <Text dimColor>{'─'.repeat(width)}</Text>
      <Box flexDirection="column" paddingTop={1}>
        <Box>
          <Text color="red">  This entry cannot be used.</Text>
        </Box>
        <Box>
          <Text dimColor>  The download started but no model files were ever written to disk.</Text>
        </Box>
        <Box>
          <Text dimColor>  Press </Text>
          <Text bold color="red">[d]</Text>
          <Text dimColor> to delete the leftover metadata, or re-download the model to restore it.</Text>
        </Box>
      </Box>
    </Box>
  );
}

function SimpleDetail({
  artifact,
  width,
}: {
  artifact: StoredArtifact;
  width: number;
}) {
  const providerLabel = PROVIDER_LABEL[artifact.provider];

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box>
        <Text dimColor>{'← '}</Text>
        <Text bold color={TYPE_COLOR[artifact.resourceType]}>
          {artifact.resourceType.toUpperCase()}
        </Text>
        <Text bold>{`  ${artifact.logicalName}`}</Text>
      </Box>
      <Box>
        <Text dimColor>
          {`  ${providerLabel}  ·  ${formatSize(artifact.sizeBytes)}  ·  last seen ${formatDate(artifact.lastSeenAt)}`}
        </Text>
      </Box>
      <Text dimColor>{'─'.repeat(width)}</Text>

      {/* Details */}
      <Box flexDirection="column" paddingTop={1}>
        <Box>
          <Text dimColor>  Path      </Text>
          <Text wrap="truncate">{artifact.localPath}</Text>
        </Box>
        <Box>
          <Text dimColor>  Size      </Text>
          <Text>{formatSize(artifact.sizeBytes)}</Text>
        </Box>
        <Box>
          <Text dimColor>  Provider  </Text>
          <Text>{providerLabel}</Text>
        </Box>
        <Box>
          <Text dimColor>  Type      </Text>
          <Text>{artifact.resourceType}</Text>
        </Box>
        <Box>
          <Text dimColor>  Strategy  </Text>
          <Text dimColor>{artifact.deleteStrategy}</Text>
        </Box>
        {artifact.repoId && (
          <Box>
            <Text dimColor>  Source    </Text>
            <Text dimColor>{artifact.repoId}</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default function DetailView({
  artifact,
  selectedRevisionIndex,
  fileScrollOffset,
  visibleFileCount,
  width,
  height,
}: Props) {
  if (artifact.resourceType === 'incomplete-download') {
    return <IncompleteDetail artifact={artifact} width={width} />;
  }

  if (artifact.cachedRepo) {
    return (
      <HfHubDetail
        repo={artifact.cachedRepo}
        artifact={artifact}
        selectedRevisionIndex={selectedRevisionIndex}
        fileScrollOffset={fileScrollOffset}
        visibleFileCount={visibleFileCount}
        width={width}
        height={height}
      />
    );
  }

  return <SimpleDetail artifact={artifact} width={width} />;
}
