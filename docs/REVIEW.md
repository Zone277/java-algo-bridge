# 阶段 05 独立审查

审查开始日期：2026-09-12；真实验收完成日期：2026-09-15。审查基线为 `main@9b2fa3b0`。三个原生 subagent 共用同一 checkout，先只读审查，全部交付问题后再由主 agent 按互斥路径开放修复窗口。下表的“实际”描述审查时基线；“处理”描述最终实现。

## A：教学与算法正确性

| 严重度 | 文件位置 | 复现方法 | 预期 | 实际 | 修复建议与处理 |
|---|---|---|---|---|---|
| P1 | `packages/curriculum/problems/104/model.ts` 的递归变量快照 | 用 `{root:[1]}` 生成轨迹，查看空孩子帧的 `check-null` | `root=null`、栈顶 `nodeId=null` 与判定一致 | 变量表仍显示整棵树根 `t0` | 已修复：`root` 读取活动栈顶帧；新增逐快照绑定测试 |
| P2 | `problems/1/model.ts`、`problems/20/model.ts` 的初始快照 | 查看执行 `new HashMap` / `new ArrayDeque` 前的结构 | 对象创建语句执行后才出现空 Map/栈 | 文案说尚未创建，结构区已出现对象 | 已修复：结构生命周期随 initialized 标记；新增初始/创建后测试 |
| P2 | `packages/curriculum/bridge/content.ts` J2 | 阅读“变量要先初始化”和 `==` 说明 | 区分局部变量明确赋值、字段/数组默认值；区分基本值比较和引用值比较 | 文案过宽，可能误导为所有变量都须显式初始化、`==` 可比较对象内容 | 已修复并补充 `String.equals` |
| P2 | `problems/1/content.ts` 与 `bridge/content.ts` | 比较题 1 的 prerequisites 与 `bridgePrerequisites['1']` | 两处都包含 J3 | 页面使用的课程字段遗漏 J3 | 已补 J3，并增加一致性测试 |
| P3 | `packages/curriculum/bridge/content.ts` J1 | 从新增八题进入 J1 | 说明 runner 按当前题调用规定方法 | 仍只写 `search` / `reverseList` | 已改为与题号无关的准确表述 |

审查者另用固定种子 `5052026` 生成 300 条十题轨迹、11,531 个不可变快照，核对终态、两个动态预测点、步骤映射、104 活动参数及 1/20 对象生命周期，未发现其他分叉。704、206、3 的关键不变量以及 283 原数组、题 1 合法索引顺序、206/21 身份结构、104 紧凑 null、题 3 连续子串语义均重新核对。

## B：Java 执行、安全限制和资源清理

| 严重度 | 文件位置 | 复现方法 | 预期 | 实际 | 修复建议与处理 |
|---|---|---|---|---|---|
| P1 | 根 `package.json` / lock、测试配置和验收脚本 | `npm run verify`、`npm run test:runner`、`npm ls` | 干净 `npm ci` 后可直接执行门禁 | 脚本缺失，测试依赖显示 extraneous；测试/文档又被本地 exclude 隐藏 | 已恢复脚本及精确依赖并重建锁文件；移除仓库私有 exclude 中对项目资产的隐藏规则；最终纳入本地提交 |
| P1 | `apps/api/src/runner.ts` availability/recoverStale | 首次扫描遇到年轻遗留物或暂时 ps 失败，超过 120 秒后重试 | 到期资源可重扫，暂时故障可恢复 | resolved/rejected recovery Promise 永久缓存到进程重启 | 已修复：每个过期健康缓存周期重扫，失败后可重试；假 Docker 反例通过 |
| P2 | `runner.ts` Docker info 探测 | daemon 故障时 CLI exit 0、stdout 空、stderr 报错 | 只有明确 `linux` 才继续 | 空 stdout 被当成可用，随后误报 stale cleanup 失败 | 已修复并测试：空输出为 `DOCKER_DAEMON_UNAVAILABLE`，非 Linux 单独拒绝 |
| P2 | `runner.ts`、`scripts/runner-build.ts`、runner README | 比较运行标签与阶段 04 文档；本地缺镜像时执行 | 构建/运行引用同一固定标签，缺镜像不联网 | 文档与运行标签漂移，`docker run` 未禁止自动 pull | 已统一固定补丁标签 `java-algo-bridge-runner:21.0.12`；探针和任务都传 `--pull=never` |
| P2 | `runner.ts` availability/stale/execute | 让 info/inspect/rm/probe 变慢或在可用性检查时取消 | 队列与所有前置命令共享 30 秒绝对截止；取消及时生效 | 可用性和 stale 扫描各用独立时限，总请求可超预算 | 已把 signal 和绝对 deadline 传入所有前置 Docker 命令；取消反例通过；清理仍用独立 5 秒预算 |
| P2 | `runner.ts close()` | 容器存在时让 `docker rm -f` 失败 | 退出明确报告残留，不能静默成功 | close 丢弃 remove 的 false 结果 | 已在 5 秒边界收集失败名称并抛出 `RUNNER_CLOSE_CLEANUP_FAILED`；注入测试通过 |
| P2 | `runner/java/Supervisor.java`、`Adapter.java`、`runner.ts` | 学生捕获 PID 上限或 tmpfs 写满异常后返回 | 预算命中依据可信事件归为 `RESOURCE_LIMIT` | 目前只有 OOME/容器 OOM 有专门分类 | **遗留 / BLOCKED**：需要真实 cgroup 与 tmpfs 证据后设计事件基线，未在 Docker 不可用时猜测实现 |

