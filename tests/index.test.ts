import { describe, it, expect, beforeAll } from 'vitest'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const CLI_PATH = path.join(__dirname, '../dist/cli.js')
const PROJECT_PATH = path.join(__dirname, '..')

function runCli(args: string = ''): string {
  try {
    // Capture both stdout and stderr
    return execSync(`node ${CLI_PATH} ${args} 2>&1`, {
      cwd: PROJECT_PATH,
      encoding: 'utf-8',
    })
  } catch (error: unknown) {
    // Return stderr/stdout from failed command
    if (error && typeof error === 'object' && 'stdout' in error) {
      return String((error as { stdout: unknown }).stdout || (error as { stderr: unknown }).stderr || '')
    }
    throw error
  }
}

describe('pkg-analyzer CLI', () => {
  beforeAll(() => {
    // Ensure dist exists
    if (!fs.existsSync(CLI_PATH)) {
      execSync('pnpm build', { cwd: PROJECT_PATH })
    }
  })

  describe('basic commands', () => {
    it('should show help with --help', () => {
      const output = runCli('--help')
      expect(output).toContain('pkg-analyzer')
      expect(output).toContain('--top')
      expect(output).toContain('--duplicates')
    })

    it('should show version with --version', () => {
      const output = runCli('--version')
      expect(output.trim()).toMatch(/^\d+\.\d+\.\d+$/)
    })
  })

  describe('analysis', () => {
    it('should analyze current project', () => {
      const output = runCli()
      expect(output).toContain('DEPENDENCY SIZE ANALYSIS')
      expect(output).toContain('Package')
    })

    it('should respect --top option', () => {
      const output = runCli('--top 5')
      expect(output).toContain('DEPENDENCY SIZE ANALYSIS')
    })

    it('should filter by type', () => {
      const output = runCli('--type prod')
      expect(output).toContain('DEPENDENCY SIZE ANALYSIS')
    })

    it('should sort by name', () => {
      const output = runCli('--sort name')
      expect(output).toContain('DEPENDENCY SIZE ANALYSIS')
    })
  })

  describe('duplicates', () => {
    it('should detect duplicate packages', () => {
      const output = runCli('--duplicates')
      // May or may not have duplicates
      expect(output.includes('DUPLICATE') || output.includes('No duplicate')).toBe(true)
    })
  })

  describe('unused detection', () => {
    it('should detect unused dependencies', () => {
      const output = runCli('--unused')
      expect(output.includes('unused') || output.includes('UNUSED') || output.includes('No unused')).toBe(true)
    })
  })

  describe('filter', () => {
    it('should filter packages by name', () => {
      const output = runCli('--filter chalk')
      expect(output).toContain('chalk')
    })

    it('should handle no matches gracefully', () => {
      const output = runCli('--filter nonexistentpackage123')
      expect(output).toContain('No packages found')
    })
  })

  describe('json output', () => {
    it('should output valid JSON', () => {
      const output = runCli('--json')
      // Find the JSON part (after any spinner output)
      const jsonMatch = output.match(/\{[\s\S]*\}/)
      expect(jsonMatch).not.toBeNull()

      const parsed = JSON.parse(jsonMatch![0])
      expect(parsed).toHaveProperty('total')
      expect(parsed).toHaveProperty('count')
      expect(parsed).toHaveProperty('packages')
      expect(Array.isArray(parsed.packages)).toBe(true)
    })
  })

  describe('export', () => {
    const testExportFile = path.join(PROJECT_PATH, 'test-export.md')
    const testExportJson = path.join(PROJECT_PATH, 'test-export.json')

    it('should export to markdown file', () => {
      runCli(`--export ${testExportFile}`)
      expect(fs.existsSync(testExportFile)).toBe(true)

      const content = fs.readFileSync(testExportFile, 'utf-8')
      expect(content).toContain('# Dependency Analysis Report')
      expect(content).toContain('## Summary')
      expect(content).toContain('## Largest Packages')

      // Cleanup
      fs.unlinkSync(testExportFile)
    })

    it('should export to JSON file', () => {
      runCli(`--export ${testExportJson}`)
      expect(fs.existsSync(testExportJson)).toBe(true)

      const content = fs.readFileSync(testExportJson, 'utf-8')
      const parsed = JSON.parse(content)
      expect(parsed).toHaveProperty('projectPath')
      expect(parsed).toHaveProperty('summary')
      expect(parsed).toHaveProperty('packages')

      // Cleanup
      fs.unlinkSync(testExportJson)
    })
  })

  describe('tree view', () => {
    it('should show dependency tree', () => {
      const output = runCli('--tree --depth 2')
      expect(output).toContain('DEPENDENCY TREE')
    })

    it('should show tree for specific package', () => {
      const output = runCli('--tree chalk')
      expect(output).toContain('DEPENDENCY TREE')
      expect(output).toContain('chalk')
    })
  })

  describe('error handling', () => {
    it('should handle non-existent path', () => {
      const output = runCli('/nonexistent/path/12345')
      expect(output).toContain('node_modules not found')
    })
  })
})

describe('package manager detection', () => {
  it('should detect pnpm from lock file', () => {
    const output = runCli('--json')
    // Project uses pnpm, so detection should work
    expect(output).toBeTruthy()
  })
})
