# 本机环境与阻塞

## 2026-10-23 续扩环境

Windows / PowerShell，共享同一 Git checkout。初始 `main` 与 `origin/main` 均为 `ed24ba594e6b81a533ea3966e37acb740e0a1a3b`，工作区干净，fetch 后左右差异 0/0。项目 Node 24.20.0/npm 11.19.0。Docker 初始未运行，启动现有 Docker Desktop 后确认 Engine 29.7.2、linux/x86_64；未修改全局配置或安全策略。

`npm run runner:build` PASS：固定 `java-algo-bridge-runner:21.0.12` 镜像 `sha256:d8c809aaeb354f602cceacfb68d922d44ac870ce6d8daaaac1e3bbf9a22a7aa4`（amd64），基础镜像 digest 不变。`npm run doctor` PASS：固定 Node、Docker/JDK 探针和两个回环端口可绑定。三名原生 agent 遇到客户端模型容量错误并最终中断，主 agent 串行集成；详情见 [本批验收](EXTENSION_2026-10-23.md)。以下历史检查结果保持原样，不表示本轮仍受旧阻塞影响。

## 2026-10-21 续扩环境

本轮 Windows / PowerShell 共享 checkout，初始工作区干净，main 与 origin/main 均为 2b96e56fb318208c0b51e3b0a06c988978c2575c。项目脚本选择 Node 24.20.0/npm 11.19.0。Docker 初始未运行，启动已有 Desktop 后确认 Engine 29.7.2/linux/x86_64；未安装依赖或改全局配置、安全策略。

`npm run runner:build` PASS：java-algo-bridge-runner:21.0.12，sha256:10ccc751543c22675eb6bd35fdd7ed875e4dd524a4e8bf3d6e9db0daeb0ab58a，amd64。`npm run doctor` PASS：固定 Node、Docker/JDK 探针、127.0.0.1:5173/3001 绑定。完整证据与最终清理见 [本批验收](EXTENSION_2026-10-21.md)。以下历史环境记录保留，不代表本轮仍然阻塞。

检查日期：2026-09-09（Asia/Shanghai）。证据来自本轮PowerShell实际命令及原生subagent只读回报；下表是结果摘要，不是未来doctor输出。阶段00不安装依赖，不执行学生源码。

| 检查 / 实际命令 | 实际结果 | 状态与影响 |
|---|---|---|
| Get-Location；rg --files；Get-ChildItem -Force | `<PROJECT_ROOT>`；原有13文件：AGENTS、README、START_HERE、docs两份、prompts八份；无业务包 | PASS，已有规范包，不是空目录 |
| git --version | git version 2.51.0.windows.2 | PASS，CLI可用 |
| git status --short --branch；git rev-parse --show-toplevel；git worktree list | 三次均fatal: not a git repository | BLOCKED（Git状态/差异/提交）；未初始化仓库、未创建worktree；不阻塞文档创建 |
| Get-CimInstance Win32_OperatingSystem | Windows 11 专业版10.0.22631，64位 | PASS |
| Get-CimInstance Win32_Processor | AMD Ryzen 7 7735H with Radeon Graphics，Architecture=9 (x64) | PASS；不代表Docker内架构已核验 |
| node --version；npm --version | v22.13.1；10.9.2 | Node目标版本检查FAIL；阶段01 Node24工具链验收BLOCKED |
| Get-Command node,npm,git | Node/npm位于D:\JavaData\nodejs；Git位于C:\Program Files\Git\cmd | PASS（命令可调用），未更换版本 |
| docker --version；docker info --format '{{json .}}' | 均命令无法识别，没有调用到daemon | BLOCKED，Docker当前不可调用 |
| B：Get-Command docker；Get-Service '*docker*'；Test-Path标准Docker CLI/Desktop及ProgramData目录 | 无CLI、服务匹配0、标准路径不存在 | BLOCKED；未穷举自定义路径，不断言机器绝无Docker |
| B：Get-Command wsl | C:\windows\system32\wsl.exe存在 | PASS（文件可定位）；WSL发行版/虚拟化能力NOT_RUN |
| Get-NetTCPConnection -State Listen，筛选3001/5173 | 无监听，占用数0 | PASS，仅检查时刻有效；不关闭任何进程 |
| TcpListener分别Start/Stop于127.0.0.1:5173和:3001 | 两个BIND_PASS，finally均Stop | PASS，实际短暂绑定可用；没有留下服务 |
| Get-Acl . | 当前用户拥有FullControl，存在Modify ACL | PASS（权限检查）；本轮六文档创建成功也验证写入 |
| Get-ExecutionPolicy -List | LocalMachine=RemoteSigned，其余Undefined | PASS（只读检查）；未改执行策略/安全设置 |
| 客户端权限与subagent | 提供exec、apply_patch、原生collaboration；主+3工作agent，全部同一目录 | PASS；共享文件系统，无隔离worktree；工作agent只读 |
| Get-ChildItem -File -Recurse \| Get-FileHash -Algorithm SHA256 | 写入前保存13个已有文件哈希，用于交付核对 | PASS；不覆盖原资料 |

