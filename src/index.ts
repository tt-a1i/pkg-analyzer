import fs from 'node:fs'
import path from 'node:path'
import chalk from 'chalk'
import ora from 'ora'
import Table from 'cli-table3'
import boxen from 'boxen'
import figures from 'figures'
import gradient from 'gradient-string'
import { select, input, confirm, Separator } from '@inquirer/prompts'

// Custom gradient for the tool
const pkgGradient = gradient(['#00d9ff', '#00ff87'])
const warnGradient = gradient(['#ffaa00', '#ff5500'])

interface PackageInfo {
  name: string
  version: string
  size: number
  type: 'prod' | 'dev' | 'peer' | 'optional' | 'transitive'
}

interface DuplicateInfo {
  name: string
  versions: { version: string; size: number }[]
  totalSize: number
}

interface AnalyzeOptions {
  top?: number
  type?: 'prod' | 'dev' | 'transitive' | 'all'
  sort?: 'size' | 'name' | 'type'
  duplicates?: boolean
  tree?: string | boolean
  depth?: number
  unused?: boolean
  filter?: string
  interactive?: boolean
  json?: boolean
}

interface UnusedDep {
  name: string
  version: string
  size: number
  type: 'prod' | 'dev'
}

interface TreeNode {
  name: string
  version: string
  size: number
  children: TreeNode[]
}

interface ProjectDeps {
  prod: Set<string>
  dev: Set<string>
  peer: Set<string>
  optional: Set<string>
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
 * Color code size based on magnitude
 */
function colorSize(bytes: number, formatted: string): string {
  if (bytes > 5 * 1024 * 1024) return chalk.red(formatted)
  if (bytes > 1 * 1024 * 1024) return chalk.yellow(formatted)
  if (bytes > 100 * 1024) return chalk.white(formatted)
  return chalk.green(formatted)
}

/**
 * Create a progress bar with gradient colors
 */
function createBar(ratio: number, width: number = 20): string {
  const filled = Math.round(ratio * width)
  const empty = width - filled

  let bar = ''
  for (let i = 0; i < filled; i++) {
    const pos = i / width
    if (pos > 0.7) bar += chalk.red('█')
    else if (pos > 0.4) bar += chalk.yellow('█')
    else bar += chalk.green('█')
  }
  bar += chalk.gray('░'.repeat(empty))

  return bar
}

/**
 * Get package type icon
 */
function getTypeIcon(type: PackageInfo['type']): string {
  switch (type) {
    case 'prod': return chalk.green(figures.circleFilled)
    case 'dev': return chalk.blue(figures.circleFilled)
    case 'peer': return chalk.magenta(figures.circleFilled)
    case 'optional': return chalk.yellow(figures.circleFilled)
    case 'transitive': return chalk.gray(figures.circle)
  }
}

/**
 * Print styled header
 */
function printHeader(title: string, subtitle?: string): void {
  console.log()
  console.log(pkgGradient.multiline(`  ╔═══════════════════════════════════════════════════════╗
  ║  ${title.padEnd(52)} ║
  ╚═══════════════════════════════════════════════════════╝`))
  if (subtitle) {
    console.log(chalk.gray(`  ${subtitle}`))
  }
  console.log()
}

/**
 * Print summary box
 */
function printSummaryBox(lines: string[]): void {
  const content = lines.join('\n')
  console.log(boxen(content, {
    padding: 1,
    margin: { top: 1, bottom: 1, left: 2, right: 2 },
    borderStyle: 'round',
    borderColor: 'cyan',
  }))
}

/**
 * Read project's direct dependencies from package.json
 */
function getProjectDeps(projectPath: string): ProjectDeps {
  const pkgJsonPath = path.join(projectPath, 'package.json')
  const deps: ProjectDeps = {
    prod: new Set(),
    dev: new Set(),
    peer: new Set(),
    optional: new Set(),
  }

  if (!fs.existsSync(pkgJsonPath)) return deps

  try {
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'))

    if (pkgJson.dependencies) {
      Object.keys(pkgJson.dependencies).forEach(d => deps.prod.add(d))
    }
    if (pkgJson.devDependencies) {
      Object.keys(pkgJson.devDependencies).forEach(d => deps.dev.add(d))
    }
    if (pkgJson.peerDependencies) {
      Object.keys(pkgJson.peerDependencies).forEach(d => deps.peer.add(d))
    }
    if (pkgJson.optionalDependencies) {
      Object.keys(pkgJson.optionalDependencies).forEach(d => deps.optional.add(d))
    }
  } catch {
    // Ignore errors
  }

  return deps
}

/**
 * Determine package type
 */
function getPackageType(name: string, deps: ProjectDeps): PackageInfo['type'] {
  if (deps.prod.has(name)) return 'prod'
  if (deps.dev.has(name)) return 'dev'
  if (deps.peer.has(name)) return 'peer'
  if (deps.optional.has(name)) return 'optional'
  return 'transitive'
}

type PackageManager = 'pnpm' | 'yarn' | 'npm'

/**
 * Detect which package manager is used
 */
function detectPackageManager(projectPath: string): PackageManager {
  // Check for lock files
  if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) return 'pnpm'
  if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) return 'yarn'
  if (fs.existsSync(path.join(projectPath, 'package-lock.json'))) return 'npm'

  // Check node_modules structure
  const nodeModulesPath = path.join(projectPath, 'node_modules')
  if (fs.existsSync(path.join(nodeModulesPath, '.pnpm'))) return 'pnpm'
  if (fs.existsSync(path.join(nodeModulesPath, '.yarn-integrity'))) return 'yarn'

  return 'npm' // default
}

