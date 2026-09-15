# 阶段 04 派工与接口冻结

日期：2026-09-11。三个原生 subagent 与主 agent 共享 `C:\Users\50199\Desktop\web_proj\java-algo-bridge-codex`，未创建或假定隔离 worktree。主 agent 独占根配置、锁文件、`packages/contracts/**`、公共注册入口、`docs/STATUS.md` 和最终集成。共享路径写入先完成并释放，再开始题目批次。

## 共享窗口

| 实际任务 | 目标与允许写入 | 禁止范围 | 验收与交付 |
|---|---|---|---|
| `/root/course_gap04` | `apps/web/src/App.tsx`、`LearningPanels.tsx`、`styles.css`；十题通用课程选择、输入、源码与进度 | contracts、registry、runner、课程题目目录、根配置 | lint/typecheck/build；说明变更、命令、接口建议、阻塞 |
| `/root/visual_gap04` | `packages/visualizer/src/**`，排除公共导出入口；数组/Map/栈/链表/树/DP/窗口快照渲染 | runner、web、课程题目目录、contracts | 局部 Vitest、lint/typecheck；所有视图只读同一快照 |
| `/root/runner_gap04` | `apps/api/src/app.ts`、`runner.ts`、`runner/java/**`（不改 Gson 二进制）；十题固定签名和结构化适配 | web、visualizer、课程题目目录、contracts、根脚本 | lint/typecheck；真实 Docker 由主 agent 统一验收 |

主 agent 随后串行集成 `packages/contracts/src/problems.ts`、Lesson/RunRequest/RunResult 联合、`apps/web/src/registry.ts`、curriculum/visualizer 导出、`scripts/runner-build.ts` 和全局测试。冻结契约版本为 `v1-stage04`；题目输入、输出和判定以 `docs/CONTRACTS.md` 为准。

## 三批题目所有权

每个工作 agent 仅写授权题号下的 `packages/curriculum/problems/<id>/{content,reference,model,index,content.test,model.test}.ts`，不得改共享文件；输入资料为 AGENTS、PRODUCT_SPEC、04 提示词、STATUS、CONTRACTS 和本文件。

| 批次 | `/root/course_gap04` | `/root/visual_gap04` | `/root/runner_gap04` | 批次门禁 |
|---|---|---|---|---|
| 一 | 283 | 977 | 1 | check、三题真实 Java/模型差分/错误夹具、三题完整 E2E、704/206 回归 |
| 二 | 20 | 21 | 104 | 同上；额外核对栈、原链表身份、紧凑树 null |
| 三 | 70 | 3 | 只读独立复核 | check、两题真实差分/错误夹具、两题完整 E2E、704/206 回归 |

课程交付统一要求：完整 Lesson、8—16 个有覆盖说明的合法用例、至少两份错误 Java、两个状态预测、三段递减支架、独立骨架、三层提示、至少三类错误；参考模型不可变、步骤映射有效、中间不变量单独测试，最终输出再与真实 Java 严格比较。任何跨范围需求由主 agent 在释放后的串行窗口集成。

实际局部交付：283 为 9 例/3 错夹具；977 为 10/2；1 为 10/2；20 为 10/3；21 为 10/3；104 为 11/2；70 为 10/3；3 为 11/3。工作 agent 的局部测试分别全部通过，最终结果以 `STAGE04_ACCEPTANCE.md` 的全局验收为准。
