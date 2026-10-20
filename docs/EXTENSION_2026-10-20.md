# 三题续扩验收（2026-10-20）

本批在用户“继续扩展新的算法题并将本地提交推送到远程”的授权下增加 153、136、746，当前共二十五题。不增加依赖、框架或 AI API；同一课程渲染器、Monaco、进度与一次性 Docker 执行链路复用。

## 实际协作与交付

平台与 git worktree list 确认共享 checkout，只有一个工作目录；三个原生工作 agent 互斥写目录，主 agent 独占公共文件。契约先冻结为 v1-extension-2026-10-20。

| agent | 课程目录 | 交付与局部验证 |
|---|---|---|
| /root/course153 | packages/curriculum/problems/153 | 13 用例、2 错夹具、4 演示；2 文件/9 测试 PASS |
| /root/course136 | packages/curriculum/problems/136 | 12 用例、2 错夹具、4 演示；2 文件/8 测试 PASS |
| /root/course746 | packages/curriculum/problems/746 | 13 用例、2 错夹具、3 演示；2 文件/8 测试 PASS |

每题 6 文件（content/reference/model/index 和两个测试），完整包含语法、原创题面与手算、推导不变量、参考 Java、不可变状态、两次动态预测、三段引导、独立骨架、三级提示和常错。目录完成后释放，后续只读复核由 course153 检查共享集成、course136 检查 746、course746 检查 136。

主 agent 集成 contracts、课程 exports、两端 registry、桥接映射、Java Adapter/Supervisor，以及 stage11 契约/组件/真实容器/浏览器测试；文档同步范围与限制，原二十二题版本和进度键不变。

## 环境与已实际执行的检查

- Windows / PowerShell，基线 main=27f3dca1ec4df5c8f2a32da3463fb92121936b4e，初始工作区干净，fetch 确认远程一致。
- 项目 Node v24.20.0/npm 11.19.0。Docker 最初未启动，使用现有 Docker Desktop 入口启动；Engine 29.7.2/linux/x86_64。未修改全局设置或安全策略。
- `npm run runner:build` PASS，固定镜像 java-algo-bridge-runner:21.0.12，ID `sha256:91665eed2c169109468aadc084dde4d28e9991ed7e2e6d1cc6a22d7fdc80e3f1`，amd64。Gson 哈希检查及容器内 javac 适配器编译成功，基础镜像 digest 未变。
- `npx vitest run tests/unit/stage11-contracts.test.ts tests/unit/stage04-contracts.test.ts` PASS：2 文件/12 测试。包含 160 组固定种子小输入和独立路径穷举、非法旋转循环边界、频次前提、顶楼语义及上限。
- 首次 `npm run check` FAIL：153 模型延迟赋值变量的 prefer-const；主 agent 明确初始化为 undefined，保持逐步状态语义。
- 第二次 `npm run check` FAIL：153/746 测试 helper 把状态限定为 initialState，不能接收普通快照。修复为 initialState | snapshots[number]，未删除测试或放宽断言。
- 当时尚未完成的容器、浏览器与最终清理检查记为 NOT_RUN；现已完成，后续发现与最终结果见下文。

## 判定与演示边界

153 可信期望线性最小值，参考二分；136 可信频次统计，参考异或；746 可信后向费用，参考前向滚动到达费用。真实 runner 只读取实际方法返回值，打印 PASS 不影响判定，无源码匹配。固定无网络、非 root、资源限制和异常清理不变；Docker 不可用不执行宿主 Java。

153 的模型测试覆盖 1—30 长度的全部 465 个旋转；136 以独立逐位奇偶和频次验证每个前缀；746 以完整到达费用表和小规模路径穷举检查滚动赋值。每题同时检查代码映射、冻结、切换输入身份和动态预测；全局组件测试验证最大有效演示输入不会越过30项。

显示最多30项，136 因单次+成对前提最多29项；真实范围分别5000/10000（最大合法9999）/1000。本站测试不代表官方评测或真实学生学习效果。其他操作系统、断电注入和大规模学习者试用 NOT_RUN。

## 独立审查与处理

