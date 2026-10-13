# 三题扩展验收（2026-10-13）

## 交付范围

在原十题工作台、编辑器、进度、参考播放器和 Docker runner 上追加：

| 题号 | 算法 | 课程 / 测试 / 模型版本 | 发布用例 | 错误夹具 |
|---|---|---|---:|---:|
| 35 | 半开区间 lower_bound | `35-v1 / 35-tests-v1 / 35-half-open-lower-bound-v1` | 12 | 3 |
| 121 | 前缀最低价与最大利润 | `121-v1 / 121-tests-v1 / 121-one-pass-min-price-v1` | 12 | 3 |
| 217 | HashSet 单次扫描查重 | `217-v1 / 217-tests-v1 / 217-hash-set-v1` | 12 | 2 |

每题包含必要 Java 前置、原创题面和手算、算法推导、不变量、参考 Java、不可变状态模型、至少两个输入相关预测、三段引导、独立骨架、三层提示、常见错误和真实运行反馈。参考演示继续标为“参考解法 · 算法状态演示（非 JVM 调试）”；学生源码只走 `student-java` runner 通道。

## 实际协作

四个 agent 共享同一 checkout，没有隔离 worktree。主 agent 先冻结公共 ProblemId、输入/输出判定和固定 Adapter，再授权三个互斥写入范围：

- `/root/problem35`：仅 `packages/curriculum/problems/35/**`，局部 8 项测试 PASS。
- `/root/problem121`：仅 `packages/curriculum/problems/121/**`，局部 10 项测试 PASS。
- `/root/problem217`：仅 `packages/curriculum/problems/217/**`，局部 10 项测试 PASS。
- 主 agent：contracts、bridge、package exports、web/API registry、可信 Java Adapter、全局测试、依赖/锁、文档、Git 合并与推送。

## 验收矩阵

| 检查 | 状态 | 实际结果 |
|---|---|---|
| 远程基线整合 | PASS | `origin/main` 的 README 提交与本地同内容异哈希；ort 无冲突合并，双方历史保留 |
| `npm ci --ignore-scripts` | PASS | 锁文件可重装；无全局安装 |
| `npm audit` | PASS | 0 vulnerabilities；补丁更新见 DECISIONS |
| `npm run check` | PASS | ESLint、TypeScript、39 文件 / 238 项 Vitest |
| `npm run build` | PASS | web/API 构建通过；Monaco 大块警告仍为已知限制 |
| `npm run runner:build` | PASS | 固定 Temurin digest；runner `sha256:ded3fb546b93b3c6aa49ffd556c642c383a90a99d4fdb910feb428408733a521`，linux/amd64 |
| 三题参考 Java | PASS | 36 个发布用例全部经 Docker 内 javac/java 通过；参考模型对显示范围内用例严格等值 |
| 三题错误夹具 | PASS | 8 个故意错误源码均在声明的目标用例被真实 runner 拒绝 |
| 演示上限 | PASS | 超过 30 项的判题用例真实 Java 仍通过，参考模型明确拒绝生成不完整轨迹 |
| `npm run test:runner` | PASS | 9 文件 / 75 项；保留正确/错误、编译、异常、超时、输出/资源和清理覆盖 |
| 新三题浏览器流程 | PASS | 各题实际完成语法→预测→演示→三段引导→错误运行→修正提交→刷新恢复 |
| `npm run test:e2e` | PASS | 22 项真实浏览器测试；原十题及 704/206 关键流程无回归 |
| `npm run test:shutdown` | PASS | 在途任务取消、容器清理、5173/3001 关闭 |
| 最终 `npm run verify` | PASS | doctor、check、build、75 runner、22 E2E、shutdown 全部完成，无 skip |
| 最终残留 | PASS | 项目标签容器 0，`jab-run-*` 临时目录 0，回环端口无监听 |

首次 `runner:build` 因 Docker Desktop daemon 未运行而失败；启动本机已注册 Docker Desktop 应用后，Engine 29.7.2 恢复为 linux/x86_64、cgroup v2，随后所有真实验收通过。没有回退到宿主机执行 Java，没有执行全局 Docker prune，也没有处理其他项目资源。

## 已知限制

本产品仍是单用户回环原型，不是公网多租户沙箱或 LeetCode 官方评测。三题参考演示最多显示 30 个数组项，真实判题最多 10000 项。自动化测试证明实现和本机流程符合契约，不能替代真实学习者效果研究。Monaco 生产包约 3.2 MB 的警告和 PID/tmpfs 精确事件分类仍是既有遗留项。
