# pkg-analyzer

Analyze node_modules dependencies size and visualize in terminal.

## Install

```bash
npm install -g pkg-analyzer
# or
pnpm add -g pkg-analyzer
```

## Usage

```bash
# Analyze current directory
pkg-analyzer

# Analyze specific path
pkg-analyzer /path/to/project

# Show top 20 largest packages
pkg-analyzer --top 20

# Output as JSON
pkg-analyzer --json
```

## Example Output

```
📦 Dependency Size Analysis

typescript        15.2 MB  ████████████████████
@babel/core        5.3 MB  ███████
lodash             1.4 MB  ██
chalk              0.1 MB  ░

──────────────────────────────────────────────────
Total: 42 packages, 25.6 MB
```

## License

MIT
