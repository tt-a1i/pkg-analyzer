#!/usr/bin/env node
import { Command } from 'commander'
import { analyze } from './index.js'

const program = new Command()

program
  .name('pkg-analyzer')
  .description('Analyze node_modules dependencies size')
  .version('0.1.0')
  .argument('[path]', 'Project path to analyze', '.')
  .option('-n, --top <number>', 'Show top N largest packages', '10')
  .option('--json', 'Output as JSON')
  .action(async (path: string, options: { top: string; json: boolean }) => {
    await analyze(path, {
      top: parseInt(options.top, 10),
      json: options.json,
    })
  })

program.parse()
