# Contributing to pkg-analyzer

Thanks for your interest in contributing! This document provides guidelines for contributing to the project.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/tt-a1i/pkg-analyzer.git
   cd pkg-analyzer
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Build the project**
   ```bash
   pnpm build
   ```

4. **Run tests**
   ```bash
   pnpm test
   ```

## Development Commands

| Command | Description |
|---------|-------------|
| `pnpm build` | Build the project |
| `pnpm dev` | Build in watch mode |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Fix ESLint errors |
| `pnpm format` | Format code with Prettier |
| `pnpm typecheck` | Run TypeScript type checking |

## Project Structure

```
pkg-analyzer/
├── src/
│   ├── cli.ts      # CLI entry point
│   └── index.ts    # Main logic
├── tests/
│   └── index.test.ts
├── dist/           # Build output
└── package.json
```

## Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Add tests for new features

3. **Run checks before committing**
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   ```

4. **Commit your changes**
   - Use clear, descriptive commit messages
   - Follow [Conventional Commits](https://www.conventionalcommits.org/) format:
     - `feat:` for new features
     - `fix:` for bug fixes
     - `docs:` for documentation changes
     - `refactor:` for code refactoring
     - `test:` for test changes

5. **Push and create a Pull Request**

## Pull Request Guidelines

- Provide a clear description of the changes
- Reference any related issues
- Ensure all checks pass
- Keep PRs focused and reasonably sized

## Reporting Issues

When reporting issues, please include:

- Your Node.js version (`node --version`)
- Your package manager and version
- Operating system
- Steps to reproduce the issue
- Expected vs actual behavior

## Code Style

- Use TypeScript
- Follow the existing code patterns
- Use meaningful variable and function names
- Add comments for complex logic

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