/**
 * Get all packages from node_modules (supports pnpm, yarn, npm)
 */
function getPackagesFromNodeModules(projectPath: string, deps: ProjectDeps, spinner: ReturnType<typeof ora>): PackageInfo[] {
  const nodeModulesPath = path.join(projectPath, 'node_modules')

  if (!fs.existsSync(nodeModulesPath)) {
    spinner.fail('node_modules not found. Run npm/yarn/pnpm install first.')
    process.exit(1)
  }

  const packageManager = detectPackageManager(projectPath)
  spinner.text = `Scanning packages (${packageManager})...`

  const packages: PackageInfo[] = []

  if (packageManager === 'pnpm') {
    // pnpm stores packages in .pnpm directory
    const pnpmPath = path.join(nodeModulesPath, '.pnpm')
    if (!fs.existsSync(pnpmPath)) {
      spinner.fail('pnpm structure not found.')
      process.exit(1)
    }

    const entries = fs.readdirSync(pnpmPath, { withFileTypes: true })
    const total = entries.length
    let processed = 0

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      processed++
      spinner.text = `Scanning packages (pnpm)... ${processed}/${total}`

      const dirName = entry.name
      let name: string
      let atIndex: number

      if (dirName.startsWith('@')) {
        const plusIndex = dirName.indexOf('+')
        if (plusIndex === -1) continue

        atIndex = dirName.indexOf('@', plusIndex)
        if (atIndex === -1) continue

        const scope = dirName.substring(0, plusIndex)
        const pkgName = dirName.substring(plusIndex + 1, atIndex)
        name = `${scope}/${pkgName}`
      } else {
        atIndex = dirName.lastIndexOf('@')
        if (atIndex <= 0) continue

        name = dirName.substring(0, atIndex)
      }

      const pkgPath = path.join(pnpmPath, dirName, 'node_modules', name)

      if (fs.existsSync(pkgPath)) {
        const info = getPackageInfo(pkgPath, name, deps)
        if (info) packages.push(info)
      }
    }
  } else {
    // npm and yarn use flat/nested node_modules structure
    // We need to scan recursively to find all packages including nested ones
    const seen = new Map<string, PackageInfo>() // key: name@version

    function scanNodeModules(nmPath: string, depth: number = 0) {
      if (!fs.existsSync(nmPath) || depth > 10) return

      const entries = fs.readdirSync(nmPath, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue

        const pkgPath = path.join(nmPath, entry.name)

        if (entry.name.startsWith('@')) {
          // Scoped package directory
          const scopedEntries = fs.readdirSync(pkgPath, { withFileTypes: true })

          for (const scopedEntry of scopedEntries) {
            if (!scopedEntry.isDirectory()) continue

            const scopedPkgPath = path.join(pkgPath, scopedEntry.name)
            const name = `${entry.name}/${scopedEntry.name}`
            const info = getPackageInfo(scopedPkgPath, name, deps)

            if (info) {
              const key = `${info.name}@${info.version}`
              if (!seen.has(key)) {
                seen.set(key, info)
                spinner.text = `Scanning packages (${packageManager})... ${seen.size} found`
              }
            }

            // Check for nested node_modules
            const nestedNm = path.join(scopedPkgPath, 'node_modules')
            scanNodeModules(nestedNm, depth + 1)
          }
        } else {
          const info = getPackageInfo(pkgPath, entry.name, deps)

          if (info) {
            const key = `${info.name}@${info.version}`
            if (!seen.has(key)) {
              seen.set(key, info)
              spinner.text = `Scanning packages (${packageManager})... ${seen.size} found`
            }
          }

          // Check for nested node_modules
          const nestedNm = path.join(pkgPath, 'node_modules')
          scanNodeModules(nestedNm, depth + 1)
        }
      }
    }

    scanNodeModules(nodeModulesPath)
    packages.push(...seen.values())
  }

  return packages
}

