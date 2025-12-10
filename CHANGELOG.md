# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2024-12-10

### Added
- `--why <package>` option to show why a package is installed (reverse dependency lookup)
- Test coverage reporting with Codecov integration
- Coverage badge in README

### Changed
- Performance optimization: parallel package scanning with async I/O
- Improved scanning speed with concurrent size calculation (10x parallelism)
- Better progress feedback during parallel processing

## [0.3.0] - 2024-12-10

### Added
- `--outdated` option to show outdated dependencies
- `--security` option to run npm audit security check
- `--compare <path>` option to compare dependencies with another project
- Chinese README (README.zh-CN.md)
- ESLint + Prettier for code formatting
- CONTRIBUTING.md with development guide
- GitHub issue and PR templates

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

[0.4.0]: https://github.com/tt-a1i/pkg-analyzer/releases/tag/v0.4.0
[0.3.0]: https://github.com/tt-a1i/pkg-analyzer/releases/tag/v0.3.0
[0.2.0]: https://github.com/tt-a1i/pkg-analyzer/releases/tag/v0.2.0
[0.1.0]: https://github.com/tt-a1i/pkg-analyzer/releases/tag/v0.1.0
