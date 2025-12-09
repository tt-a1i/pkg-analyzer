import fs from 'node:fs'
import path from 'node:path'
import chalk from 'chalk'
import YAML from 'yaml'

interface PackageInfo {
  name: string
  version: string
  size: number
}

interface AnalyzeOptions {
  top?: number
  json?: boolean
}

/**
 * Get directory size recursively
 */
function getDirSize(dirPath: string): number {
  let size = 0

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      if (entry.isDirectory()) {
        size += getDirSize(fullPath)
      } else if (entry.isFile()) {
        size += fs.statSync(fullPath).size
      }
    }
  } catch {
    // Ignore permission errors
  }

  return size
}

/**
 * Format bytes to human readable string
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Create a progress bar
 */
function createBar(ratio: number, width: number = 20): string {
  const filled = Math.round(ratio * width)
  const empty = width - filled
  return chalk.cyan('█'.repeat(filled)) + chalk.gray('░'.repeat(empty))
}

/**
 * Parse pnpm-lock.yaml to get dependencies
 */
function parsePnpmLock(projectPath: string): string[] {
  const lockPath = path.join(projectPath, 'pnpm-lock.yaml')

  if (!fs.existsSync(lockPath)) {
    return []
  }

  const content = fs.readFileSync(lockPath, 'utf-8')
  const lock = YAML.parse(content)

  const deps: string[] = []

  // pnpm-lock.yaml v6+ format
  if (lock.packages) {
    for (const key of Object.keys(lock.packages)) {
      // Format: /package-name@version or @scope/package-name@version
      const match = key.match(/^\/?(@?[^@]+)@/)
      if (match) {
        deps.push(match[1])
      }
    }
  }

  return [...new Set(deps)]
}

/**
 * Get all packages from node_modules (supports pnpm)
 */
function getPackagesFromNodeModules(projectPath: string): PackageInfo[] {
  const nodeModulesPath = path.join(projectPath, 'node_modules')

  if (!fs.existsSync(nodeModulesPath)) {
    console.error(chalk.red('Error: node_modules not found. Run pnpm install first.'))
    process.exit(1)
  }

  const packages: PackageInfo[] = []

  // Check if it's pnpm (has .pnpm directory)
  const pnpmPath = path.join(nodeModulesPath, '.pnpm')
  const isPnpm = fs.existsSync(pnpmPath)

  if (isPnpm) {
    // pnpm: scan .pnpm directory
    const entries = fs.readdirSync(pnpmPath, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      // Format: package-name@version or @scope+package-name@version
      const dirName = entry.name

      // Parse package name from directory name
      // Examples: chalk@5.6.2, @types+node@20.19.26
      let name: string
      let atIndex: number

      if (dirName.startsWith('@')) {
        // Scoped package: @scope+name@version
        const plusIndex = dirName.indexOf('+')
        if (plusIndex === -1) continue

        atIndex = dirName.indexOf('@', plusIndex)
        if (atIndex === -1) continue

        const scope = dirName.substring(0, plusIndex)
        const pkgName = dirName.substring(plusIndex + 1, atIndex)
        name = `${scope}/${pkgName}`
      } else {
        // Regular package: name@version
        atIndex = dirName.lastIndexOf('@')
        if (atIndex <= 0) continue

        name = dirName.substring(0, atIndex)
      }

      // The actual package is in node_modules inside the .pnpm dir
      const pkgPath = path.join(pnpmPath, dirName, 'node_modules', name)

      if (fs.existsSync(pkgPath)) {
        const info = getPackageInfo(pkgPath, name)
        if (info) packages.push(info)
      }
    }
  } else {
    // npm/yarn: scan node_modules directly
    const entries = fs.readdirSync(nodeModulesPath, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue

      const pkgPath = path.join(nodeModulesPath, entry.name)

      // Handle scoped packages (@scope/package)
      if (entry.name.startsWith('@')) {
        const scopedEntries = fs.readdirSync(pkgPath, { withFileTypes: true })

        for (const scopedEntry of scopedEntries) {
          if (!scopedEntry.isDirectory()) continue

          const scopedPkgPath = path.join(pkgPath, scopedEntry.name)
          const name = `${entry.name}/${scopedEntry.name}`
          const info = getPackageInfo(scopedPkgPath, name)
          if (info) packages.push(info)
        }
      } else {
        const info = getPackageInfo(pkgPath, entry.name)
        if (info) packages.push(info)
      }
    }
  }

  return packages
}

/**
 * Get package info
 */
function getPackageInfo(pkgPath: string, name: string): PackageInfo | null {
  const pkgJsonPath = path.join(pkgPath, 'package.json')

  if (!fs.existsSync(pkgJsonPath)) return null

  try {
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'))
    const size = getDirSize(pkgPath)

    return {
      name,
      version: pkgJson.version || 'unknown',
      size,
    }
  } catch {
    return null
  }
}

/**
 * Main analyze function
 */
export async function analyze(projectPath: string = '.', options: AnalyzeOptions = {}) {
  const { top = 10, json = false } = options
  const resolvedPath = path.resolve(projectPath)

  console.log(chalk.blue(`\nAnalyzing: ${resolvedPath}\n`))

  // Get packages
  const packages = getPackagesFromNodeModules(resolvedPath)

  if (packages.length === 0) {
    console.log(chalk.yellow('No packages found.'))
    return
  }

  // Sort by size
  packages.sort((a, b) => b.size - a.size)

  // Calculate total
  const totalSize = packages.reduce((sum, pkg) => sum + pkg.size, 0)
  const maxSize = packages[0].size

  // JSON output
  if (json) {
    console.log(JSON.stringify({
      total: totalSize,
      count: packages.length,
      packages: packages.slice(0, top),
    }, null, 2))
    return
  }

  // Terminal output
  console.log(chalk.bold('📦 Dependency Size Analysis\n'))

  const topPackages = packages.slice(0, top)
  const maxNameLength = Math.max(...topPackages.map(p => p.name.length))

  for (const pkg of topPackages) {
    const name = pkg.name.padEnd(maxNameLength)
    const size = formatSize(pkg.size).padStart(10)
    const bar = createBar(pkg.size / maxSize)

    console.log(`${chalk.white(name)}  ${chalk.yellow(size)}  ${bar}`)
  }

  console.log('')
  console.log(chalk.gray('─'.repeat(50)))
  console.log(chalk.bold(`Total: ${packages.length} packages, ${formatSize(totalSize)}`))

  if (packages.length > top) {
    console.log(chalk.gray(`(showing top ${top}, use --top to see more)`))
  }
}
