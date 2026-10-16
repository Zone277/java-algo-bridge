# 资料与方案边界

核对日期：2026-09-09。

以下官方资料用于核对工具能力与技术语义。架构、分工、题目顺序、阶段划分和初始资源预算是本提示词包的设计建议，不是这些文档承诺的唯一最佳方案。

## Codex 与提示词

Subagents：当前文档说明原生 subagent 工作流、显式委派、客户端线程可见性，并提醒并行写入可能冲突。实际客户端能力仍以本机检查为准。
`https://learn.chatgpt.com/docs/agent-configuration/subagents`

AGENTS.md：项目级持久指令与分层发现规则。
`https://learn.chatgpt.com/docs/agent-configuration/agents-md`

Git worktrees：隔离工作目录与并行聊天，要求 Git 仓库；不能仅因存在子 agent 就假定自动隔离。
`https://learn.chatgpt.com/docs/environments/git-worktrees`

Codex CLI：本地目录内读写、执行与安装说明。
`https://learn.chatgpt.com/docs/codex/cli`

Prompting：目标、上下文、输出与边界。
`https://learn.chatgpt.com/docs/prompting`

## Java 与工具链

Java 21 语言规范第 4 章：基本类型、引用类型、对象和数组。
`https://docs.oracle.com/javase/specs/jls/se21/html/jls-4.html`

Vite 官方入门：React/TypeScript 模板与开发服务器。
`https://vite.dev/guide/`

Node.js 发布状态：本次核对时 24 为 LTS 分支；执行时仍应检查受支持补丁与依赖兼容性。
`https://nodejs.org/en/about/previous-releases`

Monaco Editor 官方入口：编辑器不是 Java 编译器，本站编译反馈设计来自独立 runner。
`https://microsoft.github.io/monaco-editor/`

Docker run、资源限制与安全说明：限制需要实际配置与环境验证，容器并不自动成为完备的多租户安全系统。
`https://docs.docker.com/engine/containers/run/`
`https://docs.docker.com/engine/containers/resource_constraints/`
`https://docs.docker.com/engine/security/`
`https://docs.docker.com/engine/security/rootless/tips/`

## 题目官方来源

704：`https://leetcode.com/problems/binary-search/`
283：`https://leetcode.com/problems/move-zeroes/`
977：`https://leetcode.com/problems/squares-of-a-sorted-array/`
1：`https://leetcode.com/problems/two-sum/`
20：`https://leetcode.com/problems/valid-parentheses/`
206：`https://leetcode.com/problems/reverse-linked-list/`
21：`https://leetcode.com/problems/merge-two-sorted-lists/`
104：`https://leetcode.com/problems/maximum-depth-of-binary-tree/`
70：`https://leetcode.com/problems/climbing-stairs/`
3：`https://leetcode.com/problems/longest-substring-without-repeating-characters/`
35：`https://leetcode.com/problems/search-insert-position/`
121：`https://leetcode.com/problems/best-time-to-buy-and-sell-stock/`
217：`https://leetcode.com/problems/contains-duplicate/`
53：`https://leetcode.com/problems/maximum-subarray/`
167：`https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/`
242：`https://leetcode.com/problems/valid-anagram/`
88：`https://leetcode.com/problems/merge-sorted-array/`
125：`https://leetcode.com/problems/valid-palindrome/`
169：`https://leetcode.com/problems/majority-element/`

只用上述公开题目的任务信息作为算法原型范围；不复制付费题解或图形。本站原型不代表官方产品，不声明复现官方隐藏用例、时限或复杂度验证。
