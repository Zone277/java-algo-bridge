# 阶段 05 本机运行

二十二题 704、283、977、1、20、206、21、104、70、3、35、121、217、53、167、242、88、125、169、11、209、198 共用完整学习工作台，J1—J8 微课按需进入。此工具是单用户本机教学原型，不是可公开部署的多租户安全沙箱，不得绑定局域网或公网。

## 工具准备

Node固定24.20.0（.nvmrc），npm11；本轮使用官方Windows x64 ZIP，经官方SHASUMS256校验后放在`.tools/node-v24.20.0-win-x64`，没有改全局Node。当前PowerShell可执行：

```powershell
. ./scripts/use-node.ps1
npm ci
npm run runner:build
npm exec playwright install chromium
npm run doctor
npm run dev
```

`.tools`不进入版本控制；其他机器使用自己的Node版本管理器安装.nvmrc指定版本，或从[Node官方24.20.0目录](https://nodejs.org/dist/v24.20.0/)下载对应平台归档并核对SHA256。无需在宿主机安装Java。第一次npm/镜像/浏览器准备需要网络。

Docker必须运行Linux容器并支持CPU、内存、PID、只读根与tmpfs等限制。本轮基础镜像固定为`eclipse-temurin:21.0.12_8-jdk-noble`的digest `sha256:6b104fa1f9278a75c252729cab9d230ce782b828f2269d05c187ea3fddc70adf`；项目镜像为`java-algo-bridge-runner:21.0.12`，构建文件保留不可漂移的基础digest。运行时使用 `--pull=never`，所以必须先显式执行 `npm run runner:build`，缺镜像不会后台联网拉取。阶段 05 证据见 REVIEW 和 STATUS。

本项目从检查、构建、受限探针、观察、精确清理到排障的 Docker 命令见 [DOCKER_COMMANDS.md](DOCKER_COMMANDS.md)。不要执行全局 prune。

Java JSON库Gson 2.14.0由主agent从Maven Central获取并核对.sha256，本地包含于runner/java/lib，无学生容器联网下载；SHA256 `2cbd119bf1961c28788310963dc80ba65f58cdeec1dd139c8bdb1240faa2c36f`。它用于标准JSON编解码，不用手写split解析。参考[Gson发布记录](https://github.com/google/gson/releases)与[Temurin官方镜像标签](https://hub.docker.com/_/eclipse-temurin/tags?name=21.0.12_8-jdk-noble)。

## 使用和停止

打开`http://127.0.0.1:5173`，API仅监听`127.0.0.1:3001`；浏览器通过同源`/api`代理。从课程列表选择题目，按该题 JSON 输入契约编辑完整 Solution 类并运行当前输入，或提交服务器本站测试。打印 PASS 不能通过；判定读取实际返回值、原地数组或对象图。骨架中的异常需要学生替换，初始不会预填完整解法。

从路线页进入704，依次学习方法/int[]/length/while/返回值、手算与区间推导、两处预测和参考播放、三步引导与独立练习。引导加载支架需明确确认；最终提交完整Solution类，允许不同功能正确的实现。独立草稿从骨架开始，与引导草稿分开。参考代码默认折叠，展开记答案使用。

运行结果只属于提交时源码；运行期间编辑后，旧结果不能说明新代码通过。run通过仅代表当前输入；submit通过表示通过当前13个本站测试，不是LeetCode官方评测。参考算法演示固定标注“参考解法 · 算法状态演示（非 JVM 调试）”，不追踪学生源码。下一步/上一步/播放/暂停/重置/速度/输入切换可用，预测先作答再揭示；同一快照驱动变量、区间、图和代码高亮。

206 与 21 显示平台 ListNode 定义，104 显示 TreeNode 定义；不要在学生 Solution 中重复声明平台类。链表用稳定对象 ID 检查原节点复用、字段、无环和无丢失；变量绑定与对象字段分开显示，相同值节点不会合并。104 输入采用紧凑队列层序，例如 `[1,null,2,3]` 的深度为 3。

二十二题都提供至少两个参考预测、输入切换、三段引导和独立骨架。数组、Map、栈、链表、树与调用栈、DP 和滑动窗口都读取同一不可变参考快照。演示限制与真实判题限制独立；70 的 n>30 会明确拒绝生成完整演示，但本站测试仍真实运行到 n=45。

J1—J8按钮可随时按需进入，本题必要单元带“本题前置”，返回来源课程步骤。微课是静态预测，不执行Java，不产生题目通过。桥接记录在`java-algo-bridge:v1:bridge:bridge-v1`；206草稿/进度在`java-algo-bridge:v1:progress:206:206-v1`，704原key兼容。切题先保存最新源码，执行中禁止切题；刷新恢复所选题与其分模式草稿。存储不可用时微课记录跨单元保留到本页面会话结束，刷新无法恢复。

若已有旧 dev 占用默认 5173/3001，应在原启动终端 Ctrl+C 后重新 `npm run dev`，或在新的 PowerShell 使用已验回环端口：

```powershell
. ./scripts/use-node.ps1
$env:JAB_WEB_PORT='5174'
$env:JAB_API_PORT='3002'
npm run dev
```

此时访问`http://127.0.0.1:5174`，API为127.0.0.1:3002。doctor、verify、Playwright、代理和精确Host/Origin白名单共同读取这两项进程内配置，不修改全局设置。只换端口不放开网络绑定。验收命令本轮使用上述环境变量；不要在同一对端口上同时启动dev与verify。

启动终端按Ctrl+C停止。任务有独立目录/容器和总超时，停止路径取消并清理项目任务；强制终止/断电的剩余任务在下次启动按项目归属清理。不要手动执行全局docker prune。端口占用时不要关闭不属于项目的进程；先查明占用或在项目允许的回环端口配置中统一修改前端、API及Origin白名单。

Docker CLI、daemon、镜像或必要资源限制不可用时，界面显示RUNNER_UNAVAILABLE，执行测试脚本非零退出并报告BLOCKED；不会在宿主机运行Java。源码/输入不合法返回校验错误，平台故障不包装成算法错误。

本机在 2026-09-12 启动 Docker Desktop 时曾报告 `WSL update required`。用户于 2026-09-15 明确授权后，WSL 从 2.7.13 更新到 2.7.14，Docker Linux/amd64 daemon 恢复；项目脚本本身不会自动修改该系统组件。

## 测试

```powershell
npm run check
npm run build
npm run test:runner
npm run test:e2e
npm run test:shutdown
npm run verify
```

check为lint、类型及非Docker测试；test:runner运行真实容器测试；test:e2e启真实服务；test:shutdown实际验证运行中关闭dev的容器与端口清理。verify遇到失败/缺依赖即失败，不把关键测试skip后说通过。Playwright浏览器缺失时运行上面的安装命令。

草稿及学习记录按 `java-algo-bridge:v1:progress:<problemId>:<lessonVersion>` 分题保存在当前浏览器 localStorage。刷新恢复引导/独立草稿、预测、提示、答案查看和各自通过记录；旧源码/旧课程/旧测试集通过明确标历史或要求重交。浏览器访问和动画播放不算掌握。阶段01旧 draft 可显式导入，旧条目保留；损坏数据或不可用存储会明确提示内存模式。界面恢复骨架需确认；要完全清除本机学习数据，在浏览器开发工具仅删除 `java-algo-bridge:` 开头的本站条目（不清其他站点数据）。

编辑器和worker随构建本地提供；离线完整学习流程不在本阶段宣称已验证。安装过程Playwright使用自身浏览器缓存管理机制；本轮安装日志记录了其清理旧的未引用浏览器版本，未改系统浏览器或安全配置。