/**
 * Get package info
 */
function getPackageInfo(pkgPath: string, name: string, deps: ProjectDeps): PackageInfo | null {
  const pkgJsonPath = path.join(pkgPath, 'package.json')

  if (!fs.existsSync(pkgJsonPath)) return null

  try {
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'))
    const size = getDirSize(pkgPath)

    return {
      name,
      version: pkgJson.version || 'unknown',
      size,
      type: getPackageType(name, deps),
    }
  } catch {
    return null
  }
}

/**
 * Find duplicate packages (multiple versions)
 */
function findDuplicates(packages: PackageInfo[]): DuplicateInfo[] {
  const byName = new Map<string, PackageInfo[]>()

  for (const pkg of packages) {
    const existing = byName.get(pkg.name) || []
    existing.push(pkg)
    byName.set(pkg.name, existing)
  }

  const duplicates: DuplicateInfo[] = []

  for (const [name, pkgs] of byName) {
    if (pkgs.length > 1) {
      const versions = pkgs.map(p => ({ version: p.version, size: p.size }))
      const totalSize = pkgs.reduce((sum, p) => sum + p.size, 0)
      duplicates.push({ name, versions, totalSize })
    }
  }

  return duplicates.sort((a, b) => b.totalSize - a.totalSize)
}

/**
 * Sort packages
 */
function sortPackages(packages: PackageInfo[], sortBy: 'size' | 'name' | 'type'): PackageInfo[] {
  const typeOrder = { prod: 0, dev: 1, peer: 2, optional: 3, transitive: 4 }

  return [...packages].sort((a, b) => {
    switch (sortBy) {
      case 'size':
        return b.size - a.size
      case 'name':
        return a.name.localeCompare(b.name)
      case 'type':
        return typeOrder[a.type] - typeOrder[b.type] || b.size - a.size
    }
  })
}

/**
 * Filter packages by type
 */
function filterPackages(packages: PackageInfo[], type: 'prod' | 'dev' | 'transitive' | 'all'): PackageInfo[] {
  if (type === 'all') return packages
  return packages.filter(p => p.type === type)
}

/**
 * Get dependencies of a package from its package.json
 */
function getPackageDeps(pkgPath: string): string[] {
  const pkgJsonPath = path.join(pkgPath, 'package.json')
  if (!fs.existsSync(pkgJsonPath)) return []

  try {
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'))
    return Object.keys(pkgJson.dependencies || {})
  } catch {
    return []
  }
}

/**
 * Build dependency tree
 */
