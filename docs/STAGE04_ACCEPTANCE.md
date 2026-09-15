# 阶段 04 验收

日期：2026-09-11；范围仅为 283、977、1、20、21、104、70、3，以及支撑这八题所需的共享契约、runner、渲染器和学习流程泛化。704、206 作为每批回归门禁，没有另建页面或执行体系。

## 交付

- 公共契约：`packages/contracts/src/problems.ts` 统一十题输入、输出、元数据、可信期望和语义判定；`index.ts`、`learning.ts` 扩展严格 RunRequest、Lesson、ReferenceTrace 与结构状态联合。
- 课程：八个 `packages/curriculum/problems/<id>/` 目录，各含内容、参考 Java、不可变模型、入口及两类局部测试；`model-utils.ts` 统一 hash、冻结和代码范围。
- 运行：同一个 Fastify API 和 Java Adapter 支持十个固定方法签名；新增平台 `TreeNode.java`，继续使用平台 `ListNode` 和对象身份表；所有输出为可信调用器生成的结构化值。
- 可视化：同一个 ReferencePlayer 与 StructureRenderer 渲染 array/map/stack/list/tree/dp/window；变量绑定、对象字段、对象值和递归帧保持不同含义。
- 前端：十题共用 App、LearningPanels、Monaco、Progress、真实结果区和版本化 localStorage；输入 JSON、平台类定义和语义反馈按题切换。
- 测试：新增十题注册/契约/渲染器单元测试、分三批真实 runner 差分和错误夹具测试，以及八题完整浏览器流程测试。

## 三批门禁

| 批次 | check | 真实 runner | 真实浏览器 | 结果 |
|---|---:|---:|---:|---|
| 基线 704/206 | 100 测试 | 25 测试 | 9 测试 | PASS |
| 283、977、1 | 140 测试 | 10 测试，34.72 秒 | 3 新题 + 704/206，共 7 | PASS |
| 20、21、104 | 170 测试 | 11 测试 | 3 新题 + 704/206，共 7 | PASS |
| 70、3 | 200 测试 | 8 测试 | 2 新题 + 704/206，共 6 | PASS |

每批只有绿色门禁后才开始下一批。第二批首轮有 2 个测试失败：21 的错误夹具会在比声明更早的边界用例被发现；修正 `targetedCaseIds` 后 11/11 重跑通过，没有放宽判定。第三批首轮发现 70 模型按设计拒绝 n>30 的完整演示；测试改为所有 n 仍由真实 Java 判定，n<=30 严格差分，n>30 必须明确拒绝且不得截断伪装，随后 8/8 通过。

## 最终验收

在 PowerShell 中使用项目 Node，并设置 `JAB_WEB_PORT=5174`、`JAB_API_PORT=3002` 后执行 `npm run verify`：

| 项目 | 状态 | 结果 |
|---|---|---|
| doctor | PASS | Node 24.20.0；两个回环端口可绑定；Docker/JDK runner 可用 |
| check | PASS | ESLint、TypeScript、32 个 Vitest 文件、200 项测试 |
| build | PASS | Vite 869 模块与 API tsup 构建成功 |
| test:runner | PASS | 8 文件、64 项真实 Docker 测试，311.74 秒 |
| test:e2e | PASS | 17 项真实 Playwright，约 3.0 分钟 |
| test:shutdown | PASS | 真实 dev 启动、在途任务退出、容器清理、两端口关闭 |

八个新增题的浏览器流程都实际执行：进入课程、语法检查、两个预测、演示前后/重置、三段引导及自检、引导完整 Java 真实通过、独立错误 Java 真实失败、修正后真实提交通过、刷新恢复两类草稿和进度。704、206 原 E2E、存储故障、源码变更后旧结果失效、编译错误和无限循环反馈继续通过。

真实 runner 对每题课程参考 Java 的全部发布用例执行并与模型最终输出对照；所有错误夹具均被本站测试发现。283 读取调用后的原数组；1 使用谓词接受合法反序；21 检查 aN/bN 原对象集合和连接；104 使用紧凑队列层序；3 检查连续窗口。打印 `PASS`、源码字符串和前端静态值都不决定通过。

独立只读复核构造反例并检查真实文件/容器：283 局部数组重新绑定为 WRONG；1 反序索引为 PASS、同索引为 WRONG；21 相等值不同链先后均可但新节点/成环为 WRONG；104 的 `[1,null,2,3]` 深度为 3。复核发现的“模型与 Java 应直接比较”和“E2E 应遍历三段引导”已补齐后重新跑最终验收；没有 P0/P1 遗留。

镜像 `java-algo-bridge-runner:21.0.12-stage04` 为 Linux/amd64，ID `sha256:8881c6d654da2538b2e2e2299fd7eb524ee9d80b4d28dae2e8dc846e5376f12d`。验收后无运行任务临时目录，5174/3002 关闭；额外发现一个已退出 doctor 探针，按精确 ID、名称、状态和项目标签确认后删除。没有执行全局 Docker 清理。

证据：[基线镜像](evidence/stage04-baseline-runner-build.log)、[基线总验收](evidence/stage04-baseline-verify.log)、[第一批 runner](evidence/stage04-batch1-runner.log)、[第一批 E2E](evidence/stage04-batch1-e2e.log)、[第二批 runner](evidence/stage04-batch2-runner.log)、[第二批 E2E](evidence/stage04-batch2-e2e.log)、[第三批 runner](evidence/stage04-batch3-runner.log)、[第三批 E2E](evidence/stage04-batch3-e2e.log)、[最终 verify](evidence/stage04-verify.log)。

## 未宣称

真实目标用户学习效果、其他操作系统、断电/内核 OOM 等全面故障注入、完整离线重装为 NOT_RUN。产品仍是单用户本机教学原型，不是公网多租户安全沙箱。阶段 05 未执行。
