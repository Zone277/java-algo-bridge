# 三题续扩验收（2026-10-29）

用户要求继续扩题，并将本地提交普通推送到远程。本批新增94「二叉树的中序遍历」、268「缺失的数字」、338「比特位计数」，目标总数40。三题复用原课程工作台、J1—J8按需学习、版本化草稿、不可变参考状态播放器与受限的一次性Docker Java runner；不增加依赖、框架、页面系统或AI API。

## 环境、契约与真实分工

开始时工作区干净，`main`/`origin/main`均为`1c36afd32a66cfdaf989ec8da9b1cae66fdc4d4e`。Windows/PowerShell，默认PATH为Node22.13.1/npm10.9.2；所有验收命令显式将项目自带`.tools/node-v24.20.0-win-x64`置于PATH首位，得到Node24.20.0/npm11.19.0。Docker Desktop最初未启动，启用现有应用后从受审查的执行环境确认Linux Engine29.7.2/x86_64；未改全局配置或容器安全保护。`git worktree list`仅一个共享checkout，没有自动隔离工作树。

主agent先冻结[本批契约](CONTRACTS.md)的输入、输出、Java方法和可信期望；再通过真实`collaboration.spawn_agent`同时委派三名工作agent，按`packages/curriculum/problems/94/**`、`268/**`、`338/**`分配互不重叠的写入范围。每份派工列明必读资料、契约版本、禁止改动的共享目录、局部验收命令和交付格式。三名agent均交付并释放目录；94为11例/2错解/目录11项PASS，268为13例/2错解/目录8项PASS，338为13例/2错解/目录8项PASS。主agent独占根与公共契约、课程包导出、桥接/前后端注册、Java适配器、全局测试、文档和Git；在目录释放后修订268的lint问题。

可信期望与教学参考算法分开：94以迭代栈核对递归左→根→右，268以位图核对下标/元素异或抵消，338以逐数位计数核对DP递推。参考轨迹始终是`reference-model`，学生源码由真实容器产生`student-java`结果；前端不根据打印文本、源码字符串或预制结果判定。94复用稳定节点ID的树图，重复值节点不合并；338区分Java数组默认零值与已推导的DP状态。三题都含原创题面、Java前置、手算与不变量、动态预测、三级提示、三段引导、独立骨架与反例反馈。

## 已完成的验收

| 检查 | 状态 | 真实结果 |
|---|---|---|
| 首轮静态门禁与修复 | PASS | 初轮`npm run check`被268模型一处`prefer-const`拦下；修正后再次运行，在桥接关联测试发现旧37题断言。只将断言扩到40题并保留原37题顺序校验，没有删/跳测试。最终`npm run check`为104文件/549项PASS，ESLint与TypeScript通过 |
| 固定Java21镜像 | PASS | `npm run runner:build`成功，`java-algo-bridge-runner:21.0.12`镜像ID`sha256:ea156e0b5741c0fe4346a7b0d6e5990e4108caa60c55552d3a04cdc292bdc96d`/amd64；固定基础JDK digest未变 |
| 本机就绪 | PASS | `npm run doctor`确认固定Node、回环端口5173/3001可绑定、Docker/JDK runner可用 |
| 新三题真实Java专项 | PASS | `vitest`针对`tests/runner/stage16-extension.test.ts`：1文件/10项PASS；37个发布例、13个额外小输入、6个可编译错误解法与19个具名反例均在真实受限容器中编译/执行并核对结构化输出与清理 |
| 新三题完整浏览器路径 | PASS | Playwright针对`tests/e2e/stage16-extension.spec.ts`：3/3 PASS；进入课程→语法→预测→参考演示→三段引导真实提交→独立错解运行→修正提交→刷新恢复，并核对真实`/api/runs`请求、源码hash及清理 |
| 前后端生产构建 | PASS | `npm run build`退出0；原有Monaco大块警告仍存在，未影响功能 |
| 全量静态、真实runner、浏览器与退出清理 | PASS | `npm run verify`退出0：doctor、104文件/549项静态测试、生产构建、19文件/173项真实Docker容器测试、49项浏览器测试、shutdown在途任务清理全部通过，零跳过；包含704、206、3和本批三题完整学习路径 |
| 独立资源残留检查 | PASS | verify结束后检查本项目标签容器0、`jab-run-*`临时任务目录0、5173/3001监听0 |

未删除或跳过失败测试换取通过。其他操作系统、断电注入和真人学习成效本轮NOT_RUN；Monaco生产包偏大是沿用的性能限制。本站测试通过不等于LeetCode官方评测通过。普通Git提交与远程分支一致性由最终交付时的Git命令核对。