function buildTree(
  projectPath: string,
  packageName: string | null,
  packages: PackageInfo[],
  maxDepth: number
): TreeNode[] {
  const nodeModulesPath = path.join(projectPath, 'node_modules')
  const pnpmPath = path.join(nodeModulesPath, '.pnpm')
  const isPnpm = fs.existsSync(pnpmPath)

  const packageMap = new Map<string, PackageInfo>()
  for (const pkg of packages) {
    packageMap.set(pkg.name, pkg)
  }

  function findPkgPath(name: string): string | null {
    if (isPnpm) {
      const entries = fs.readdirSync(pnpmPath)
      for (const entry of entries) {
        let pkgName: string
        if (entry.startsWith('@')) {
          const plusIndex = entry.indexOf('+')
          const atIndex = entry.indexOf('@', plusIndex)
          if (plusIndex === -1 || atIndex === -1) continue
          pkgName = `${entry.substring(0, plusIndex)}/${entry.substring(plusIndex + 1, atIndex)}`
        } else {
          const atIndex = entry.lastIndexOf('@')
          if (atIndex <= 0) continue
          pkgName = entry.substring(0, atIndex)
        }
        if (pkgName === name) {
          return path.join(pnpmPath, entry, 'node_modules', name)
        }
      }
    } else {
      const pkgPath = path.join(nodeModulesPath, name)
      if (fs.existsSync(pkgPath)) return pkgPath
    }
    return null
  }

  function buildNode(name: string, depth: number, visited: Set<string>): TreeNode | null {
    if (depth > maxDepth || visited.has(name)) return null

    const pkg = packageMap.get(name)
    if (!pkg) return null

    const pkgPath = findPkgPath(name)
    if (!pkgPath) return null

    visited.add(name)
    const deps = getPackageDeps(pkgPath)

    const children: TreeNode[] = []
    for (const dep of deps) {
      const child = buildNode(dep, depth + 1, new Set(visited))
      if (child) children.push(child)
    }

    children.sort((a, b) => b.size - a.size)

    return {
      name: pkg.name,
      version: pkg.version,
      size: pkg.size,
      children,
    }
  }

  if (packageName) {
    const node = buildNode(packageName, 0, new Set())
    return node ? [node] : []
  }

  // Build tree from project's direct dependencies
  const pkgJsonPath = path.join(projectPath, 'package.json')
  if (!fs.existsSync(pkgJsonPath)) return []

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'))
  const directDeps = [
    ...Object.keys(pkgJson.dependencies || {}),
    ...Object.keys(pkgJson.devDependencies || {}),
  ]

  const roots: TreeNode[] = []
  for (const dep of directDeps) {
    const node = buildNode(dep, 0, new Set())
    if (node) roots.push(node)
  }

  return roots.sort((a, b) => b.size - a.size)
}

/**
 * Print dependency tree
 */
function printTree(nodes: TreeNode[], prefix: string = '', isLast: boolean[] = []): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const isLastNode = i === nodes.length - 1

    let linePrefix = ''
    for (let j = 0; j < isLast.length; j++) {
      linePrefix += isLast[j] ? '    ' : '│   '
    }

    const connector = isLastNode ? '└── ' : '├── '
    const sizeStr = formatSize(node.size)
    const coloredSize = colorSize(node.size, sizeStr)

    console.log(
      `${linePrefix}${chalk.gray(connector)}${chalk.bold.white(node.name)}${chalk.cyan('@' + node.version)} ${coloredSize}`
    )

    if (node.children.length > 0) {
      printTree(node.children, '', [...isLast, isLastNode])
    }
  }
}

/**
 * Scan source files for import/require statements
 */
function scanImports(projectPath: string): Set<string> {
  const imports = new Set<string>()

  const sourceExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.vue', '.svelte']
  const ignoreDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt']

  function scanDir(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          if (!ignoreDirs.includes(entry.name)) {
            scanDir(fullPath)
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name)
          if (sourceExtensions.includes(ext)) {
            scanFile(fullPath)
          }
        }
      }
    } catch {
      // Ignore errors
    }
  }

  function scanFile(filePath: string) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')

      // Match import statements: import x from 'package' or import 'package'
      const importRegex = /(?:import\s+(?:[\w{},*\s]+\s+from\s+)?['"]([^'"./][^'"]*)['"'])|(?:require\s*\(\s*['"]([^'"./][^'"]*)['"]\s*\))/g

      let match
      while ((match = importRegex.exec(content)) !== null) {
        const pkg = match[1] || match[2]
        if (pkg) {
          // Extract package name (handle scoped packages)
          const parts = pkg.split('/')
          if (pkg.startsWith('@') && parts.length >= 2) {
            imports.add(`${parts[0]}/${parts[1]}`)
          } else {
            imports.add(parts[0])
          }
        }
      }
    } catch {
      // Ignore errors
    }
  }

  scanDir(projectPath)
  return imports
}

/**
 * Find unused dependencies
 */
