#!/usr/bin/env node
import { Command } from 'commander'
import { analyze } from './index.js'

const program = new Command()

program
  .name('pkg-analyzer')
  .description('Analyze node_modules dependencies size')
  .version('0.4.0')
  .argument('[path]', 'Project path to analyze', '.')
  .option('-n, --top <number>', 'Show top N largest packages', '10')
  .option('-t, --type <type>', 'Filter by type: prod, dev, transitive, all', 'all')
  .option('-s, --sort <field>', 'Sort by: size, name, type', 'size')
  .option('-d, --duplicates', 'Show duplicate packages (multiple versions)')
  .option('--tree [package]', 'Show dependency tree (optionally for specific package)')
  .option('--depth <number>', 'Max depth for tree view', '3')
  .option('-u, --unused', 'Detect unused dependencies')
  .option('-o, --outdated', 'Show outdated dependencies')
  .option('--security', 'Run security audit (npm audit)')
  .option('--compare <path>', 'Compare dependencies with another project')
  .option('--why <package>', 'Show why a package is installed (reverse dependencies)')
  .option('-f, --filter <keyword>', 'Filter packages by name')
  .option('-i, --interactive', 'Interactive mode with keyboard navigation')
  .option('--json', 'Output as JSON')
  .option('-e, --export <file>', 'Export analysis to file (supports .json, .md)')
  .option('-c, --copy', 'Copy analysis report to clipboard (markdown format)')
  .action(
    async (
      path: string,
      options: {
        top: string
        type: string
        sort: string
        duplicates: boolean
        tree?: string | boolean
        depth: string
        unused: boolean
        outdated: boolean
        security: boolean
        compare?: string
        why?: string
        filter?: string
        interactive: boolean
        json: boolean
        export?: string
        copy: boolean
      }
    ) => {
      await analyze(path, {
        top: parseInt(options.top, 10),
        type: options.type as 'prod' | 'dev' | 'transitive' | 'all',
        sort: options.sort as 'size' | 'name' | 'type',
        duplicates: options.duplicates,
        tree: options.tree,
        depth: parseInt(options.depth, 10),
        unused: options.unused,
        outdated: options.outdated,
        security: options.security,
        compare: options.compare,
        why: options.why,
        filter: options.filter,
        interactive: options.interactive,
        json: options.json,
        exportFile: options.export,
        copyToClipboard: options.copy,
      })
    }
  )

program.parse()
