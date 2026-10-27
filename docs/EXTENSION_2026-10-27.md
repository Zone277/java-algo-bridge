# 三题续扩验收（2026-10-27）

用户要求继续扩题并将本地提交普通推送到远程。本批新增34「在排序数组中查找元素的第一个和最后一个位置」、202「快乐数」、387「字符串中的第一个唯一字符」，目标总数34。复用既有Java桥接、课程工作台、参考状态播放器、版本化草稿和一次性受限Docker runner；无新框架、外部API或依赖。

## 环境与分工

初始Git工作区干净，`main`在`d1d98a897011664176b6eae4c3ace9c52621566d`，与`origin/main`一致。Windows/PowerShell，项目Node24.20.0/npm11.19.0。Docker Desktop起初停止，由本机既有入口启动后确认Linux Engine29.7.2/x86_64。`git worktree list`只有一个共享checkout；没有声称agent拥有隔离worktree。

主agent先冻结[v1-extension-2026-10-27](CONTRACTS.md)公共契约并负责可信判题、Java适配、公共注册、全局测试、文档和Git。原生agent分别只获`packages/curriculum/problems/34/**`、`202/**`、`387/**`写入权，禁止跨目录和提交。三者均已交付并明确释放目录：34为16例/2错解、局部2文件/7项PASS；202为14例/2错解、局部2文件/9项PASS；387为13例/2错解、局部1文件/3项PASS。局部ESLint均PASS；202与34在交付时运行的全仓TypeScript也PASS。交付期间34曾修复手算sourceHash及prefer-const，202修复prefer-const，未跳过测试。

34的可信期望线性扫描，参考双二分；202可信期望Floyd循环检测，参考已见集合；387可信期望字符Map，参考`int[26]`两遍扫描。真实学生Java执行结果与预置参考状态使用不同通道。已核对三题公开题意，课程内容原创，本站较小输入上限另行说明。

课程目录交付后，独立只读审查agent复核了题意/schema、双通道、步骤映射、可信oracle、适配器类型、六个错解夹具和真实测试定义，没有修改文件，也未发现可复现缺陷。它另外实际调用模型与oracle检查未列入固定用例的边界：34空数组和多重重复值、202的1111111111/145/2147483646、387的`abacbdeed`/`zzab`/`aabbz`，结果一致。真实Docker与浏览器执行仍由主agent负责；审查者没有声称自己完成这些验收。

## 验收记录

| 检查 | 状态 | 实际证据 |
|---|---|---|
| 冻结契约与旧题注册单测 | PASS | `npx vitest run tests/unit/stage14-contracts.test.ts tests/unit/stage04-contracts.test.ts packages/curriculum/bridge/content.test.ts`：3文件/14项 |
| 课程局部测试与类型检查 | PASS | 三目录局部Vitest分别7/9/3项；全仓`npm run check`为87文件/467项、ESLint和TypeScript均通过 |
| 固定Java21镜像构建 | PASS | 课程并行写入时首次构建因34中间态缺`content.ts`退出；交付后重跑成功，镜像`sha256:d6ded7c63e8ddac26a177cdd2afc24e49ea0f785d00310c19a18dfd6f781edf1`，amd64 |
| 新三题真实Java参考/错解/模型对照 | PASS | `npx vitest run --config vitest.runner.config.ts tests/runner/stage14-extension.test.ts --reporter=verbose`：1文件/10项；43发布用例、12固定种子输入、6个错解夹具与20个具名反例目标均真实编译运行并核对结构化输出/清理 |
| 新三题完整浏览器学习流程 | PASS | `npx playwright test tests/e2e/stage14-extension.spec.ts`：3/3；语法→预测→演示→引导→独立错误运行→修正提交→刷新恢复，真实`/api/runs`无预制成功 |
| 全仓`npm run verify`及退出清理 | PASS | 命令退出0：doctor、87文件/467项非Docker测试、前后端生产构建、17文件/152项真实容器、43项真实浏览器及shutdown全部通过，零跳过；服务关闭检查包含在途任务取消和端口清理 |
| 项目容器、临时目录和回环端口残留 | PASS | verify结束后独立复查：项目标签容器0、`jab-run-*`任务目录0、5173/3001监听0 |
| 其他操作系统、断电注入、真实学生学习成效 | NOT_RUN | 本批不以自动化代替真人试用 |

首次中间态构建失败在课程交付后重跑已关闭；其退出原因与重跑证据均保留。完整回归执行时未再修改业务代码，文档在验收后更新。不会通过预制输出、打印PASS、源码匹配、宿主机回退、删除或跳过测试取得绿色结果。参考演示不是学生Java调试轨迹，“通过本站测试”不代表官方评测通过。未执行其他操作系统、断电注入和真实学生学习成效验证；Monaco生产包大块警告仍是既有性能限制。
