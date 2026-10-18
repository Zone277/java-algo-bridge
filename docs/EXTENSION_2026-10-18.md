# 三题续扩验收（2026-10-18）

本轮按用户要求继续扩题并推送远程，在已有十九题后增加 11「盛最多水的容器」、209「长度最小的子数组」、198「打家劫舍」。复用现有课程工作台、编辑器、桥接单元、版本化进度、不可变参考状态播放器和受限 Docker runner，共二十二题；没有增加依赖、框架或 AI API。

## 环境与实际协作

Windows 共享 checkout，初始 Git `main` 干净且与 `origin/main` 一致；Node v24.20.0、npm 11.19.0 由项目脚本选择，不修改全局环境。Docker Desktop 初始未启动，启动后 Engine 29.7.2、linux/x86_64 可用。GitHub 通过现有凭据存储认证；不向仓库写入凭据。

主 agent 先冻结 `v1-extension-2026-10-18` 共享契约及可信 Java 签名，再实际派出 `/root/course11`、`/root/course209`、`/root/course198`，各自只写 `packages/curriculum/problems/<id>/**`。平台没有为 agent 自动创建 worktree，已按共享目录分配互斥路径。主 agent 独占公共类型、注册、Java Adapter、全局测试、文档与 Git 集成。

## 判定与状态边界

11 使用短边乘下标距离，可信期望以高度降序加最远下标独立计算。209 只接受正数数组，答案是和至少达到 target 的最短连续窗口，可信期望以起点前缀和加二分计算。198 使用线性不相邻选择，可信期望通过完整前缀 DP 表计算。契约测试另以小输入穷举核对三种可信算法。

参考状态仅来自预置模型，每个快照包含变量、结构、代码步骤及解释；与学生 `student-java` 执行通道分开。演示最多 30 项；真实判题的本站上限为 11/209 各 10000 项、198 为 100 项。

## 验证记录

| 检查 | 状态 | 结果 |
|---|---|---|
| 新输入/判题契约与桥接映射 | PASS | `npx vitest run tests/unit/stage10-contracts.test.ts tests/unit/stage04-contracts.test.ts packages/curriculum/bridge/content.test.ts`：3 文件、13 项 |
| 课程内容与中间状态局部测试 | PASS | 三份目录 ESLint 通过；11 为 2 文件/9 项，209 为 2 文件/10 项，198 为 2 文件/8 项；三题共 40 个发布用例、7 个错误夹具 |
| 公共静态门禁 | PASS | `npm run check`：ESLint、TypeScript、60 文件/334 项非 Docker 测试通过 |
| 固定 runner 镜像 | PASS | `npm run runner:build`：`java-algo-bridge-runner:21.0.12`，linux/amd64，ID `sha256:11dbca74efe1222b7fb23e0e33dde77102c2108e72c9148ec43d3bbd31cfcff2` |
| 新题真实容器差分 | PASS | `npx vitest run --config vitest.runner.config.ts tests/runner/stage10-extension.test.ts`：1 文件/11 项；40 个发布用例、12 组固定种子输入真实 Java/模型对照，7 个错误夹具 submit 与指定反例被真实识别 |
| 新题完整浏览器流程 | PASS | `npx playwright test tests/e2e/stage10-extension.spec.ts`：3/3；语法、预测、演示、三段支架、独立骨架、错误运行→修正提交→刷新恢复，核对请求源码、结果 sourceHash、student-java 来源与 cleanup=done |
| 首次全仓回归 | FAIL | doctor、静态门禁及构建通过；runner 为 12 文件/110 项通过、1 项失败。169 的 `169-wrong-middle-index` 指定反例请求返回 `RUNNER_UNAVAILABLE`，随后报告 worker 退出超时；旧断言未打印底层 reason，不能据此认定具体原因。补充诊断输出，原状态断言不变 |
| 首次失败的完整文件复测 | PASS | `npx vitest run --config vitest.runner.config.ts tests/runner/stage09-extension.test.ts --reporter=verbose`：12/12，包括同一 169 错误夹具的 submit 与全部指定反例，未再出现不可用；没有放宽或删除断言 |
| 第二次全仓容器回归 | PASS | `npm run verify` 中真实 runner：12 文件/111 项全部通过，包含原 19 题及新三题，零跳过；同一 169 夹具再次通过 |
| 最终 `npm run verify` | PASS | 第二次完整命令退出 0：doctor、60 文件/334 项非 Docker 测试、构建、12 文件/111 项真实容器、31 项真实浏览器与 shutdown 全部通过，零跳过；新题 E2E 同时验证动态课程总数 |
| 最终资源与镜像复核 | PASS | 项目标签容器 0、`jab-run-*` 临时目录 0、5173/3001 监听 0；正式 runner ID 与本轮构建一致；本项目仅保留正式 runner 和固定 JDK 基础镜像，非本项目两份镜像未改 |