静态核对确认 Docker 使用参数数组，无 shell 拼接；只读挂载随机任务目录，不挂项目根、主目录或 Docker socket；禁网、UID 10001、cap-drop ALL、no-new-privileges、默认 seccomp、只读根、CPU/内存/PID/tmpfs 限制均在参数中；没有宿主机 javac/java 回退。Host、Origin、会话令牌、请求体和并发限制保持。

## C：前端交互与真实端到端流程

| 严重度 | 文件位置 | 复现方法 | 预期 | 实际 | 修复建议与处理 |
|---|---|---|---|---|---|
| P2 | `apps/web/src/App.tsx execute()` | 先取得结果，再停止 API 并重试 | 最新失败不能继续把旧结果显示为本次结果 | 错误旁仍显示无“上一次”标识的旧结果 | 已在每次尝试开始时清除旧结果、诊断归属和提交元数据 |
| P2 | `App.tsx` health 状态 | 页面在 runner 不可用时打开，恢复后真实运行 | 有效非基础设施结果使健康状态恢复就绪 | health 只在挂载时读取，成功运行不恢复 banner | 已在可信 RunResult 后恢复；真实成功路径待 Docker 验证 |
| P2 | `App.tsx`、`styles.css` 窄屏工作台 | 390×844 或 320×720 打开引导/独立模式 | 可访问的“题面/编辑/结果”选项卡切换 | 只有纵向堆叠，编辑和反馈相隔多个屏幕 | 已增加 ≤650px ARIA tablist、互斥面板、左右键/Home/End；390px Playwright 通过 |
| P2 | `App.tsx` 课程按钮 | 390px 点击当前 704 或其他题 | 进入并聚焦工作台 | 页面留在顶部，视觉反馈很弱 | 已滚动并聚焦 `#workbench`；专项 E2E 通过 |
| P2 | `styles.css` 关键正文/元数据 | 320/390px 检查输入限制、状态和结果元数据 | 普通文字清晰，关键样本对比度 ≥4.5:1 | 多处 9–12px，若干颜色仅 2.73–3.26:1 | 已提高字号和前景色；专项 E2E 检查 ≥12px、≥4.5:1 及无横向溢出 |
| P3 | `App.tsx` 成功标题 | 单击“运行输入”得到 `PASSED_LOCAL_TESTS` | run 显示“本次输入通过”；submit 才是“通过本站测试” | run 标题仍含“通过本站测试” | 已按 `result.mode` 分开 |
| P3 | `App.tsx` fetch 异常 | 停止 API 后运行 | 中文说明检查启动终端并重试 | 直接显示 `Failed to fetch` | 已映射为中文行动提示；错误时不再同时显示空结果提示 |

审查确认参考播放器仍固定标注“参考解法 · 算法状态演示（非 JVM 调试）”，学生结果保持 `student-java` 通道；提示、查看答案、引导通过和独立通过分别记录；现有 E2E 没有拦截 `/api/runs` 伪造成功。

## 集成验证

| 命令 / 检查 | 状态 | 证据 |
|---|---|---|
| `npm ci --ignore-scripts` | PASS | 从更新后的 lock 干净安装 237 packages，audit 0 vulnerabilities |
| `npm run check` | PASS | lint、typecheck、33 文件 / 206 测试 |
| `npm run build` | PASS | web 与 API 构建通过；Monaco 约 3.18 MB 警告为已知限制 |
| 窄屏专项 Playwright | PASS | 1 项真实页面测试；未伪造判题响应 |
| `npm run doctor` | PASS | WSL 2.7.14；Docker Engine 29.7.2，linux/amd64、cgroup v2；固定镜像探针通过 |
| `npm run test:runner` | PASS | 8 文件 / 64 项真实容器；正确/错误、编译、异常、超时、大输出、结构判定、限制和清理 |
| 704、206、3 完整真实 Java E2E | PASS | 三题分别走完课程、真实失败、修正、通过与刷新恢复 |
| 其余七题真实 Java冒烟 | PASS | 实际执行强于冒烟：七题完整浏览器失败/通过/恢复路径均通过 |
| `npm run test:shutdown` | PASS | 实际启动 dev、取消在途容器、关闭服务；两端口释放 |
| 最终 `npm run verify` | PASS | doctor、206 项非 Docker、build、64 项 runner、19 项 E2E、shutdown 全通过，0 skipped |

证据在 `docs/evidence/stage05-*.log`。Codex Security 标准扫描在 WSL 修复前完成，未发现可报告漏洞且当时覆盖标为 partial；其动态缺口现由 64 项真实 runner、19 项真实 E2E 和 shutdown 补验。原始不可变报告为 `docs/evidence/stage05-codex-security-report.md`。

## 遗留与下一动作

WSL 已获用户授权并从 2.7.13 更新到 2.7.14，Docker 已恢复。固定镜像 `java-algo-bridge-runner:21.0.12` 为 linux/amd64，ID `sha256:2e21b5062179c6fde7d2ff77b75f1f13348ca8651f258ac2ae20947d19124ff7`。最终验收后无项目标签容器、无 `jab-run-*` 目录，5173/3001 均释放。

遗留项：PID/tmpfs 命中被学生代码捕获时的精确事件归类仍没有独立的 cgroup/tmpfs 事件基线测试。本轮真实测试已验证既有资源参数、OOM/超时/输出分类与容器清理；不扩大到未经实现的分类声明。Monaco 主包约 3.18 MB 是已知性能限制。
