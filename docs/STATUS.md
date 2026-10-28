# 当前状态

更新日期：2026-10-28。本批新增69「整数平方根」、122「买卖股票的最佳时机 II」、144「二叉树的前序遍历」，当前共37题；旧34题版本与草稿键不变。三个原生工作agent在共享checkout的互斥课程目录交付，主agent完成公共契约、可信判题、受限Java适配、前后端注册及集成。固定Java21镜像重建成功；完整`npm run verify`退出0：96文件/511项静态测试、18文件/163项真实容器测试、46项浏览器测试以及shutdown全部PASS，零跳过。新三题40个发布用例、7个可编译错误解法、25个具名反例和12个额外输入经真实Java判定；三题浏览器端完整学习、失败修正与刷新恢复均通过。独立残留检查项目容器、任务目录、5173/3001监听均为0。初轮静态断言失败与修复、真实派工、命令及边界见[本批验收](EXTENSION_2026-10-28.md)。功能无待解决阻塞；其他操作系统、断电注入和真实学生学习成效NOT_RUN，Monaco大块构建警告沿用。下一批另行指定；本机入口见[LOCAL_RUN.md](LOCAL_RUN.md)。

更新日期：2026-10-27。已追加34「在排序数组中查找元素的第一个和最后一个位置」、202「快乐数」、387「字符串中的第一个唯一字符」，当前共34题；原31题版本与草稿键不变。三个原生工作agent分别在互斥课程目录交付，主agent完成公共契约/判题/适配/注册与集成，另一个原生agent独立只读审查未发现可复现缺陷。完整`npm run verify`退出0：87文件/467项非Docker测试、17文件/152项真实容器测试、43项真实浏览器测试、前后端构建及shutdown均PASS，零跳过。新三题43个发布用例、6个可编译错解和20个具名反例经真实Java判定；独立残留检查项目容器、任务目录、5173/3001监听均为0。Docker Desktop初始停止，经现有入口启动后恢复Linux Engine29.7.2；没有修改全局设置。实测命令、首轮中间态构建失败与修复、协作和限制见[本批验收](EXTENSION_2026-10-27.md)。本批功能无待解决阻塞；其他操作系统、断电注入和真实学生学习成效NOT_RUN，Monaco大块警告沿用。下一批须另行指定，本地运行见[LOCAL_RUN.md](LOCAL_RUN.md)。原31题完成记录如下。

更新日期：2026-10-23。已新增724「寻找数组中心下标」、219「存在重复元素 II」、560「和为 K 的子数组」，共31题。复用既有工作台、版本化草稿、参考状态播放器与真实 Docker Java runner；原28题版本和进度键未变。完整 `npm run verify` PASS：79文件/430项非Docker测试、16文件/142项真实容器测试、40项真实浏览器测试和shutdown均通过，零跳过；独立检查项目容器、任务目录及5173/3001监听均为0。新三题48个发布用例、6个可编译错解夹具及17个具名反例经过真实执行。三名原生工作agent按互斥路径启动后遭客户端模型容量错误，未完成完整原生多agent交付；主agent确认无并发写入后串行补齐、集成和验收。具体事实与限制见[本批验收](EXTENSION_2026-10-23.md)。本批功能无待解决阻塞；其他操作系统、断电注入和真实学生学习成效NOT_RUN。下一批须另行指定；本地运行见[LOCAL_RUN.md](LOCAL_RUN.md)。

## 2026-10-21完成记录

更新日期：2026-10-21。已新增33「搜索旋转排序数组」、392「判断子序列」、322「零钱兑换」，当前二十八题。三个原生agent按互斥目录交付并交叉审查，主agent完成集成与修复；新题44用例、6错误Java夹具及17具名反例均经过真实判定。完整verify退出0：15文件/132项真实容器、37项浏览器及shutdown全部PASS；最终check为76文件/409项，build亦PASS。项目容器、任务目录和5173/3001监听最终均为0。输入标签、检查点关联与33区间高亮问题已修复，首次类型检查失败保留在[本批验收](EXTENSION_2026-10-21.md)。无待解决阻塞；既有Monaco大块警告保留，其他操作系统、断电与真实学生成效NOT_RUN。当前汇总见[ACCEPTANCE.md](ACCEPTANCE.md)，运行见[LOCAL_RUN.md](LOCAL_RUN.md)。本批完成，下一批等待用户指令。

## 2026-10-20完成记录