Docker daemon、Linux容器模式、JDK21镜像tag/digest/ID、容器CPU架构、cgroup实际配额、javac/java运行和清理：BLOCKED。未调用宿主JDK作为替代。包依赖/锁文件、浏览器安装、npm check/build、真实runner、e2e、离线、应用启动：NOT_RUN，本阶段尚无对应实现。

规范反例检查PASS：主agent实际运行`node -e`，以`Buffer.byteLength(JSON.stringify(...))`测量10000个-2147483648的int-array输出为120031字节，5000节点list-graph输出为227825字节。原拟65536字节协议不足，已修正为1048576字节/用例和16777216字节/任务。这是Node JSON容量探测，不是Java执行或性能验收。

没有读取或输出敏感环境变量；未测试提权、安装Docker或修改虚拟化设置。客户端能执行命令/写项目文件不等于已经获系统安装权限。没有全局配置修改，没有远程推送。

阶段01前置：在已授权方式下提供Node24并核验具体补丁/npm，提供可调用的Docker CLI及daemon；随后doctor验证固定JDK21 Linux amd64镜像和资源约束。若Docker仍缺失，可开发静态/非执行部分，但真实执行验收继续BLOCKED，不能推进需704/206真实闭环的扩题门禁。端口启动前必须重查，冲突改用明确回环端口，不能杀无关进程。

本轮探测中的失败如实保留：Git三条命令非仓库失败、Docker两条命令不可识别；B首次猜测prompts/01-foundation.md不存在，随后rg定位并成功读取01-foundation-runner.md。PowerShell批量命令最终退出码不代表其中每条成功，以上按具体输出分别判定。

## 阶段01重新检查（2026-09-09）

以上为00历史快照，不再代表当前Docker状态。实际复查：

| 命令 | 实际结果 |
|---|---|
| node --version / npm --version（原PATH） | 22.13.1 / 10.9.2，未改全局安装 |
| 项目.tools内node --version / npm --version | 24.20.0 / 11.19.0；官方ZIP与SHASUMS256匹配，PASS |
| docker version | Client/Engine29.7.2；Docker Desktop4.90.0，Server linux/amd64，PASS |
| docker info --format | linux x86_64 cgroup2，PASS |
| docker pull eclipse-temurin:21.0.12_8-jdk-noble | 成功；digest=sha256:6b104fa1f9278a75c252729cab9d230ce782b828f2269d05c187ea3fddc70adf |
| docker image inspect | amd64，镜像ID与上述digest一致 |
| 受限docker run ... java -version | Temurin21.0.12+8-LTS，PASS（真实容器，无宿主Java） |
| npm install / npm ls --depth=0 | workspaces依赖已安装，package-lock.json已生成；固定版本见锁文件 |
| npm audit --audit-level=low（修订覆盖版本后） | found 0 vulnerabilities，PASS |
| npm exec playwright install chromium | Chromium153.0.8010.12 / Playwright revision1243及headless shell安装成功 |
| git status --short --branch | 仍非Git仓库；未初始化/提交/推送 |

