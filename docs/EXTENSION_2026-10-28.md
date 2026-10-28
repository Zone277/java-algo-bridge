# 三题续扩验收（2026-10-28）

用户要求继续扩题并把本地提交普通推送到远程。本批新增69「整数平方根」、122「买卖股票的最佳时机 II」、144「二叉树的前序遍历」，目标总数37。复用既有课程工作台、Java桥接、不可变参考状态播放器、版本化草稿与一次性受限Docker runner；不增加框架、依赖、页面系统或AI API。

## 环境、契约和真实分工

初始工作区干净，`main`与`origin/main`同在`8a2269035f731a216b108975d2f4c00f5b7012c9`。Windows/PowerShell，项目Node24.20.0/npm11.19.0。Docker Desktop初始停止，经本机已有入口启动后确认Linux Engine29.7.2/x86_64；没有修改全局配置或容器安全限制。`git worktree list`只有一个共享checkout，所有agent即时共享文件系统，未声称有隔离worktree。

主agent先冻结[v1-extension-2026-10-28](CONTRACTS.md)公共签名、输入/输出与独立可信判题，再通过真实`collaboration.spawn_agent`分别给`/root/course69`、`/root/course122`、`/root/course144`分配互不重叠的`packages/curriculum/problems/<id>/**`写入权。派工含目标、必读文件、契约版本、允许/禁止路径、局部测试命令和交付格式。主agent独占根配置/导出、公共契约/渲染器、API与web注册、Java适配器、全局测试、文档和Git；课程目录释放后才进行集成修订。

三个agent均实际交付并释放目录。69为15发布例、2可编译错解、3动态预测，局部2文件/7项PASS，ESLint和TypeScript PASS；122为14例、3错解、3预测，局部2文件/9项PASS、目录类型检查PASS；144为11例、2错解、2预测，局部2文件/11项PASS、ESLint和TypeScript PASS。144另把递归调用帧和节点身份分开，结果`List<Integer>`在参考演示标为列表；真实wire传输复用`int-array`。每题有3段引导、独立骨架、三级提示、具名反例及实际模型不变量测试。

可信期望与参考算法分开：69使用`Math.floor(Math.sqrt(x))`核对防溢出整数二分；122使用cash/hold DP核对相邻正增量贪心；144使用迭代栈核对递归根→左→右。参考状态`reference-model`从不当作学生Java轨迹；学生结果来自真实容器的`student-java`通道。

## 验收记录

| 检查 | 状态 | 实际证据 |
|---|---|---|
| 合同与课程局部测试 | PASS | `npx vitest run tests/unit/stage15-contracts.test.ts` 5/5；三个课程目录分别7/9/11项PASS，ESLint与TypeScript经交付核对 |
| 首轮全量静态检查及修复 | PASS | 首轮`npm run check`有509/511通过，失败是stage14仍取末尾三题和stage15在初始帧寻找稍后创建的List视图；没有删减测试。修正时间位置断言后，2文件/8项专项PASS。随后全量`npm run verify`静态门禁96文件/511项PASS，ESLint与TypeScript通过 |
| 固定Java21镜像重建 | PASS | `npm run runner:build`成功，`java-algo-bridge-runner:21.0.12`为`sha256:f2a286982fcaf660ee5fb10d1cafdf2ba79678c459acad46ab69ba0a8e42ddc6`、amd64；基础JDK digest和安全限制未变 |
| 新三题真实Java与参考模型对照 | PASS | `npx vitest run tests/runner/stage15-extension.test.ts --config vitest.runner.config.ts --reporter verbose`：1文件/11项。40个发布例、12个额外小输入、7个可编译错解及25个具名反例均由真实`javac/java`执行并核对结构化输出与清理 |
| 新三题完整浏览器学习路径 | PASS | `npx playwright test tests/e2e/stage15-extension.spec.ts`：3/3。进入课程→语法→预测→参考演示→三段引导真实提交→独立错误运行→修正提交→刷新恢复；检查真实`/api/runs`请求、源码hash和清理 |
| 全仓`npm run verify`真实runner/浏览器/退出清理 | PASS | 命令退出0：doctor回环绑定与Docker/JDK探针、96文件/511项静态测试、前后端生产构建、18文件/163项真实容器、46项真实浏览器和shutdown在途任务清理全部通过，零跳过；Monaco大块警告沿用 |
| 项目容器、临时目录与回环端口残留 | PASS | verify结束后独立PowerShell检查：项目标签容器0、`jab-run-*`任务目录0、5173/3001监听0 |
| 其他操作系统、断电注入与真人学习成效 | NOT_RUN | 本批未执行，自动化不能替代学生试用 |

本批不根据输出`PASS`文字、源码字符串、预制返回或宿主机执行判定学生通过。未删除/跳过测试换取绿色结果。Monaco生产大包警告是沿用的构建性能限制；本站通过不表示官方评测通过。