更新日期：2026-10-20。已新增 153「寻找旋转排序数组中的最小值」、136「只出现一次的数字」、746「使用最小花费爬楼梯」，当前二十五题。三个原生 agent 分别交付完整课程，共38个用例、6个错误Java夹具，主 agent 集成契约、判题和执行。完整 verify 的68文件/370项非Docker、13文件/121项真实容器、34项浏览器与shutdown均PASS；独立残留检查随后发现一个健康探针，已修复为Docker自动删除并保留学生任务退出检查。修复后 check/build再次PASS，3文件/12项真实容器专项（含探针自动删除和14个严格错误反例）、11项浏览器专项（含新三题及704/206/3完整流程）和shutdown均PASS。最终项目容器、任务目录及5173/3001监听均为零。首次静态门禁失败、审查发现与残留修复均保留在 [EXTENSION_2026-10-20.md](EXTENSION_2026-10-20.md)，汇总入口见 [ACCEPTANCE.md](ACCEPTANCE.md)。本批完成，无待解决阻塞；未执行其他操作系统或真实学生学习效果验证。本机入口见 [LOCAL_RUN.md](LOCAL_RUN.md)，下一批扩题等待用户指定。

## 上一批完成记录

更新日期：2026-10-18。已追加 11「盛最多水的容器」、209「长度最小的子数组」、198「打家劫舍」，当前共二十二题；三个原生工作 agent 分别交付课程，主 agent 集成契约、判题与真实运行。最终 `npm run verify` 为 PASS：60 文件/334 项非 Docker 测试、12 文件/111 项真实容器测试、31 项真实浏览器测试及 shutdown 全部通过，零跳过。新题共 40 个发布用例、7 个错误 Java 夹具，完整流程均能刷新恢复。修复了 198 的 30 项演示边界和两间相邻说明，以及路线页写死总题数的问题。首次全量回归有一次 169 请求返回 RUNNER_UNAVAILABLE，已保留失败记录并补诊断，相关文件 12/12 与第二次完整验收均通过；不声称已确定其底层原因。最终项目容器、临时任务目录、5173/3001 监听均为零。实际分工、检查命令、问题与证据见 [EXTENSION_2026-10-18.md](EXTENSION_2026-10-18.md)。本批实现和验收已完成，下一批扩题须用户另行授权；本机使用入口见 [LOCAL_RUN.md](LOCAL_RUN.md)。

## 历史阶段记录

更新日期：2026-10-16。已追加 88、125、169，当前共十九题；共享契约、完整课程、参考状态模型、真实 Java runner 和浏览器学习流程均已集成。`npm run verify` 为 PASS：52 文件/297 项非 Docker 测试、11 文件/100 项真实容器测试、28 项真实浏览器测试及 shutdown 全部通过。新增三题专项真实容器差分 12/12、完整浏览器流程 3/3 通过；无项目容器、临时任务目录或端口残留。实际派工、契约、验证与边界见 [EXTENSION_2026-10-16.md](EXTENSION_2026-10-16.md)。本轮扩题到此停止；下一批题目须用户另行指定。

更新日期：2026-10-15。已在原十三题完整流程上追加 53、167、242，当前共十六题；课程、参考模型、浏览器工作台和真实 Java runner 已接通。`npm run verify` 为 PASS：46 文件 / 268 项非 Docker 测试、10 文件 / 88 项真实容器测试、25 项真实浏览器测试及 shutdown 全部通过。完整验收、实际派工、初次测试问题和最终清理见 [EXTENSION_2026-10-15.md](EXTENSION_2026-10-15.md)。

完成日期：2026-09-15。阶段 00—05 已完成；本轮只执行阶段 05，现已停止在阶段边界。三个独立审查、修复、真实 Java runner、十题浏览器流程、退出清理及最终 verify 全部完成。

## 本轮结果

- 104 递归快照的 `root` 绑定活动栈帧；题 1 Map 和题 20 栈只在对应 `new` 执行后出现。
- J2 准确区分局部变量明确赋值、字段/数组默认值、基本值、引用值与 `==`；J1 不再只列 704/206；题 1 补 J3 前置。
- runner 使用固定补丁镜像 `java-algo-bridge-runner:21.0.12`，探针与任务均 `--pull=never`。Docker info 必须明确返回 Linux；stale 恢复可周期重试；取消和绝对截止覆盖前置 Docker 命令；关闭清理失败明确报告。
- 新运行会清除旧结果；可信结果仍匹配题目、课程、模式和 sourceHash。run 显示“本次输入通过”，submit 才显示“通过本站测试”；网络错误提供中文行动提示。
- ≤650px 工作台提供题面、编辑、结果 ARIA 选项卡及方向键/Home/End；窄屏选题后聚焦工作台；关键文字字号和对比度提高。
- 根清单恢复 `lint/check/test:runner/test:e2e/test:shutdown/verify` 及精确测试依赖，锁文件可从干净 `npm ci` 重建。仓库私有 exclude 不再隐藏规则、文档、测试和验收配置。

公开 Lesson、RunRequest/RunResult、ReferenceTrace 与 Progress 契约版本未变；参考 trace 与学生 `student-java` 真实执行通道仍分开。没有增加题目、框架或 AI API。

## 验收

