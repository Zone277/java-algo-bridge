# Java Algo Bridge

Java Algo Bridge 是一个在 Windows 本机运行的中文 Java 算法学习工具，适合接触过 C 和数据结构、但缺少 Java 编码实践的学习者。

当前提供：

- 二分查找（704）和反转链表（206）的完整学习流程。
- J1—J8 Java 基础桥接微课。
- 算法状态演示、预测练习、分级提示、引导编写和独立编写。
- Monaco Java 编辑器，以及基于 Docker 和 Java 21 的真实编译、运行与本站测试。
- 浏览器本地草稿和学习进度恢复。

## 环境要求

- Windows 11 或受支持的 Windows 10
- Node.js 24.20.x、npm 11
- Docker Desktop，使用 WSL 2 Linux 容器

不需要在 Windows 宿主机安装 JDK；学生代码在受限制的一次性 Java 21 容器中运行。

## 安装与启动

在 PowerShell 中进入项目目录：

```powershell
npm ci
npm run runner:build
npm run doctor
npm run dev
```

启动成功后访问：

```text
http://127.0.0.1:5173
```

API 默认只监听 `127.0.0.1:3001`。按 `Ctrl+C` 停止前后端服务。

如果默认端口被占用，可以为当前 PowerShell 会话指定其他回环端口：

```powershell
$env:JAB_WEB_PORT='5174'
$env:JAB_API_PORT='3002'
npm run dev
```

随后访问 `http://127.0.0.1:5174`。

## 使用说明

从课程列表选择题目，依次完成语法准备、问题理解、状态预测、参考演示、引导编写和独立挑战。

编辑器接收完整的 `Solution` 类：

- “运行输入”只检查当前输入。
- “提交本站测试”运行该题的本地测试集。
- 通过结果仅表示通过本站测试，不代表通过外部平台官方评测。
- 参考演示展示预置参考算法的状态，不是学生代码的 JVM 调试轨迹。

反转链表题由平台提供 `ListNode`，学生代码不应重复声明该类。判定会检查原节点身份和 `next` 连接关系，不只比较节点值。

草稿、预测结果、提示使用和通过记录保存在当前浏览器的 `localStorage` 中。清除浏览器站点数据会同时清除这些记录。

Docker 或固定运行镜像不可用时，应用会返回 `RUNNER_UNAVAILABLE`，不会退回到宿主机直接执行学生 Java 源码。

## 安全边界

本项目面向单用户本机学习，只监听回环地址。它不是面向公网部署的多租户判题平台，也不应直接开放到局域网或互联网。

学生任务使用独立临时目录和一次性容器，容器禁用网络、以非 root 用户运行，并限制 CPU、内存、进程数、输出和执行时间。请勿使用 `docker system prune` 等全局清理命令处理本项目。
