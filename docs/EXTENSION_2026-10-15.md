# 三题续扩验收（2026-10-15）

## 范围与协作

在现有十三题的同一学习工作台、Java 编辑器、版本化进度、参考播放器和受限 Docker runner 上追加 53、167、242；总数为十六题。53 训练非空连续子数组最大和；167 训练有序数组两端双指针和 1 起始返回下标；242 训练小写字母频次比较。三题各有完整八类教学步骤、Java 前置、原创手算与推导、参考 Java、不可变状态轨迹、至少两个动态预测、三段引导、独立骨架、三层提示、常见错误、12 个注明覆盖点的用例与 3 个故意错误源码夹具。

原生 subagent 可用，四个 agent 共享一个 checkout，没有隔离 worktree。主 agent 冻结公共契约与可信 Java Adapter，然后只授权 `/root/problem53` 写 `packages/curriculum/problems/53/**`、`/root/problem167` 写 `packages/curriculum/problems/167/**`、`/root/problem242` 写 `packages/curriculum/problems/242/**`。三份课程局部测试分别为 9/9、6/6、9/9 PASS。主 agent 独占注册、全局测试、文档和 Git；详细派工见 [TASKS.md](TASKS.md)。

## 本机真实验收

| 检查 | 状态 | 实际证据 |
|---|---|---|
| Node / Docker / 固定镜像 | PASS | Node 24.20.0、npm 11.19.0；Docker Engine 29.7.2 Linux/amd64；重建 `java-algo-bridge-runner:21.0.12`，镜像 ID `sha256:b91b86e10bf17ab78792a2d4838e6b9d5b814e22a378d5b27cf4e723005d8fbe` |
| `npm run check` | PASS | ESLint、TypeScript、46 文件 / 268 项非 Docker 测试 |
| `npm run build` | PASS | Vite web 与 tsup API 成功；Monaco 约 3.29 MB 大块警告保留 |
| 新三题真实 Java | PASS | 36 个发布用例由容器内 `javac/java` 执行通过，模型终态与真实返回值严格等值；显示范围内中间状态不变量由局部测试验证 |
| 新三题错误夹具 | PASS | 9 个错误源码均经真实 Docker submit 拒绝，再对声明的反例单独 run 验证；不以源码匹配或打印文字判通过 |
| 固定种子差分 | PASS | 53、167、242 各 4 组额外有效小输入；模型终态与真实 Java 返回值一致 |
| `npm run test:runner` | PASS | 10 文件 / 88 项真实容器测试；原有编译错误、异常、超时、输出限制及清理回归仍通过 |
| 新三题真实浏览器完整流程 | PASS | 各题学语法→预测→演示→三段引导→独立错误运行→修正提交→刷新恢复，接口返回的是本次真实 Java 结果 |
| `npm run test:e2e` | PASS | 25 项；704、206、原十题和上批 35/121/217 流程无回归 |
| `npm audit` | PASS | 0 vulnerabilities；本轮没有增加外部依赖或改变锁文件 |
| `npm run verify` | PASS | doctor、check、build、88 runner、25 E2E、shutdown 顺序完成，无跳过 |
| 加强后的 `npm run test:shutdown` | PASS | 在途任务取消，且本轮创建的任务/探针容器均已移除；5173/3001 端口关闭 |
| 最终残留 | PASS | 项目标签容器 0、`jab-run-*` 临时目录 0、回环端口无监听 |

首次新题 runner 测试把 submit 误当作一定执行到每个声明反例；submit 实际在首个失败用例停止。测试已改为保留真实 submit 失败，并逐个以 run 模式对目标反例执行。第一次完整 verify 后发现一个已退出的本项目探针容器；核对其名称、项目标签和无挂载后精确删除，并加强 shutdown 测试检查本轮所有容器，再真实重跑通过。没有执行全局 Docker prune，也没有删除其他项目镜像或容器。

## 边界

参考演示仍明确标注“参考解法 · 算法状态演示（非 JVM 调试）”，不能解释任意学生 Java。演示最多 30 项或字符；超出时拒绝生成不完整轨迹，真实判题仍支持本站公布的 10000 上限。本站是单用户回环原型，测试通过只表示通过本站用例，不等于 LeetCode 官方评测或真实学习效果证明。PID/tmpfs 被学生捕获时的精确事件归类和 Monaco 包体积仍是既有遗留项。
