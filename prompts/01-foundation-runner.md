# 阶段 01：本机骨架与真实 Java 执行

读取 AGENTS.md、PRODUCT_SPEC、CONTRACTS、ENVIRONMENT、STATUS。按已冻结契约实施，不重新规划产品。

主 agent 先创建 npm workspaces、公共契约、基础脚本、测试约定和目录骨架，统一安装必要依赖、维护锁文件，再启动独立工作。若需要调整共享契约，主 agent 更新后再分发。

建议分工（同时最多 3 个工作 agent）：
A 前端：只写 apps/web，实现路线页面、工作台骨架、Monaco Java 编辑器、运行状态和结果面板。先对第 704 题完整开放。未就绪题目必须明确标记，不显示可用但空白的页面。Mock 只能用于隔离 UI 单元测试，不接入最终真实运行路径。
B 执行：只写 apps/api 与 runner/java，实现第 704 题的 Docker 内 javac/java 调用、输入输出适配、正确/错误/编译错误/异常/超时/无 Docker 状态与清理。
C 测试：在授权测试路径定义集成/限制验收夹具与测试；检查编译错误是否映射学生 Solution.java 行号，检查不能靠打印 PASS 欺骗判定。

执行必须满足 PRODUCT_SPEC 第 10—11 节。先验证一个独立 Java 运行任务，再接 HTTP，再接前端。不能为了尽快出现通过标记而直接返回参考答案。

学生编辑完整 Solution 类，后台提供单独调用器。不能在宿主机执行其源码。Docker 不可用时保留可实现的页面和非执行演示能力，runner 返回明确不可用，本阶段“真实执行验证”标 BLOCKED。

主 agent 完成集成，建立 doctor、runner:build、dev、check、build、test:runner 脚本。dev 仅监听回环地址，前端通过 /api 代理调用后端。

必须实际验证：
1. 对一个原创升序数组和 target，第 704 题正确 Java 得到正确索引；改变输入，结果变化。
2. 错误返回值不能通过；语法错误展示编译诊断；除零等运行异常被分类。
3. 无限循环被终止；超量输出被限制；两个请求数据不串联。
4. 容器/临时文件在成功、失败和超时后清理；无 Docker 时不能偷偷 host fallback。
5. 页面点击运行使用真实 API，展示与当前 sourceHash 对应的结果。

执行可运行的测试并修复。不要扩展其余题目的课程或制作复杂首页。更新 STATUS、命令证据和下一阶段入口，完成后停止。
