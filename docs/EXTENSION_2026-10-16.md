# 三题续扩验收（2026-10-16）

用户要求继续增加新算法题并将本地提交推送远程。本批在原十六题后追加 88「合并两个有序数组」、125「验证回文串」、169「多数元素」，共十九题。继续使用同一个中文工作台、Java 编辑器、版本化草稿/进度、参考状态播放器、回环 API 和 Java 21 受限 Docker runner；没有增加框架、依赖或 AI API。

三题各交付原创题面、语言前置、手算与推导、编译可用的 Java 参考源码、代码步骤映射、不可变演示轨迹、至少两个动态预测、三段引导、独立骨架、三层提示、常见错误、12 个有覆盖说明的有效用例与至少两个可编译的故意错误解法。88 的可信调用器序列化传入的原 `nums1`，参数重绑定无法假装原地修改；125 按可打印 ASCII、忽略非字母数字及大小写判定；169 的输入 schema 保证严格多数，可信期望由频次表独立计算。参考模型与学生真实运行仍是不同通道。

## 实际协作与边界

主 agent 核实所有 agent 共享同一 checkout，没有自动隔离 worktree；先冻结 `v1-extension-2026-10-16` 公共契约和 Java 签名，再给三个原生工作 agent 分配互不重叠的题号目录：`/root/course88` 只写 `packages/curriculum/problems/88/**`，`/root/course125` 只写 `packages/curriculum/problems/125/**`，`/root/course169` 只写 `packages/curriculum/problems/169/**`。三份交付均为课程内容、参考源码、状态模型及局部测试；各自 ESLint 与目录 Vitest 为 PASS，分别为 8、9、8 项。各 agent 未改共享文件、未提交或推送。主 agent 独占 contracts、根入口、可信 Adapter、全局测试、文档和 Git 集成。

## 验证证据

| 检查 | 状态 | 结果 |
|---|---|---|
| 本机 Docker | PASS | Engine 29.7.2，linux/x86_64；`npm run runner:build` 构建固定 `java-algo-bridge-runner:21.0.12`，最终 ID `sha256:a326f044d8d5388bdcd3ff403d4922721abad137d89091dc0946fdf8ab776564`，linux/amd64 |
| 公共 ESLint、TypeScript、非 Docker Vitest | PASS | `npm run check`：52 文件、297 项；含三题契约、模型中间不变量、步骤映射和快照不可变性 |
| 新题真实容器差分与错误夹具 | PASS | `npx vitest run --config vitest.runner.config.ts tests/runner/stage09-extension.test.ts`：12/12；每题 Java 参考源码全部用例通过，与状态模型终值对照，另有固定种子合法输入；错误夹具被真实 javac/java 判出 |
| 新题浏览器完整流程 | PASS | `npx playwright test tests/e2e/stage09-extension.spec.ts`：3/3；语法、预测、演示、三段引导、独立运行失败→修正→提交通过、刷新恢复 |
| 全仓真实容器回归 | PASS | `npm run verify` 中 `test:runner`：11 文件、100 项真实容器测试全部通过；包含原十六题回归与新增三题 |
| 全仓 `npm run verify` | PASS | doctor、52 文件/297 项非 Docker 测试、构建、11 文件/100 项真实容器测试、28 项真实浏览器测试及 shutdown 全部通过；零跳过 |
| 最终镜像复核 | PASS | 正式构建脚本重打标签后，对最终 ID 再跑三题真实容器差分：1 文件/12 项全部通过 |

## 边界与遗留

演示最多 30 个数组项或字符，超过时明确拒绝生成参考轨迹；真实判题继续按各题公布上限执行。本站通过仅表示通过本地测试，未声明 LeetCode 官方判题或实际学习效果已验证。Monaco 主包体仍约 3.35 MB，是既有性能限制。Docker 不可用时保持 `RUNNER_UNAVAILABLE`，不在宿主执行学生源码。最终清理复核：无项目标签容器、无 `jab-run-*` 临时目录，127.0.0.1:5173/3001 无监听。Docker 中只保留本项目正式 runner 与固定 JDK 基础镜像；另两个非本项目镜像保持原状。`STATUS.md` 记录当前状态。
