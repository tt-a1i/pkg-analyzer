# pkg-analyzer

[![npm version](https://img.shields.io/npm/v/@tt-a1i/pkg-analyzer.svg)](https://www.npmjs.com/package/@tt-a1i/pkg-analyzer)
[![CI](https://github.com/tt-a1i/pkg-analyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/tt-a1i/pkg-analyzer/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/tt-a1i/pkg-analyzer/graph/badge.svg)](https://codecov.io/gh/tt-a1i/pkg-analyzer)
[![Node.js](https://img.shields.io/node/v/@tt-a1i/pkg-analyzer.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[English](./README.md) | 中文

一个强大的 CLI 工具，用于分析 node_modules 依赖 - 可视化包大小、查找重复包、检测未使用的依赖，并导出报告供 AI 优化建议。

## 特性

- **大小分析** - 可视化包大小，带彩色进度条和图标
- **重复检测** - 查找存在多个版本的包
- **未使用检测** - 识别可能未使用的依赖
- **依赖树** - 查看层级依赖关系
- **过期检查** - 显示过期的依赖版本
- **安全审计** - 运行 npm audit 安全检查
- **项目对比** - 对比两个项目的依赖差异
- **交互模式** - 菜单驱动的界面，方便探索
- **导出报告** - 导出为 JSON/Markdown 供 AI 分析
- **剪贴板复制** - 直接复制报告到剪贴板
- **多包管理器** - 支持 npm、yarn 和 pnpm

## 安装

```bash
# npm
npm install -g @tt-a1i/pkg-analyzer

# pnpm
pnpm add -g @tt-a1i/pkg-analyzer

# yarn
yarn global add @tt-a1i/pkg-analyzer

# 或者直接使用 npx（无需安装）
npx @tt-a1i/pkg-analyzer
```

## 快速开始

```bash
# 分析当前项目
pkg-analyzer

# 交互模式
pkg-analyzer -i

# 导出报告供 AI 分析
pkg-analyzer --copy
```

## 使用方法

```bash
pkg-analyzer [路径] [选项]
```

### 选项

| 选项 | 简写 | 说明 |
|------|------|------|
| `--top <n>` | `-n` | 显示最大的 N 个包（默认：10） |
| `--type <类型>` | `-t` | 按类型过滤：prod、dev、transitive、all |
| `--sort <字段>` | `-s` | 排序：size、name、type |
| `--duplicates` | `-d` | 显示重复的包 |
| `--unused` | `-u` | 检测未使用的依赖 |
| `--outdated` | `-o` | 显示过期的依赖 |
| `--security` | | 运行安全审计 |
| `--compare <路径>` | | 与另一个项目对比 |
| `--why <包名>` | | 显示为什么安装了某个包 |
| `--tree [包名]` | | 显示依赖树 |
| `--depth <n>` | | 树视图最大深度（默认：3） |
| `--filter <关键词>` | `-f` | 按名称过滤包 |
| `--interactive` | `-i` | 交互模式 |
| `--export <文件>` | `-e` | 导出到文件（.json 或 .md） |
| `--copy` | `-c` | 复制报告到剪贴板 |
| `--json` | | 输出为 JSON |

## 示例

### 基本分析

```bash
# 显示最大的 20 个包
pkg-analyzer --top 20

# 只显示生产依赖
pkg-analyzer --type prod

# 按名称排序
pkg-analyzer --sort name
```

### 查找问题

```bash
# 查找重复的包（多个版本）
pkg-analyzer --duplicates

# 查找未使用的依赖
pkg-analyzer --unused

# 搜索特定的包
pkg-analyzer --filter react
```

### 更新与安全

```bash
# 显示过期的依赖
pkg-analyzer --outdated

# 运行安全审计
pkg-analyzer --security

# 与另一个项目对比
pkg-analyzer --compare ../other-project
```

### 包安装原因

```bash
# 查找为什么安装了某个包
pkg-analyzer --why lodash

# 检查包是直接依赖还是传递依赖
pkg-analyzer --why ansi-styles
```

### 依赖树

```bash
# 显示完整依赖树
pkg-analyzer --tree

# 显示特定包的依赖树
pkg-analyzer --tree lodash

# 限制树的深度
pkg-analyzer --tree --depth 2
```

### 导出与分享

```bash
# 复制报告到剪贴板（粘贴给 AI 获取建议）
pkg-analyzer --copy

# 导出为 Markdown 文件
pkg-analyzer --export report.md

# 导出为 JSON 文件
pkg-analyzer --export report.json
```

### 交互模式

```bash
pkg-analyzer -i
```

交互模式提供菜单驱动的界面：
- 按大小分析顶级包
- 按依赖类型过滤
- 按名称搜索包
- 查找重复项
- 检测未使用的依赖
- 查看依赖树

## AI 辅助优化

导出报告并粘贴给你喜欢的 AI 助手获取优化建议：

```bash
pkg-analyzer --copy
```

导出的 Markdown 包含：
- 完整的依赖分析
- 重复的包和浪费的空间
- 可能未使用的依赖
- 现成的 AI 提示词，请求优化建议

## 包管理器支持

| 包管理器 | 锁文件 | 支持 |
|----------|--------|------|
| npm | package-lock.json | ✅ |
| yarn | yarn.lock | ✅ |
| pnpm | pnpm-lock.yaml | ✅ |

## 系统要求

- Node.js >= 20

## 贡献

欢迎贡献！请随时提交 Pull Request。

## 许可证

MIT © [tt-a1i](https://github.com/tt-a1i)
