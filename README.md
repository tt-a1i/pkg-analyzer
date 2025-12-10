# pkg-analyzer

[![npm version](https://img.shields.io/npm/v/@tt-a1i/pkg-analyzer.svg)](https://www.npmjs.com/package/@tt-a1i/pkg-analyzer)
[![CI](https://github.com/tt-a1i/pkg-analyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/tt-a1i/pkg-analyzer/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/tt-a1i/pkg-analyzer/graph/badge.svg)](https://codecov.io/gh/tt-a1i/pkg-analyzer)
[![Node.js](https://img.shields.io/node/v/@tt-a1i/pkg-analyzer.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

English | [中文](./README.zh-CN.md)

A powerful CLI tool to analyze node_modules dependencies - visualize sizes, find duplicates, detect unused packages, and export reports for AI-powered optimization suggestions.

## Features

- **Size Analysis** - Visualize package sizes with colored bars and icons
- **Duplicate Detection** - Find packages with multiple versions wasting space
- **Unused Detection** - Identify potentially unused dependencies
- **Dependency Tree** - View hierarchical dependency relationships
- **Interactive Mode** - Menu-driven interface for easy exploration
- **Export Reports** - Export to JSON/Markdown for AI analysis
- **Clipboard Copy** - Copy reports directly to clipboard
- **Multi-Package Manager** - Supports npm, yarn, and pnpm

## Installation

```bash
# npm
npm install -g @tt-a1i/pkg-analyzer

# pnpm
pnpm add -g @tt-a1i/pkg-analyzer

# yarn
yarn global add @tt-a1i/pkg-analyzer

# Or use npx directly (no install required)
npx @tt-a1i/pkg-analyzer
```

## Quick Start

```bash
# Analyze current project
pkg-analyzer

# Interactive mode
pkg-analyzer -i

# Export report for AI analysis
pkg-analyzer --copy
```

## Usage

```bash
pkg-analyzer [path] [options]
```

### Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--top <n>` | `-n` | Show top N largest packages (default: 10) |
| `--type <type>` | `-t` | Filter by type: prod, dev, transitive, all |
| `--sort <field>` | `-s` | Sort by: size, name, type |
| `--duplicates` | `-d` | Show duplicate packages |
| `--unused` | `-u` | Detect unused dependencies |
| `--outdated` | `-o` | Show outdated dependencies |
| `--security` | | Run security audit |
| `--compare <path>` | | Compare with another project |
| `--why <pkg>` | | Show why a package is installed |
| `--tree [pkg]` | | Show dependency tree |
| `--depth <n>` | | Max depth for tree view (default: 3) |
| `--filter <keyword>` | `-f` | Filter packages by name |
| `--interactive` | `-i` | Interactive mode |
| `--export <file>` | `-e` | Export to file (.json or .md) |
| `--copy` | `-c` | Copy report to clipboard |
| `--json` | | Output as JSON |

## Examples

### Basic Analysis

```bash
# Show top 20 largest packages
pkg-analyzer --top 20

# Show only production dependencies
pkg-analyzer --type prod

# Sort by name
pkg-analyzer --sort name
```

### Find Problems

```bash
# Find duplicate packages (multiple versions)
pkg-analyzer --duplicates

# Find unused dependencies
pkg-analyzer --unused

# Search for specific packages
pkg-analyzer --filter react
```

### Updates & Security

```bash
# Show outdated dependencies
pkg-analyzer --outdated

# Run security audit
pkg-analyzer --security

# Compare with another project
pkg-analyzer --compare ../other-project
```

### Why Is This Package Installed?

```bash
# Find why a package is installed
pkg-analyzer --why lodash

# Check if a package is direct or transitive
pkg-analyzer --why ansi-styles
```

### Dependency Tree

```bash
# Show full dependency tree
pkg-analyzer --tree

# Show tree for specific package
pkg-analyzer --tree lodash

# Limit tree depth
pkg-analyzer --tree --depth 2
```

### Export & Share

```bash
# Copy report to clipboard (paste to AI for suggestions)
pkg-analyzer --copy

# Export to Markdown file
pkg-analyzer --export report.md

# Export to JSON file
pkg-analyzer --export report.json

# Both copy and export
pkg-analyzer --copy --export analysis.md
```

### Interactive Mode

```bash
pkg-analyzer -i
```

Interactive mode provides a menu-driven interface to:
- Analyze top packages by size
- Filter by dependency type
- Search packages by name
- Find duplicates
- Detect unused dependencies
- View dependency tree

## Output Example

```
  ╔═══════════════════════════════════════════════════════╗
  ║  DEPENDENCY SIZE ANALYSIS                             ║
  ╚═══════════════════════════════════════════════════════╝
  /path/to/project

  Legend: ◉ prod  ◉ dev  ◯ transitive    Size: ■<100KB ■<1MB ■<5MB ■>5MB

┌────┬───────────────────────────────────┬────────────┬────────────┬────────────────────────┐
│    │ Package                           │ Version    │ Size       │                        │
├────┼───────────────────────────────────┼────────────┼────────────┼────────────────────────┤
│ ◉  │ typescript                        │ 5.3.0      │    22.5 MB │ ████████████████████   │
├────┼───────────────────────────────────┼────────────┼────────────┼────────────────────────┤
│ ◯  │ @esbuild/darwin-arm64             │ 0.19.0     │     9.9 MB │ █████████░░░░░░░░░░░   │
├────┼───────────────────────────────────┼────────────┼────────────┼────────────────────────┤
│ ◯  │ rxjs                              │ 7.8.1      │     4.3 MB │ ████░░░░░░░░░░░░░░░░   │
└────┴───────────────────────────────────┴────────────┴────────────┴────────────────────────┘

  ╭───────────────────────────────────────────╮
  │                                           │
  │   ℹ Total: 52.5 MB in 113 packages       │
  │                                           │
  │   Breakdown by type:                      │
  │     ◉ Production:      1.1 MB  (10 pkgs)  │
  │     ◉ Development:    24.7 MB  (2 pkgs)   │
  │     ◯ Transitive:     26.7 MB  (101 pkgs) │
  │                                           │
  ╰───────────────────────────────────────────╯
```

## AI-Powered Optimization

Export a report and paste it to your favorite AI assistant for optimization suggestions:

```bash
pkg-analyzer --copy
```

The exported Markdown includes:
- Complete dependency analysis
- Duplicate packages with wasted space
- Potentially unused dependencies
- A ready-to-use AI prompt asking for optimization suggestions

## Programmatic API

```typescript
import { analyze } from '@tt-a1i/pkg-analyzer'

await analyze('/path/to/project', {
  top: 20,
  type: 'prod',
  duplicates: true,
  json: true,
})
```

## Package Manager Support

| Package Manager | Lock File | Support |
|-----------------|-----------|---------|
| npm | package-lock.json | ✅ |
| yarn | yarn.lock | ✅ |
| pnpm | pnpm-lock.yaml | ✅ |

## Requirements

- Node.js >= 20

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © [tt-a1i](https://github.com/tt-a1i)