function findUnused(
  projectPath: string,
  packages: PackageInfo[],
  projectDeps: ProjectDeps
): UnusedDep[] {
  const usedImports = scanImports(projectPath)
  const unused: UnusedDep[] = []

  // Check prod dependencies
  for (const depName of projectDeps.prod) {
    if (!usedImports.has(depName)) {
      const pkg = packages.find(p => p.name === depName)
      if (pkg) {
        unused.push({
          name: depName,
          version: pkg.version,
          size: pkg.size,
          type: 'prod',
        })
      }
    }
  }

  // Check dev dependencies (only check for common dev tool usage patterns)
  const devToolPatterns = [
    // Build tools often referenced in config files
    'typescript', 'tsup', 'esbuild', 'webpack', 'rollup', 'vite', 'parcel',
    // Test tools
    'jest', 'vitest', 'mocha', 'chai', 'ava',
    // Linters/formatters
    'eslint', 'prettier', 'stylelint',
    // Type definitions
    '@types/',
  ]

  for (const depName of projectDeps.dev) {
    // Skip common dev tools that may not be directly imported
    const isDevTool = devToolPatterns.some(pattern =>
      depName.startsWith(pattern) || depName === pattern
    )
    if (isDevTool) continue

    if (!usedImports.has(depName)) {
      const pkg = packages.find(p => p.name === depName)
      if (pkg) {
        unused.push({
          name: depName,
          version: pkg.version,
          size: pkg.size,
          type: 'dev',
        })
      }
    }
  }

  return unused.sort((a, b) => b.size - a.size)
}

/**
 * Interactive mode menu
 */
async function runInteractiveMode(projectPath: string): Promise<void> {
  const resolvedPath = path.resolve(projectPath)

  // Print interactive header
  console.clear()
  console.log(boxen(
    pkgGradient.multiline([
      '╔═══════════════════════════════════════════════════════╗',
      '║         PKG-ANALYZER INTERACTIVE MODE                 ║',
      '╚═══════════════════════════════════════════════════════╝',
    ].join('\n')) + '\n\n' + chalk.gray(`  Project: ${resolvedPath}`),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'cyan',
    }
  ))

  while (true) {
    const action = await select({
      message: chalk.cyan('What would you like to do?'),
      choices: [
        { name: `${chalk.green(figures.play)} Analyze top packages by size`, value: 'top' },
        { name: `${chalk.blue(figures.circleFilled)} Filter by type (prod/dev/transitive)`, value: 'type' },
        { name: `${chalk.magenta(figures.pointer)} Search packages by name`, value: 'search' },
        { name: `${chalk.yellow(figures.warning)} Find duplicate packages`, value: 'duplicates' },
        { name: `${chalk.red(figures.cross)} Detect unused dependencies`, value: 'unused' },
        { name: `${chalk.cyan(figures.nodejs)} View dependency tree`, value: 'tree' },
        new Separator(),
        { name: `${chalk.gray(figures.cross)} Exit`, value: 'exit' },
      ],
    })

    if (action === 'exit') {
      console.log(chalk.gray('\n  Goodbye! 👋\n'))
      break
    }

    if (action === 'top') {
      const count = await select({
        message: 'How many packages to show?',
        choices: [
          { name: 'Top 5', value: 5 },
          { name: 'Top 10', value: 10 },
          { name: 'Top 20', value: 20 },
          { name: 'Top 50', value: 50 },
          { name: 'All', value: 999 },
        ],
      })
      const sortBy = await select({
        message: 'Sort by?',
        choices: [
          { name: 'Size (largest first)', value: 'size' as const },
          { name: 'Name (A-Z)', value: 'name' as const },
          { name: 'Type (prod → dev → transitive)', value: 'type' as const },
        ],
      })
      await analyze(projectPath, { top: count, sort: sortBy })
    }

    else if (action === 'type') {
      const pkgType = await select({
        message: 'Which type of dependencies?',
        choices: [
          { name: `${chalk.green(figures.circleFilled)} Production only`, value: 'prod' as const },
          { name: `${chalk.blue(figures.circleFilled)} Development only`, value: 'dev' as const },
          { name: `${chalk.gray(figures.circle)} Transitive only`, value: 'transitive' as const },
          { name: `${chalk.white(figures.star)} All types`, value: 'all' as const },
        ],
      })
      const count = await select({
        message: 'How many to show?',
        choices: [
          { name: 'Top 10', value: 10 },
          { name: 'Top 20', value: 20 },
          { name: 'All', value: 999 },
        ],
      })
      await analyze(projectPath, { type: pkgType, top: count })
    }

    else if (action === 'search') {
      const keyword = await input({
        message: 'Enter package name to search:',
        validate: (val: string) => val.trim().length > 0 || 'Please enter a keyword',
      })
      await analyze(projectPath, { filter: keyword.trim(), top: 999 })
    }

    else if (action === 'duplicates') {
      await analyze(projectPath, { duplicates: true })
    }

    else if (action === 'unused') {
      await analyze(projectPath, { unused: true })
    }

    else if (action === 'tree') {
      const treeDepth = await select({
        message: 'Tree depth?',
        choices: [
          { name: '2 levels', value: 2 },
          { name: '3 levels', value: 3 },
          { name: '5 levels', value: 5 },
        ],
      })
      const specificPkg = await input({
        message: 'Specific package (leave empty for all):',
      })
      const treeOpt = specificPkg.trim() || true
      await analyze(projectPath, { tree: treeOpt, depth: treeDepth })
    }

    // Prompt to continue
    console.log()
    const continueAction = await confirm({
      message: 'Continue exploring?',
      default: true,
    })

    if (!continueAction) {
      console.log(chalk.gray('\n  Goodbye! 👋\n'))
      break
    }
    console.log()
  }
}

