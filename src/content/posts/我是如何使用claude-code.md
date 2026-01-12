---
title: 我是如何使用 Claude Code
pubDate: 2026-01-12
categories: [AI]
description: 分享我使用 Claude Code 的经验和心得
draft: false
---

## 安装

```bash
# npm
npm install -g @anthropic-ai/claude-code

# pnpm
pnpm add -g @anthropic-ai/claude-code
```

## 使用技巧

### 1. Hooks

cc 提供了一系列 [hooks](https://docs.anthropic.com/en/docs/claude-code/hooks)，我主要使用 `Notification` 和 `Stop` 两种。

**使用场景**：运行复杂或耗时任务时，我常常会切换到其他页面。如果 cc 中途需要交互（如授权确认），而我没有及时切回，任务就会被阻塞。

**解决方案**：设置两个 hook

- cc 等待输入时，发送通知
- cc 任务结束时，播放提示音并发送通知

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "terminal-notifier -title \"🔔 Claude Code\" -message \"Claude needs your input\""
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "afplay /System/Library/Sounds/Glass.aiff"
          },
          {
            "type": "command",
            "command": "terminal-notifier -title \"✅ Claude Code\" -message \"The task has been completed\""
          }
        ]
      }
    ]
  }
}
```

### 2. Plan Mode

这是一个很实用的功能。在实现具体功能前，先用 Plan Mode 与 AI 讨论方案，确认后再执行，避免返工。

### 3. /add-dir

当基于某个 codebase 分析问题时，如果需要引入其他目录的代码或日志，使用 `/add-dir` 可以在不退出对话的情况下快速接入。

### 4. MCP

MCP 刚兴起时，我配置了很多 server，导致 context 占用过多。后来我将 MCP 全部移除，只在特定目录下按需开启（workspace scope）。

目前使用最多的是 Confluence MCP——我们的 wiki 和 jira case 都在 Confluence 上，用它来查 wiki、回 case、总结文档、写 wiki 都很方便。

### 5. Skills

Skills 概念推出后，我把大部分工具转成了 skills，并用 git 维护了一个私有 marketplace。由于渐进式披露机制，skills 占用的 context 极小，所以我按 user scope 全局加载。

#### 什么时候需要 Skills

1. **重复 prompt**：相似任务的 prompt 可以封装成 skill，作为"说明书"提供统一做法。例如：润色博客的 skill。

2. **封装脚本**：cc 具备执行 CLI 的能力，只需在 skill 中说明脚本的用法和触发条件，cc 会在需要时自动调用。例如：
   - 将 Gemini Image API 封装成 skill，实现图片生成
   - 将 Intune API 调用封装成 skill，方便查询的同时，AI 还能以友好格式总结响应

3. **核心价值**：扩展 cc 不具备的能力（如生成图片），或简化繁杂 API 的调用与结果分析（如 MS Graph API）。

#### Skills vs MCP

两者的重叠部分是 function call，选择依据：

| 场景 | 推荐方案 |
|------|----------|
| 脚本简单、无第三方依赖 | Skills |
| 返回数据量大、需预处理或过滤 | Skills（可落盘或过滤） |
| 功能完整的远程mcp | MCP（如 Confluence） |

### 6. Task 即 Directory

这是我使用 cc 时产生的一个想法。

cc 以目录作为 session scope，提供 `/resume` 等功能，MCP 配置和日志也都基于目录。换言之，**目录就是 cc 的上下文**——在哪个目录使用 cc，就是让它加载该目录下的代码、MCP 配置、历史记录等。

由此引申出一种工作流：

1. 为每个 task 创建独立目录
2. 配置所需的上下文（MCP、agents.md 等）
3. 用软链接引入相关 codebase
4. 进入目录的一瞬间，cc 就"装载"了完整的 task 上下文
5. Task 完成后，可删除目录，或通过检索 cc log 归档重要对话

这个思路或许可以做成一个工具。