| 检查 | 状态 | 实际结果 |
|---|---|---|
| `npm ci --ignore-scripts` | PASS | 从 lock 安装 237 packages；npm audit 0 vulnerabilities |
| `npm run check` | PASS | ESLint、TypeScript、33 文件 / 206 项 Vitest |
| 固定种子参考模型审计 | PASS | 300 条十题轨迹 / 11,531 快照；终态、预测点、步骤映射和新增不变量无分叉 |
| `npm run build` | PASS | web 与 API 构建通过；Monaco 3.18 MB 大块警告为已知限制 |
| stage05 固定镜像 | PASS | linux/amd64；ID `sha256:2e21b5062179c6fde7d2ff77b75f1f13348ca8651f258ac2ae20947d19124ff7` |
| `npm run test:runner` | PASS | 8 文件 / 64 项真实容器测试；覆盖正确/错误、编译错误、异常、超时、大输出、结构判定、限制与清理 |
| 704、206、3 完整真实 Java E2E | PASS | 课程→预测/演示→引导/独立→真实失败→修正→通过→刷新恢复 |
| 其余七题真实运行 | PASS | 实际执行强于要求的冒烟：七题完整浏览器失败/通过/恢复路径均通过 |
| 窄屏与旧结果专项 | PASS | 390px 键盘选项卡、聚焦、字号/对比度；真实运行后网络失败不会保留旧成功结果 |
| `npm run test:shutdown` | PASS | dev 实际启动；在途任务取消，容器清理，5173/3001 关闭 |
| 最终 `npm run verify` | PASS | doctor、206 项非 Docker、build、64 项 runner、19 项 E2E、shutdown；0 skipped |
| 最终残留检查 | PASS | 无项目标签容器、无 `jab-run-*` 临时目录、5173/3001 无监听 |
| Git 集成 | PASS | 保留用户新增的中英文 README 提交；规则、文档、测试、验收配置和本轮修复纳入本地阶段 05 提交；未推送 |

WSL 起初为 2.7.13，Docker Desktop 报告 `WSL update required`。用户明确授权后更新到 2.7.14，Docker Engine 29.7.2 恢复为 linux/amd64、cgroup v2。未关闭安全保护，未使用宿主机 Java。

## 实际协作

原生 subagent 可用。主 agent 确认四个 agent 共享同一 checkout，没有隔离 worktree，因此先给三项审查只读范围，收到具体缺陷后再按互不重叠路径修复。

- `/root/audit_teaching05`：A 教学与算法只读审查；随后仅修复 bridge、题 1/20/104 内容/模型/测试。
- `/root/audit_runner05`：B runner、安全和清理只读审查；随后仅修复 API runner、镜像脚本、runner README 和 runner resilience 测试。
- `/root/audit_frontend05`：C 前端和真实浏览器只读审查；随后仅修复 App、样式和 stage05 前端 E2E。
- 主 agent：读取需求与契约、恢复根脚本/依赖/lock、标准安全扫描、独立 diff 复核、统一回归、WSL/Docker 恢复、真实验收与文档。

完整问题、复现、预期、实际和处理见 [REVIEW.md](REVIEW.md)。Codex Security 标准扫描在 Docker 恢复前完成，没有可报告漏洞且静态报告覆盖为 partial；动态缺口已由真实 runner/E2E/shutdown 补验，原始报告见 [stage05-codex-security-report.md](evidence/stage05-codex-security-report.md)。

## 遗留与下一入口

PID/tmpfs 命中被学生代码捕获时的精确 `RESOURCE_LIMIT` 归类尚没有独立事件基线测试。本轮已验证既有 CPU/内存/PID/tmpfs 参数、OOM/超时/输出分类和清理，但不宣称未实现的 cgroup/tmpfs 事件归类已完成。Monaco 约 3.18 MB 包体是已知性能限制。

阶段 06 入口为 [prompts/06-local-acceptance.md](../prompts/06-local-acceptance.md)。只有用户另行明确指定后才执行；阶段 05 到此停止。

## 阶段后 Docker 维护

2026-09-15 按用户要求核对本机镜像和容器，只删除 Java Algo Bridge 的三个旧阶段镜像 `21.0.12-stage01`、`21.0.12-stage03`、`21.0.12-stage04`，以及唯一引用 stage01 的已退出、无挂载容器 `447a81e7d905`。当前仅保留正式 runner `java-algo-bridge-runner:21.0.12` 和用于固定版本重建的基础镜像 `eclipse-temurin:21.0.12_8-jdk-noble`；无容器残留。未执行全局 prune，未处理其他项目资源。完整项目 Docker 命令见 [DOCKER_COMMANDS.md](DOCKER_COMMANDS.md)。

2026-10-13 重建同一固定标签以加入三种可信方法签名，新镜像 ID 为 `sha256:ded3fb546b93b3c6aa49ffd556c642c383a90a99d4fdb910feb428408733a521`，linux/amd64。最终验收后无项目标签容器、无 `jab-run-*` 临时目录，5173/3001 无监听。Docker Desktop 起初未运行，已通过本机已注册应用启动；没有修改全局 Docker/WSL 配置，也没有删除其他项目的两个镜像和一个已退出容器。
