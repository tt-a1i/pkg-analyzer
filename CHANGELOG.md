# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2024-12-09

### Added
- Progress bar for pnpm package scanning with visual indicator
- Elapsed time display for npm/yarn package scanning
- CHANGELOG.md for version history tracking
- Auto GitHub Release creation in CI workflow

### Changed
- Improved scanning feedback with percentage and timing info

## [0.1.0] - 2024-12-09

### Added
- Initial release
- Size analysis with visual bars and colored output
- Duplicate package detection
- Unused dependency detection
- Dependency tree view with configurable depth
- Interactive menu mode (`-i`)
- Export to JSON and Markdown files (`--export`)
- Copy report to clipboard (`--copy`)
- Filter by dependency type: prod, dev, transitive (`--type`)
- Filter packages by name (`--filter`)
- Sort by size, name, or type (`--sort`)
- JSON output mode (`--json`)
- Support for npm, yarn, and pnpm package managers
- Cross-platform support (macOS, Linux, Windows)

[0.2.0]: https://github.com/tt-a1i/pkg-analyzer/releases/tag/v0.2.0
[0.1.0]: https://github.com/tt-a1i/pkg-analyzer/releases/tag/v0.1.0
