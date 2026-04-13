export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDate(date: Date): string {
  if (!date || date.getTime() === 0) return '—';
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function formatFullDate(date: Date): string {
  if (!date || date.getTime() === 0) return '—';
  return date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function getSizeBar(size: number, maxSize: number, width = 6): string {
  if (maxSize === 0) return '░'.repeat(width);
  const filled = Math.max(1, Math.round((size / maxSize) * width));
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

export function getSizeColor(size: number): string {
  if (size > 5 * 1024 * 1024 * 1024) return 'red';
  if (size > 500 * 1024 * 1024) return 'yellow';
  return 'green';
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '…';
}

export function padEnd(str: string, len: number): string {
  if (str.length >= len) return str;
  return str + ' '.repeat(len - str.length);
}