- course153 对共享契约与适配进行了只读审查，并额外穷举 5913 种排列验证旋转合法性、3279 个频次数组、2044 个费用数组和9项请求边界：PASS。发现 P2：stage11 runner 错夹具断言接受异常/超时，不能证明声明的数值反例。预期六个正常返回的错误算法必须逐目标得到 WRONG_ANSWER；主 agent 已收紧并单独真实重跑，通过结果见最终表格；没有用原宽断言结果替代。
- course136 只读审查 746：1089 个费用输入，以独立最短路账本核对所有 DP 单元、滚动赋值和预测，PASS；另算术核对两个夹具的六个反例。未发现需修复问题，不冒充真实 Java 运行。
- course746 只读审查 136：7 个有符号边界/混合输入，使用 BigInt 转换核对 91 个快照和14个预测，PASS；核对变量作用域与引导支架。未发现需修复问题，Docker和浏览器交主验收。

## 最终残留复查发现与修复

第一次完整 verify 命令退出 0：68 文件/370 非 Docker、13 文件/121 真实容器、34 浏览器与 shutdown 均 PASS。收紧后的 stage11 独立真实重跑 1 文件/10 测试 PASS，六个夹具的14个具名反例均为 WRONG_ANSWER，结构化 int 输出也经过可信判定复核。

但随后独立检查发现 1 个已退出健康探针 `jab-probe-741b0d01-c39c-42cd-a26a-2ce8f81324a6`（ID 98b22c82d52b），创建于11:36:00 UTC，任务目录与端口均为零。因此不能把首次整体验收表述为零残留。代码检查确认健康探针没有 Docker 自动删除，依赖宿主在 probe 结束后显式 rm；宿主测试服务器被结束时存在遗漏窗口。时间与浏览器收尾相邻，但没有进程级证据断言唯一触发顺序。

主 agent 已检查其项目标签、名称和 Exited(0) 状态，只删除该容器。探针 run 新增 --rm，使 Docker 在探针退出时删除；保留原显式清理和学生任务退出后的 OOM 检查。增加真实 Docker 透传测试，在应用 rm 之前执行 docker inspect，必须确认探针已不存在；不预制成功输出。该测试会让旧实现因容器仍存在而失败。静态集成测试额外约束只有探针自动删除，学生任务仍可检查退出证据。修复后的复验结果见下面最终表格。

## 最终验收结果

| 实际命令/检查 | 状态 | 结果 |
|---|---|---|
| `npm run verify` | PASS | 68文件/370非Docker、13文件/121真实容器、34真实浏览器及shutdown；随后独立检查发现探针残留，已如实记录 |
| `npx vitest run --config vitest.runner.config.ts tests/runner/stage11-extension.test.ts --reporter verbose` | PASS | 收紧断言后1文件/10项；38发布用例、12种子输入、6错夹具的14目标均实际执行 |
| 探针修复后 `npm run check` | PASS | ESLint、TypeScript、68文件/370测试 |
| `npx vitest run --config vitest.runner.config.ts tests/runner/probe-cleanup.test.ts tests/runner/isolation.test.ts tests/runner/stage11-extension.test.ts --reporter verbose` | PASS | 3文件/12项，含真实自动删除、实际容器限制和三题严格差分/反例 |
| 探针修复后 `npm run build` | PASS | web/API重新构建；Monaco约3.48MB大块警告保留 |
| `npx playwright test tests/e2e/stage11-extension.spec.ts tests/e2e/learning704.spec.ts tests/e2e/learning206.spec.ts tests/e2e/stage04-batch3.spec.ts tests/e2e/stage05-frontend.spec.ts` | PASS | 修复后11项，含新三题、704/206/3完整真实流程，键盘/窄屏/错误状态 |
| 修复后 `npm run test:shutdown` | PASS | 真实启动、运行中关闭、清理与端口关闭 |
| 最终独立资源查询 | PASS | 项目标签容器0，jab-run-*临时目录0，5173/3001监听0 |

P2错误夹具断言已关闭；健康探针残留已修复并通过自动删除回归，未清理其他项目资源。课程模型/Java适配固定镜像未改变，原二十二题版本与草稿保留。没有删除或跳过任何测试，没有修改全局配置。最终无待解决阻塞；Windows之外、断电故障、真实学生学习效果仍NOT_RUN。本批完成后停止，后续题目由用户另行指定。