真实Java分类、资源实施及浏览器结果在STAGE01_ACCEPTANCE记录。下载/安装由主agent统一执行，没有关闭防护或全局变更。Playwright自身安装器清理旧未引用缓存（chromium1194、headless1194、firefox1495、webkit2215），这发生在其默认用户缓存管理流程；没有删除项目外业务文件或系统浏览器。

## 阶段02复查（2026-09-09）

仍为Windows/PowerShell共享当前项目目录，无Git仓库；Node24.20.0/npm11.19.0由项目脚本前置，Docker Engine29.7.2及固定Java21项目镜像可用。阶段02doctor实际检查镜像、回环端口可绑定、CLI/daemon；结果见stage02-verify.log。两个新增本地workspace由主agentnpm install链接，外部依赖版本未扩展、audit零漏洞；没有改全局配置或安全保护。

真实参考差分和浏览器编译执行具备条件，无当前阶段运行环境阻塞。其他OS及断电故障注入仍NOT_RUN；与阶段02核心闭环结果分开记录。

## 阶段03重新检查（2026-09-09）

Node24.20.0/npm11.19.0与Docker可用，目录仍共享且无Git仓库。默认doctor端口检测FAIL：5173/3001由已有本项目scripts/dev.ts子进程占用（父PID24568，初始API/Web子PID27644/27220），没有关闭它们。主agent统一可配置回环端口后，5174/3002 doctor全部PASS，日志stage03-doctor.log。该冲突已绕开，不是Java执行阻塞。

新可信ListNode适配镜像实际build PASS：java-algo-bridge-runner:21.0.12-stage03，Image ID sha256:c41ece63a5f64b61f7c282db9aee1635eaa674fd903270d0623597722f9f681e，amd64；基础Temurin digest与Gson校验不变。构建日志stage03-runner-build.log。npm install --package-lock-only --ignore-scripts同步导出元数据，audit零漏洞，无新外部依赖或全局修改。

## 阶段04重新检查（2026-09-11）

当前目录已是 Git 仓库：分支 `main`，HEAD `6eeeecead9ff716d7d0016c48aad01e545bde0ae`，仅一个共享 worktree 位于项目目录；工作树已有跨阶段未提交改动，本轮不重置、提交或推送。三个原生 subagent 与主 agent 共享该 checkout，按路径互斥写入。

项目 Node 24.20.0/npm 11.19.0 可用。阶段04首次基线时 Docker Desktop 因 `C:\Users\50199\AppData\Local\Docker\run\sailor-ingest.sock` 陈旧 socket 无法重命名而启动失败；核对精确进程和目录后停止对应 Docker Desktop 进程，将 `run` 原子改名保留为 `run.stale-stage04-20260911T2105`，随后重启 Docker Desktop。没有删除不明目录、修改全局配置或关闭安全保护。Engine 29.7.2 恢复后先重新跑704/206基线，全部 PASS 才开始扩题。

阶段04镜像 `java-algo-bridge-runner:21.0.12-stage04` 实际构建并检查为 linux/amd64，Image ID `sha256:8881c6d654da2538b2e2e2299fd7eb524ee9d80b4d28dae2e8dc846e5376f12d`；固定 Temurin 基础 digest和 Gson 校验不变。最终 `npm run verify` 的 doctor 在 127.0.0.1:5174/3002 通过，200 项非 Docker、64 项真实 Docker、17 项真实浏览器和 shutdown 均 PASS。结束后另单独重跑 doctor 与 shutdown，项目容器列表、`jab-run-*` 目录为空，两端口关闭。其他操作系统、完整离线重装和断电故障注入仍 NOT_RUN。