首次失败没有被删除、跳过或改写为 PASS；单文件复测与完整重跑分别记录。原断言未捕获底层 reason，无法事后确定那次 RUNNER_UNAVAILABLE 的具体原因，后续两轮相关检查未再复现。

## 交叉复核与修复

课程交付后，`/root/course198` 只读复核 11，独立枚举长度 2—6、值 0—3 的 5456 组输入，以全配对穷举核对参考模型与可信期望，并验证 205696 个中间快照的排除不变量，未发现分叉。`/root/course11` 只读复核 198，自行构造单间、零、两间、首尾和混合奇偶反例。

| 问题 | 复现、预期与实际 | 修复与验证 |
|---|---|---|
| P2：198 演示 30 项边界冲突 | 原 `198/model.ts` 为 30 间生成 D(0)…D(30) 共 31 格；`ReferencePlayer.tsx` 拒绝任一结构超过 30 项，因此模型虽生成、播放器仍显示超限 | 主 agent 将 D(0) 单列教学基例，表格只放 D(1)…D(n)，明确状态 i 对应 D(i+1)。保留逐快照前缀/高亮断言，新增三个课程 30 项的真实组件渲染测试；复核 3 文件/11 项 PASS |
| P2：198 题面“两端不相邻”不够精确 | 原 `198/content.ts` 无条件写“首尾不是邻居”；[9,4] 的首尾恰是相邻两间，正确只能取 9，可能误导为 13 | 改为“不额外把首尾连成环；只有两间时仍相邻”。原真实用例 `two-first` 与局部穷举继续覆盖，独立审查确认文字修复 |
| 集成类型不兼容 | 原 198 将 readonly `REFERENCE_STEP_MAP` 赋给可变 Lesson 字段，全仓 TypeScript 报错 | 在课程边界复制步骤对象；不更改公共契约或代码映射，最终 typecheck PASS |
| P3：路线页课程总数仍写死为 10 | `LearningPanels.tsx` 路线页显示 LESSON 20 / 10，与已注册的课程数不符 | 主 agent 统一读取 `PROBLEM_ORDER.length`，新题浏览器用例增加路线计数断言，纳入最终全仓回归 |

209 的 `sum -= nums[left]` 与 `left++` 分步显示，减法后的真实求和区间以教学标记明确为 [left+1,right]；left 不提前移动。上述修复均保留原测试并补充缺失的边界验证，没有跳过或删除失败断言。

首次 runner 失败后，为 stage09/stage10 错误夹具的断言附加 phase、reason、stderr、timings、cleanup；`test:runner` 使用 verbose reporter 逐项显示实际结果。这些修改只增加诊断，不改变真实执行、超时、预期状态或隔离边界。

## 当前状态与边界

本批代码、课程、契约、文档与验收已完成，没有阻止本机使用的遗留阻塞。构建仍有 Monaco 主包约 3.42 MB 的体积提示；未扩展框架、加载外部 CDN 或引入 AI API。本站测试通过不等于 LeetCode 官方评测通过或真实学习效果得到验证。

下一步按 `LOCAL_RUN.md` 启动本机工作台；本批只新增 11、209、198，后续新题须另行授权。用户本轮明确授权提交并推送现有远程 `main`，主 agent 负责 Git 集成，工作 agent 未提交或推送。