/**
 * Main analyze function
 */
export async function analyze(projectPath: string = '.', options: AnalyzeOptions = {}) {
  const {
    top = 10,
    type = 'all',
    sort = 'size',
    duplicates = false,
    tree = false,
    depth = 3,
    unused = false,
    filter,
    interactive = false,
    json = false
  } = options

  const resolvedPath = path.resolve(projectPath)

  // Check node_modules exists first (before interactive mode)
  const nodeModulesPath = path.join(resolvedPath, 'node_modules')
  if (!fs.existsSync(nodeModulesPath)) {
    console.log(chalk.red(`${figures.cross} node_modules not found at ${resolvedPath}`))
    console.log(chalk.gray(`  Run ${chalk.cyan('npm install')} or ${chalk.cyan('pnpm install')} first.\n`))
    return
  }

  // Handle interactive mode
  if (interactive) {
    await runInteractiveMode(projectPath)
    return
  }

  const spinner = ora({
    text: 'Scanning packages...',
    spinner: 'dots',
  }).start()

  const deps = getProjectDeps(resolvedPath)
  let packages = getPackagesFromNodeModules(resolvedPath, deps, spinner)

  if (packages.length === 0) {
    spinner.warn('No packages found.')
    return
  }

  // Handle unused mode
  if (unused) {
    spinner.text = 'Scanning source files...'
    const unusedDeps = findUnused(resolvedPath, packages, deps)
    spinner.succeed(`Scanned project for unused dependencies`)

    if (json) {
      console.log(JSON.stringify({ unused: unusedDeps }, null, 2))
      return
    }

    if (unusedDeps.length === 0) {
      console.log(boxen(
        chalk.green(`${figures.tick} No unused dependencies found!`),
        { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'green' }
      ))
      return
    }

    printHeader('UNUSED DEPENDENCIES', resolvedPath)

    const table = new Table({
      head: [
        chalk.cyan(''),
        chalk.cyan('Package'),
        chalk.cyan('Version'),
        chalk.cyan('Size'),
      ],
      chars: {
        'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
        'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
        'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
        'right': '│', 'right-mid': '┤', 'middle': '│',
      },
      style: { 'padding-left': 1, 'padding-right': 1 },
      colWidths: [4, 35, 12, 12],
    })

    for (const dep of unusedDeps) {
      const typeIcon = dep.type === 'prod' ? chalk.green(figures.circleFilled) : chalk.blue(figures.circleFilled)
      table.push([
        typeIcon,
        chalk.bold.yellow(dep.name),
        chalk.cyan(dep.version),
        colorSize(dep.size, formatSize(dep.size)),
      ])
    }

    console.log(table.toString())

    const totalUnusedSize = unusedDeps.reduce((sum, d) => sum + d.size, 0)
    const prodUnused = unusedDeps.filter(d => d.type === 'prod')
    const devUnused = unusedDeps.filter(d => d.type === 'dev')

    const summaryLines: string[] = []
    summaryLines.push(warnGradient(`${figures.warning} ${unusedDeps.length} potentially unused dependencies`))
    summaryLines.push('')
    if (prodUnused.length > 0) {
      summaryLines.push(`  ${chalk.green(figures.circleFilled)} ${prodUnused.length} production  ${chalk.gray(`(${formatSize(prodUnused.reduce((s, d) => s + d.size, 0))})`)}`)
    }
    if (devUnused.length > 0) {
      summaryLines.push(`  ${chalk.blue(figures.circleFilled)} ${devUnused.length} development ${chalk.gray(`(${formatSize(devUnused.reduce((s, d) => s + d.size, 0))})`)}`)
    }
    summaryLines.push('')
    summaryLines.push(chalk.red(`${figures.cross} Potential savings: ${formatSize(totalUnusedSize)}`))
    summaryLines.push('')
    summaryLines.push(chalk.gray.italic('Note: Static analysis only. Verify before removing.'))

    console.log(boxen(summaryLines.join('\n'), {
      padding: 1,
      margin: { top: 1, bottom: 1, left: 2, right: 2 },
      borderStyle: 'round',
      borderColor: 'yellow',
    }))
    return
  }

  // Handle tree mode
  if (tree) {
    const packageName = typeof tree === 'string' ? tree : null
    spinner.succeed(`Found ${packages.length} packages`)

    const treeNodes = buildTree(resolvedPath, packageName, packages, depth)

    if (json) {
      console.log(JSON.stringify({ tree: treeNodes }, null, 2))
      return
    }

    if (treeNodes.length === 0) {
      console.log(boxen(
        chalk.yellow(`${figures.warning} ${packageName ? `Package "${packageName}" not found` : 'No dependencies found'}`),
        { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'yellow' }
      ))
      return
    }

    const treeSubtitle = packageName
      ? `${resolvedPath}  ${chalk.cyan(figures.arrowRight)}  ${packageName}`
      : resolvedPath
    printHeader('DEPENDENCY TREE', treeSubtitle)

    console.log(chalk.gray(`  Max depth: ${depth}`))
    console.log()

    printTree(treeNodes)
    console.log()
    return
  }

  // Handle duplicates mode
  if (duplicates) {
    const dups = findDuplicates(packages)
    spinner.succeed(`Found ${packages.length} packages, ${dups.length} with multiple versions`)

    if (json) {
      console.log(JSON.stringify({ duplicates: dups }, null, 2))
      return
    }

    if (dups.length === 0) {
      console.log(boxen(
        chalk.green(`${figures.tick} No duplicate packages found!`),
        { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'green' }
      ))
      return
    }

    printHeader('DUPLICATE PACKAGES', resolvedPath)

    const table = new Table({
      head: [
        chalk.cyan('Package'),
        chalk.cyan('Versions'),
        chalk.cyan('Total'),
      ],
      chars: {
        'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
        'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
        'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
        'right': '│', 'right-mid': '┤', 'middle': '│',
      },
      style: { 'padding-left': 1, 'padding-right': 1 },
      colWidths: [25, 40, 12],
    })

    for (const dup of dups.slice(0, top)) {
      const versionsStr = dup.versions
        .map(v => `${chalk.cyan(v.version)} ${chalk.gray(`(${formatSize(v.size)})`)}`)
        .join(chalk.gray(' | '))
      table.push([
        chalk.bold.yellow(dup.name),
        versionsStr,
        colorSize(dup.totalSize, formatSize(dup.totalSize)),
      ])
    }

    console.log(table.toString())

    const wastedSize = dups.reduce((sum, d) => {
      const sizes = d.versions.map(v => v.size).sort((a, b) => b - a)
      return sum + sizes.slice(1).reduce((s, sz) => s + sz, 0)
    }, 0)

    const summaryLines: string[] = []
    summaryLines.push(warnGradient(`${figures.warning} ${dups.length} packages have multiple versions`))
    summaryLines.push('')
    summaryLines.push(chalk.red(`${figures.cross} Potential wasted space: ${formatSize(wastedSize)}`))

    console.log(boxen(summaryLines.join('\n'), {
      padding: 1,
      margin: { top: 1, bottom: 1, left: 2, right: 2 },
      borderStyle: 'round',
      borderColor: 'yellow',
    }))
    return
  }

  // Apply filters and sorting
  packages = filterPackages(packages, type)

  // Apply keyword filter
  if (filter) {
    const keyword = filter.toLowerCase()
    packages = packages.filter(p => p.name.toLowerCase().includes(keyword))

    if (packages.length === 0) {
      spinner.fail(`No packages found matching "${filter}"`)
      console.log(chalk.gray(`\n  Try a different keyword or use ${chalk.cyan('--type all')} to search all packages.\n`))
      return
    }
  }

  packages = sortPackages(packages, sort)

  const totalSize = packages.reduce((sum, pkg) => sum + pkg.size, 0)
  const maxSize = packages.length > 0 ? Math.max(...packages.map(p => p.size)) : 0

  const typeCounts = {
    prod: packages.filter(p => p.type === 'prod').length,
    dev: packages.filter(p => p.type === 'dev').length,
    transitive: packages.filter(p => p.type === 'transitive').length,
  }

  const typeSizes = {
    prod: packages.filter(p => p.type === 'prod').reduce((s, p) => s + p.size, 0),
    dev: packages.filter(p => p.type === 'dev').reduce((s, p) => s + p.size, 0),
    transitive: packages.filter(p => p.type === 'transitive').reduce((s, p) => s + p.size, 0),
  }

  const filterInfo: string[] = []
  if (type !== 'all') filterInfo.push(`type: ${type}`)
  if (filter) filterInfo.push(`filter: "${filter}"`)

  spinner.succeed(`Found ${packages.length} packages${filterInfo.length ? ` (${filterInfo.join(', ')})` : ''}`)

  if (json) {
    console.log(JSON.stringify({
      total: totalSize,
      count: packages.length,
      byType: { counts: typeCounts, sizes: typeSizes },
      packages: packages.slice(0, top),
    }, null, 2))
    return
  }

  // Build subtitle info (reuse filterInfo from above, add sort info)
  if (sort !== 'size') filterInfo.push(`sort: ${sort}`)
  const subtitle = filterInfo.length > 0
    ? `${resolvedPath}  ${chalk.cyan(figures.arrowRight)}  ${filterInfo.join(', ')}`
    : resolvedPath

  printHeader('DEPENDENCY SIZE ANALYSIS', subtitle)

  // Legend
  console.log(chalk.gray('  Legend: ') +
    chalk.green(figures.circleFilled + ' prod') + '  ' +
    chalk.blue(figures.circleFilled + ' dev') + '  ' +
    chalk.gray(figures.circle + ' transitive') + '    ' +
    chalk.gray('Size: ') +
    chalk.green('■') + chalk.gray('<100KB ') +
    chalk.white('■') + chalk.gray('<1MB ') +
    chalk.yellow('■') + chalk.gray('<5MB ') +
    chalk.red('■') + chalk.gray('>5MB'))
  console.log()

  // Table with better styling
  const table = new Table({
    head: [
      chalk.cyan(''),
      chalk.cyan('Package'),
      chalk.cyan('Version'),
      chalk.cyan('Size'),
      chalk.cyan(''),
    ],
    chars: {
      'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
      'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
      'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
      'right': '│', 'right-mid': '┤', 'middle': '│',
    },
    style: { 'padding-left': 1, 'padding-right': 1, head: ['cyan'] },
    colWidths: [4, 35, 12, 12, 24],
  })

  const topPackages = packages.slice(0, top)

  for (const pkg of topPackages) {
    const sizeStr = formatSize(pkg.size)
    const displayName = pkg.name.length > 32 ? pkg.name.slice(0, 29) + '...' : pkg.name
    table.push([
      getTypeIcon(pkg.type),
      chalk.bold.white(displayName),
      chalk.cyan(pkg.version),
      colorSize(pkg.size, sizeStr.padStart(10)),
      createBar(pkg.size / maxSize),
    ])
  }

  console.log(table.toString())

  // Summary box
  const summaryLines: string[] = []
  summaryLines.push(chalk.bold(`${figures.info} Total: `) + chalk.white.bold(formatSize(totalSize)) + chalk.gray(` in ${packages.length} packages`))
  summaryLines.push('')

  if (type === 'all') {
    summaryLines.push(chalk.gray('Breakdown by type:'))
    summaryLines.push(`  ${chalk.green(figures.circleFilled)} Production:  ${chalk.white(formatSize(typeSizes.prod).padStart(10))}  ${chalk.gray(`(${typeCounts.prod} pkgs)`)}`)
    summaryLines.push(`  ${chalk.blue(figures.circleFilled)} Development: ${chalk.white(formatSize(typeSizes.dev).padStart(10))}  ${chalk.gray(`(${typeCounts.dev} pkgs)`)}`)
    summaryLines.push(`  ${chalk.gray(figures.circle)} Transitive:  ${chalk.white(formatSize(typeSizes.transitive).padStart(10))}  ${chalk.gray(`(${typeCounts.transitive} pkgs)`)}`)
  }

  if (packages.length > top) {
    summaryLines.push('')
    summaryLines.push(chalk.gray(`Showing top ${top} of ${packages.length}. Use ${chalk.cyan('--top')} to see more.`))
  }

  printSummaryBox(summaryLines)
}
