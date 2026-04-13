# HuggingFace TUI

A terminal UI for managing your local HuggingFace model cache — browse, inspect, delete, and download models/datasets/spaces without leaving the terminal.

![HuggingFace TUI screenshot](https://raw.githubusercontent.com/aleksdj/huggingface-tui/master/screenshot.png)

## Features

- **Browse** all cached models, datasets, and spaces with size visualization
- **Inspect** revisions, branches/tags, and individual files per model
- **Delete** entire repos or specific revisions (orphaned blobs cleaned up automatically)
- **Download** new models using `hf download` directly from the TUI
- **Search** and filter by name, type (model/dataset/space), sort by size, name, or date
- **Scrollable** list with adaptive layout to any terminal width

## Requirements

- [Bun](https://bun.sh) — runtime and bundler
- [HuggingFace Hub CLI](https://huggingface.co/docs/huggingface_hub/guides/cli) for downloading models: `pip install huggingface_hub`

## Install & Run

```bash
git clone https://github.com/aleksdj/huggingface-tui
cd huggingface-tui
bun install
bun start
```

## Build standalone binary

Requires [ldid](https://formulae.brew.sh/formula/ldid) for ad-hoc signing of the ARM64 binary:

```bash
brew install ldid
```

```bash
# Apple Silicon (ARM64)
bun run build:arm64    # → ./hf-tui-arm64

# Intel (x86_64)
bun run build:x64      # → ./hf-tui-x64

# Both
bun run build
```

The binaries are self-contained — no Bun or Node.js required to run them.

## Cache location

By default reads `~/.cache/huggingface/hub`. Respects environment variables:

| Variable | Description |
|----------|-------------|
| `HF_HUB_CACHE` | Override cache directory directly |
| `HF_HOME` | Override HuggingFace home (cache will be `$HF_HOME/hub`) |

## Keyboard shortcuts

### List view

| Key | Action |
|-----|--------|
| `↑` / `↓` or `j` / `k` | Navigate |
| `Enter` | Open detail view |
| `d` | Delete selected repo |
| `n` | Open download panel |
| `/` | Search by name |
| `1` `2` `3` `4` | Filter: All / Models / Datasets / Spaces |
| `s` | Cycle sort: Size → Name → Last accessed → Last modified |
| `r` | Refresh cache |
| `q` | Quit |

### Detail view

| Key | Action |
|-----|--------|
| `↑` / `↓` or `j` / `k` | Navigate revisions |
| `f` | Toggle file scroll mode |
| `d` | Delete selected revision |
| `D` | Delete entire repo |
| `Esc` / `q` | Back to list |

### Download panel

| Key | Action |
|-----|--------|
| Type | Enter repo ID (e.g. `meta-llama/Llama-3.2-1B`) |
| `Tab` | Switch type: model → dataset → space |
| `Enter` | Start download |
| `Esc` | Cancel |

### Delete confirmation

| Key | Action |
|-----|--------|
| `y` / `Enter` | Confirm delete |
| `n` / `Esc` | Cancel |

## How the HuggingFace cache works

HuggingFace stores downloaded files in a content-addressable cache under `~/.cache/huggingface/hub/`:

```
models--meta-llama--Llama-3.2-1B/
├── blobs/          ← actual file content, named by hash (real disk usage)
├── snapshots/      ← one dir per revision, files are symlinks → blobs/
│   └── abc123.../
│       ├── config.json → ../../blobs/7cb18dc...
│       └── model.safetensors → ../../blobs/403450e...
└── refs/           ← branch/tag names → commit hashes
    └── main        ← contains "abc123..."
```

Multiple revisions of the same model share blobs — only changed files are stored twice. This TUI measures disk usage from `blobs/` (true usage, no double-counting) and cleans up orphaned blobs when deleting a revision.

## Tech stack

- [Ink](https://github.com/vadimdemedes/ink) — React-based TUI framework
- [Bun](https://bun.sh) — runtime, bundler, and compiler
- TypeScript

## License

MIT
