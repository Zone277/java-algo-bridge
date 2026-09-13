# Java Algo Bridge

一款在 Windows 本机运行的中文 Java 算法学习工具，帮助具备少量 C 和数据结构基础的学习者，把已有知识平稳迁移到 Java 编程与算法实践。

## 核心特点

- 十道循序渐进的经典算法题，覆盖数组、哈希、栈、链表、二叉树、动态规划和滑动窗口。
- J1—J8 Java 基础桥接微课，集中讲解语法差异、数组、集合、字符串、引用和常用数据结构。
- 从语法准备、问题理解到引导编写和独立挑战的完整学习流程。
- 预置参考算法的状态演示，帮助理解变量、数组、栈、链表和树在每一步的变化。
- Monaco Java 编辑器，以及基于 Docker 和 Java 21 的真实编译、运行与本站测试。
- 草稿和学习进度保存在当前浏览器中，可在下次打开时继续学习。

## 课程内容

| 题号 | 主题 | Java 学习重点 | 算法重点 |
| --- | --- | --- | --- |
| 704 | 二分查找 | 数组、循环与整数下标 | 有序区间收缩 |
| 283 | 移动零 | 原地修改数组 | 双指针 |
| 977 | 有序数组的平方 | 新数组与边界处理 | 相向双指针 |
| 1 | 两数之和 | `HashMap` 的使用 | 哈希查找 |
| 20 | 有效的括号 | 字符与 `Deque` | 栈匹配 |
| 206 | 反转链表 | 引用变量与 `ListNode` | 指针关系重连 |
| 21 | 合并两个有序链表 | 对象身份与链表操作 | 双链表归并 |
| 104 | 二叉树的最大深度 | `TreeNode` 与递归 | 深度优先遍历 |
| 70 | 爬楼梯 | 方法、变量和边界条件 | 动态规划 |
| 3 | 无重复字符的最长子串 | 字符串与集合 | 滑动窗口 |

## 环境要求

- Windows 11，或支持 WSL 2 的 Windows 10
- Node.js 24.20.x 和 npm 11
- Docker Desktop，使用 WSL 2 Linux 容器

不需要在 Windows 宿主机安装 JDK。学生代码只会在受限制的一次性 Java 21 容器中编译和运行。

开始前可在 PowerShell 中确认 WSL 与 Docker 状态：

```powershell
wsl --version
docker version
```

两条命令都应正常返回版本信息，并且 Docker Desktop 应处于运行状态。

## 快速开始

在 PowerShell 中执行：

```powershell
git clone https://github.com/Zone277/java-algo-bridge.git
cd java-algo-bridge
npm ci
npm run runner:build
npm run doctor
npm run dev
```

启动成功后访问 [http://127.0.0.1:5173](http://127.0.0.1:5173)。按 `Ctrl+C` 可停止前后端服务。

## 学习流程

1. 从课程列表选择题目，先补齐相关 Java 语法知识。
2. 阅读问题并完成状态预测，建立对算法过程的直觉。
3. 播放参考算法的状态演示，观察关键数据结构如何变化。
4. 在引导模式中逐步完成代码，再进入独立模式重新实现。
5. 运行自定义输入，并提交该题的本站测试集。

参考答案默认折叠。参考演示展示的是预置参考算法的状态，不是学生代码的 JVM 单步调试轨迹。

## 运行与判定

编辑器接收完整的 `Solution` 类：

- “运行输入”只检查当前输入。
- “提交本站测试”运行该题的本地测试集。
- 通过结果仅表示通过本站测试，不代表通过 LeetCode 或其他外部平台的官方评测。
- 206 和 21 由平台提供 `ListNode`，104 由平台提供 `TreeNode`，学生代码不应重复声明这些类。
- 链表题会检查原节点身份和连接关系，不只比较节点值。
- 283 检查调用后的原数组；1 接受合法索引的任意顺序；104 使用紧凑层序 `null` 语义；3 检查连续子串。

Docker 或固定运行镜像不可用时，应用会返回 `RUNNER_UNAVAILABLE`，不会退回到宿主机直接执行学生 Java 源码。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run doctor` | 检查 Node.js、Docker、运行镜像和端口环境 |
| `npm run runner:build` | 构建固定的 Java 21 学生运行镜像 |
| `npm run dev` | 启动本地网页与 API 服务 |
| `npm run typecheck` | 检查 TypeScript 类型 |
| `npm run build` | 构建生产资源 |

## 端口配置

网页默认监听 `127.0.0.1:5173`，API 默认监听 `127.0.0.1:3001`。如果端口被占用，可在当前 PowerShell 会话中指定其他回环端口：

```powershell
$env:JAB_WEB_PORT='5174'
$env:JAB_API_PORT='3002'
npm run dev
```

随后访问 [http://127.0.0.1:5174](http://127.0.0.1:5174)。

## 常见问题

### `wsl --version` 或 Docker Desktop 启动失败

先安装 Windows 更新，在管理员 PowerShell 中执行 `wsl --update`，重启 Windows 后再启动 Docker Desktop。确认 Docker Desktop 使用 WSL 2 后端和 Linux 容器，然后重新运行 `docker version`。

### 显示 `RUNNER_UNAVAILABLE`

确认 Docker Desktop 已启动，再运行：

```powershell
npm run runner:build
npm run doctor
```

如果 `doctor` 仍然失败，请根据其输出检查 Docker 服务、固定运行镜像或端口占用情况。

### 网页或 API 端口被占用

关闭占用端口的程序，或按照“端口配置”一节设置 `JAB_WEB_PORT` 和 `JAB_API_PORT`。

### 如何清除学习记录

草稿、预测结果、提示使用和通过记录保存在当前浏览器的 `localStorage` 中。可在浏览器站点数据设置中删除 `127.0.0.1` 对应数据；该操作会同时清除所有本地学习记录。

## 安全边界与当前限制

本项目面向单用户本机学习，只监听回环地址。它不是面向公网部署的多租户判题平台，也不应直接开放到局域网或互联网。

学生任务使用独立临时目录和一次性容器。容器禁用网络、以非 root 用户运行，并限制 CPU、内存、进程数、输出和执行时间。请勿使用 `docker system prune` 等全局清理命令处理本项目。

当前版本的课程内容固定为上述十题，学习数据只保存在当前浏览器中；更换浏览器、清除站点数据或重新安装系统后不会自动同步。算法状态演示仅适用于内置参考解法，不会为任意 Java 程序生成执行轨迹。