## 阶段05重新检查（2026-09-12）

当前为 Windows 11 / PowerShell，共享单一 Git checkout，分支 `main`，审查基线 HEAD `9b2fa3b0e4eca651de111f4e7ac02da8cd175e89`。项目 Node 24.20.0、npm 11.19.0 可用；`npm ci --ignore-scripts` 从修复后的 lock 干净安装 237 packages，audit 0 vulnerabilities。5173/3001 在 doctor 检查时可绑定，前后端仍只监听 127.0.0.1。

Docker CLI 29.7.2 可调用，但 daemon 返回 `Docker Desktop is unable to start`；host backend 日志明确记录 Linux/WSL engine 前置为 `WSL update required`。旧实现会把 exit 0 + 空 OSType 误报为 stale cleanup 失败；修复后 doctor 准确返回 `DOCKER_DAEMON_UNAVAILABLE`。没有调用宿主 Java、没有自动拉取缺失项目镜像、没有修改 WSL/虚拟化/防护设置。

非 Docker门禁为 33 文件 / 206 测试 PASS，web/API build PASS，390px 专项 Playwright PASS。用户于 2026-09-15 明确授权 `wsl --update`，WSL 2.7.13 更新为 2.7.14；重启后 Docker Engine 29.7.2 恢复为 linux/amd64、cgroup v2。固定镜像 `java-algo-bridge-runner:21.0.12` 构建 PASS，ID `sha256:2e21b5062179c6fde7d2ff77b75f1f13348ca8651f258ac2ae20947d19124ff7`。64 项真实 runner、19 项真实浏览器、shutdown 和最终 verify 全部 PASS；结束后项目标签容器、`jab-run-*` 临时目录及 5173/3001 监听均为空。

## 续扩环境检查（2026-10-18）

当前 Windows / PowerShell，项目已有共享 Git checkout，`main` 初始干净，基线 `233cc109727c21815e6e892c9c805c9d8cc9a9f8`；远程为 Zone277/java-algo-bridge。项目脚本选择 Node v24.20.0/npm 11.19.0。Docker Desktop 原先未启动，通过现有桌面入口启动后 `docker info` 确认为 Engine 29.7.2、linux/x86_64；没有修改全局设置、WSL、执行策略或安全保护。原生 agent 按互斥课程目录共享同一 checkout，文件写入权限正常。

本批固定 runner 镜像实际构建 ID 为 `sha256:11dbca74efe1222b7fb23e0e33dde77102c2108e72c9148ec43d3bbd31cfcff2`，linux/amd64；JDK 基础 digest、Gson 与资源限制保持。实际端口、真实执行、浏览器与清理验收见 `EXTENSION_2026-10-18.md`，其中未运行项明确标记 NOT_RUN。GitHub 采用现有凭据存储，凭据不进入项目文件；本轮用户已明确授权提交并推送。

## 续扩环境检查（2026-10-20）

Windows / PowerShell，main 初始干净，基线 27f3dca1ec4df5c8f2a32da3463fb92121936b4e，远程 Zone277/java-algo-bridge；fetch 成功。项目 Node24.20.0/npm11.19.0；Docker Desktop 原先未运行，通过现有桌面入口启动后 Engine29.7.2/linux/x86_64 恢复，未修改全局设置。原生 agent 共享单 checkout，按三个课程目录划分权限。

实际构建 runner 镜像 ID 为 `sha256:91665eed2c169109468aadc084dde4d28e9991ed7e2e6d1cc6a22d7fdc80e3f1`，amd64；固定 Java21 基础 digest、Gson和限制保持。doctor 已确认127.0.0.1:5173/3001可绑定、真实Docker/JDK可用。最终验收见 EXTENSION_2026-10-20.md。

最终全量回归与探针清理修复后专项均通过，资源独立复查为项目容器0/任务目录0/端口0。完整命令与初次残留情况见 ACCEPTANCE.md 与 EXTENSION_2026-10-20.md。
