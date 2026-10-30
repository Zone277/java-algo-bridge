# 三题续扩验收（2026-10-30）

用户要求继续扩展算法题，并把本地提交普通推送到远程。本批新增145「二叉树的后序遍历」、231「2 的幂」、383「赎金信」，总题数43。三题复用现有课程工作台、J1—J8按需学习、版本化草稿、不可变参考状态播放器和受限一次性Docker Java runner；没有新增依赖、框架、页面系统或AI API。公开题意来源见[SOURCES.md](SOURCES.md)，题面、讲解、代码和模型均为本站原创。

## 环境、契约与实际分工

开始时本地`main`、`origin/main`均为`8399203ec287c7a9765ee0c246889a2bfdcb2b78`且工作区干净。`git worktree list`仅一个共享checkout，没有自动隔离worktree。Windows/PowerShell；所有项目命令显式优先使用自带Node24.20.0/npm11.19.0。Docker Desktop最初停止且被上次留下的损坏运行时socket阻断；确认无进程、只含socket后，可逆移走三个旧运行时目录，未改设置或安全保护，最终确认Engine29.7.2/linux/x86_64。固定Java21镜像按原基础digest重建成功。

主agent先冻结[公共契约](CONTRACTS.md)中的题号、版本、输入、输出及独立期望，然后用真实`collaboration.spawn_agent`派出三个工作agent。目录互斥：`/root/course145`仅写`packages/curriculum/problems/145/**`，`/root/course231`仅写`packages/curriculum/problems/231/**`，`/root/course383`仅写`packages/curriculum/problems/383/**`。三名agent均交付并释放目录：145为11例/2错解/局部11项PASS，231为16例/2错解/局部8项PASS，383为12例/2错解/局部5项PASS。主agent独占公共契约、包导出、桥接与应用注册、可信Java Adapter/Supervisor、全局测试、文档和Git。

可信期望与教学参考算法独立：145双栈对照递归左→右→根，231重复除2对照正数门槛与按位与，383 Map频次对照`int[26]`计数扣减。树节点使用稳定身份ID，重复值节点不合并；有符号int最小值不误判为2的幂；重复字母按数量取用。参考快照是`reference-model`，学生源码只能产生真实容器的`student-java`结果。各题均有原创题面、Java语法衔接、手算/不变量、动态预测、三层提示、三段引导、独立骨架与反例反馈。

## 验收过程与证据

首轮`npm run check`发现两个旧测试仍把题目总数和末尾三题写死为40/94、268、338；仅更新断言为43并保留旧题顺序检查，未删改覆盖范围。第二次`npm run check`退出0：112文件/584项非Docker测试PASS，ESLint和TypeScript通过。`npm run build`退出0；Monaco大块警告沿用。

首轮新题真实Java专项因主agent遗漏Supervisor题号白名单，10项全部返回`SYSTEM_ERROR: Unregistered problem`。补上145/231/383后重建固定镜像，重新运行`npx vitest run --config vitest.runner.config.ts tests/runner/stage17-extension.test.ts`，1文件/10项PASS：39个发布用例、13个额外输入、6个可编译错解及其具名反例经真实受限容器编译/执行，并与独立oracle及参考模型终态对照；每次检查结构化结果来源、源码hash与清理状态。`npx playwright test tests/e2e/stage17-extension.spec.ts`，3/3 PASS：三题分别从进入课程、语法、预测、参考演示、三段引导真实提交、独立错解失败、修正通过到刷新恢复，并核对真实`/api/runs`响应。

完整`npm run verify`退出0：`npm run doctor`确认固定Node、回环端口和Docker/JDK；112文件/584项静态测试、生产构建、20文件/183项真实容器测试、52项真实浏览器测试，以及`test:shutdown`在途任务/容器/端口清理全部PASS，零跳过。独立残留检查返回本项目容器0、`jab-run-*`临时目录0、5173/3001监听0。没有通过删除或跳过测试、放宽错误断言取得绿色结果。

已知限制：Monaco生产包较大仍有构建警告；其他操作系统、断电注入及真人学习成效本轮NOT_RUN。本站测试通过不等于官方平台评测通过。普通提交与远程SHA在推送后另行核对。
