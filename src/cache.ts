import { spawn } from 'node:child_process';

export interface DownloadResult {
  success: boolean;
  output: string;
}

export function downloadModel(
  repoId: string,
  repoType: string,
  onData: (chunk: string) => void,
): Promise<DownloadResult> {
  return new Promise((resolve) => {
    const args = ['download', repoId, '--repo-type', repoType];
    const proc = spawn('hf', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let output = '';

    const handleData = (data: Buffer | string) => {
      const chunk = data.toString();
      output += chunk;
      onData(chunk);
    };

    proc.stdout.on('data', handleData);
    proc.stderr.on('data', handleData);

    proc.on('close', (code: number | null) => {
      resolve({ success: code === 0, output: output.trim() });
    });

    proc.on('error', () => {
      const msg = 'hf command not found.\nInstall it with: pip install huggingface_hub';
      onData(msg);
      resolve({ success: false, output: msg });
    });
  });
}
