# AGENTS.md — Local LLM Manager

## Quick start

```bash
bun install
bun start          # run TUI
bun dev            # watch mode
bun run build      # macOS ARM64 binary → ./local-llm-manager
```

## Commands

- `bun start` — run the TUI
- `bun dev` — watch mode (auto-reload on file changes)
- `bun run build` — compile to standalone binary (macOS ARM64 only)

## Architecture

- **Runtime**: Bun (ESM), TypeScript with `noEmit`, `moduleResolution: bundler`
- **Entry**: `src/index.tsx` → `src/App.tsx` (main component with all state + keyboard handlers)
- **Scanning**: `src/providers/hf-hub.ts` — `scanAll()` calls all provider scanners in parallel, flattens results
- **Providers** (`src/providers/`): `hf-hub.ts`, `hf-datasets.ts`, `hf-assets.ts`, `ollama.ts`, `lmstudio.ts`, `llamacpp.ts`, `gpt4all.ts`, `jan.ts`, `omlx.ts`
- **Types**: `src/types.ts` — all shared types (`StoredArtifact`, `Provider`, `CachedRepo`, etc.)
- **Components** (`src/components/`): `Header.tsx`, `FilterBar.tsx`, `RepoList.tsx`, `DetailView.tsx`, `DeleteConfirm.tsx`, `DownloadPanel.tsx`, `StatusBar.tsx`
- **Download**: `src/providers/hf-hub.ts` — spawns `hf` CLI subprocess (requires `pip install huggingface_hub`)

## Gotchas

- **Import paths must use `.js` extension** even for `.tsx`/`.ts` files (Bun ESM + `moduleResolution: bundler` requirement)
- **Build is macOS ARM64 only**: `--target=bun-darwin-arm64` — not cross-platform
- **Build requires `ldid`** for ad-hoc codesigning: `brew install ldid`
- **`hf` CLI is required** for the download feature — not bundled
- **No tests, no lint, no typecheck scripts** — just `bun run`
- **`local-llm-manager` binary** is gitignored (built output)
- **Cache location**: `~/.cache/huggingface/hub` by default, overridable via `HF_HUB_CACHE` or `HF_HOME`
- **Delete cleanup**: HF Hub revision deletes also clean orphaned blobs; other providers just `rm -rf` the artifact root
