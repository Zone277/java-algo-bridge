# 三题续扩验收（2026-10-21）

用户授权继续扩题并推送远程。本批新增 33「搜索旋转排序数组」、392「判断子序列」、322「零钱兑换」，共二十八题。复用课程、编辑器、进度和真实 Docker runner；未引入依赖、框架或 AI API，原二十五题版本和进度键不变。

## 实际协作与交付

平台及 git worktree list 确认共享同一 checkout；不是隔离 worktree。主 agent 先冻结 v1-extension-2026-10-21 契约，再派三个原生 agent 互斥写课程目录。主 agent 独占契约、注册、Java 适配器、全局测试、文档和 Git。

| agent | 允许写入路径 | 交付 | 局部验证 |
|---|---|---|---|
| /root/course33 | packages/curriculum/problems/33/** | 16 用例、2 错解、6 个错解目标、4 演示 | 2 文件/9 测试及 ESLint PASS |
| /root/course392 | packages/curriculum/problems/392/** | 14 用例、2 错解、5 个错解目标、4 演示 | 2 文件/8 测试及 ESLint PASS |
| /root/course322 | packages/curriculum/problems/322/** | 14 用例、2 错解、6 个错解目标、4 演示 | 2 文件/8 测试及 ESLint PASS |

每题六个文件：content、reference、model、index 和两个测试。均含必要 Java、原创题面/手算、推导和不变量、参考代码、不可变状态、两个动态预测、三阶段引导、独立骨架、三级提示与常见错误。agent 交付并释放目录后，主 agent 才进行跨目录修复。

## 独立审查、反例与修复

| 审查者 | 问题与证据 | 修复 |
|---|---|---|
| course392 审查 322 | P3，322/content.ts 的 siteLimits.inputSchemaId 写为 CoinChangeInput；输入标签与冻结 schema 名称不一致，预期 CoinChangeInputSchema；不影响实际校验 | 主 agent 统一名称，并修正 33 的同类标签 |
| course33 审查 392 | P3，392/content.ts 声明 392-first-condition/392-final-result，但模型原始 ID 为 first-condition/final-result；默认轨迹用声明 ID 查找两次均失败，预期均可关联 | 主 agent 统一 checkpointId，并修正 relatedIds；新增三题声明检查点与动态答案对应测试，6 项组件专项 PASS |
| course322 审查 33 | 未发现可复现算法问题；独立枚举 960 条轨迹/14658 快照，含 60 单项、240 两项、720 缺失，四分支均覆盖 | 核对排除不丢目标、缩区间、mid 作用域、代码行及两次预测 |
| 主 agent 集成复核 | P2，ReferencePlayer.tsx 的候选区间开关仅识别 704；33 有正确 left/right 快照，但只显示指针与文字，预期复用闭区间高亮 | 将 33 接入既有闭区间视图，浏览器流程新增 search-interval 断言；不改变其他题目显示 |

course392 另以面值使用次数枚举验证 1630 组 322 输入，比较 BFS 判题、模型结果、所有已完成 DP 前缀及两预测，PASS。course33 以删除选择枚举验证 3937 组 392 短字符串，以所有升序旋转集合核对 5913 个 33 排列输入，以面值次数枚举核对 1116 个 322 输入，均 PASS；三题额外字段/非法字符与 28 项注册顺序也已检查。审查均只读、未运行 Docker；主 agent 负责真实容器验收。

首次全仓 typecheck FAIL：扩展 ProblemId 联合后，六个旧 runner 测试文件的十二处 submit 对象无法满足判别联合；主 agent 用 RunRequestSchema.parse 构造请求，增加运行时契约验证，未放宽断言。322 编写中的测试有 undefined 类型错误及 prefer-const lint 错误，由所属 agent 修复。392 同样修复了局部测试状态类型问题。保留失败事实，不删除或跳过测试。

## 环境与边界

- 初始工作区干净，main 与 origin/main 均为 2b96e56fb318208c0b51e3b0a06c988978c2575c，fetch 后左右差异 0/0。
- Windows / PowerShell，项目 Node 24.20.0、npm 11.19.0。Docker 初始停止，经现有 Desktop 入口启动，Engine 29.7.2/linux/x86_64；不更改全局配置或安全保护。
- runner:build PASS；镜像 java-algo-bridge-runner:21.0.12，ID sha256:10ccc751543c22675eb6bd35fdd7ed875e4dd524a4e8bf3d6e9db0daeb0ab58a，amd64。基础镜像固定 digest 未变。
- 33 判题线性查找，参考有序半区二分；392 判题字符位置表加二分，参考双指针；322 判题按硬币数分层 BFS，参考金额 DP。没有根据打印 PASS 或源码模式判定。
- 33 长度 1—5000，严格升序数组的循环旋转且无重复；392 小写字母、s 0—100/t 0—10000；322 面值 1—2147483647、1—12 项、amount 0—10000，重复币允许且无限次使用。大面值不会用作数组容量或导致加法溢出。
- 演示限制为数组/字符串最多 30 项、金额最多 30；不会静默截断。392 显式区分已扫描前缀与实际选取下标；322 区分分配后的默认零、哨兵填充和已完成最优值。参考演示始终与学生执行分离。
- Docker 网络关闭、非 root、资源配额、请求隔离、异常清理及回环监听均沿用。Docker 不可用不回退宿主 Java。

## 验证状态

新增契约和旧注册检查 2 文件/12 项 PASS；首次完整静态门禁 76 文件/406 项 PASS。审查追加三项检查点关联断言后，组件专项 6 项 PASS。

`npm run verify` 最终退出 0，实际结果：

| 检查 | 状态 | 证据 |
|---|---|---|
| doctor | PASS | 固定 Node、Docker/JDK 和两个回环端口 |
| check | PASS | ESLint、TypeScript、76 文件/406 项；新增关联断言后的最终复验见下文 |
| build | PASS | 前后端生产构建，Monaco 大块警告保留 |
| test:runner | PASS | 15 文件/132 项，850.36 秒，零跳过；二十八题真实 javac/java |
| test:e2e | PASS | 37 项，7.5 分钟；新三题、704、206、3 等完整流程均真实运行 |
| test:shutdown | PASS | 真实启动、任务执行中关闭、容器清理及端口关闭 |
| 最终独立残留检查 | PASS | 项目 production 标签容器 0、jab-run-* 目录 0、5173/3001 监听 0 |

新三题 44 个发布用例均通过真实 Java；可演示输入与模型最终输出逐一对照，超演示范围的用例实际运行并验证模型明确拒绝。另有 12 个固定种子真实输入对照。六个错误 Java 夹具提交均为 WRONG_ANSWER，17 个具名目标逐个独立运行也均为 WRONG_ANSWER，结构化返回类型、源码 hash 与清理状态均检查；没有用编译错误或超时冒充算法反例。

浏览器未拦截关键执行接口。新三题均实际完成语法、题面、两次预测、三个引导阶段、完整 Java 提交、独立骨架、错误代码运行、修正后通过与刷新恢复；33 候选闭区间高亮断言通过。引导通过与独立通过分别保存；旧结果过期、键盘窄屏、损坏存储与编译/超时反馈回归也 PASS。

静态门禁运行后补入了元数据关联与 33 区间显示修复，因此最后另跑完整 check/build 验证最终代码，结果为 PASS：76 文件/409 项，ESLint、TypeScript 和前后端生产构建全部通过。真实容器阶段未改变数值判题逻辑，浏览器阶段覆盖最终修复代码。

其他操作系统、断电注入与真实学生学习成效 NOT_RUN。既有 Monaco 大块警告保留，不扩大本批范围处理。
