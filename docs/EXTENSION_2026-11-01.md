# 2026-11-01 三题续扩与验收

本批在原46题后追加58「最后一个单词的长度」、66「加一」、110「平衡二叉树」，当前49题。复用同一课程工作台、J1—J8按需学习、版本化草稿和进度、不可变参考状态播放器，以及一次性受限Docker Java 21 runner。没有新增依赖、页面系统、AI API或宿主机学生源码执行。题意核对见[SOURCES.md](SOURCES.md)；中文题面、示例、Java参考解法、状态模型和测试均为本站原创。

## 实际分工和文件

`git worktree list`显示只有一个共享checkout，未声称agent之间自动隔离。主agent先固定题号、版本、输入输出与独立oracle，再用客户端真实`collaboration.spawn_agent`分别派工；三名agent只写互斥目录：`/root/course58`写`packages/curriculum/problems/58/**`，`/root/course66`写`packages/curriculum/problems/66/**`，`/root/course110`写`packages/curriculum/problems/110/**`。交付分别为12、15、12个有效测试用例、每题2个可编译错解、2个动态预测、三段引导、独立骨架、三级提示及参考模型单测。主agent独占`packages/contracts`、课程包导出、Java Adapter/Supervisor、API/前端注册、全局测试、文档与Git。agent交付后，主agent处理跨目录lint与注册集成；另安排只读交叉审查。

58输入为英文字母及空格、长度1—10000且至少一个单词，真实返回最后一词长度；独立`trim/split` oracle对照Java尾部逆扫。66输入1—100位数字（多位无前导0），真实返回加一后的数组，独立`BigInt` oracle对照Java逐位进位；可信Adapter拒绝null和不合规格的结果位数。110复用本站紧凑层序树，最多1000节点/深度128，要求每个节点左右子树高度差≤1；独立逐节点高度复算对照Java自底向上高度哨兵。参考演示各自限制为30字符、30位、30节点/深度8，超出演示范围仍可在本站实际运行。参考快照为`reference-model`，学生结果为`student-java`，不能靠打印PASS、源码匹配或动画通过。

## 本机环境和恢复

开始时`main`与`origin/main`均为`959426f6813e4d5d48382c071ea270e47988cd40`，工作区干净。Windows/PowerShell；项目内Node24.20.0/npm11.19.0通过临时PATH使用，未改全局配置。Docker Desktop初始停止，已有进程启动后因`run/sailor-ingest.sock`失效而崩溃。先只读日志定位，再核验`AppData/Local/Docker/run`和`AppData/Local/docker-secrets-engine`均只含过期reparse point/socket、所有待停止进程均属于已安装Docker Desktop，随后将两目录可逆移至同级`*-stale-20261101-210536`并启动现有应用。未重置Docker、删除镜像/容器、读取密钥或关闭安全保护。引擎恢复为29.7.2 Linux；`npm run runner:build`以原固定JDK digest构建`java-algo-bridge-runner:21.0.12`成功，镜像`sha256:ad3e254f231bbdb7f92652cc3b1f27352120a39219f3136ccf3e99f998e08cd5`/amd64。

## 验收证据

- `npx vitest run packages/curriculum/problems/58`：1文件/3项PASS；66：2文件/8项PASS；110：1文件/6项PASS。
- `npx playwright test tests/e2e/stage19-extension.spec.ts --reporter=line`：3项PASS；三题均真实走过语法、预测、演示、引导完整Java提交、独立错解失败后修正通过，以及刷新后草稿/进度恢复。测试核验`/api/runs`请求源码、`student-java`来源、源码哈希和容器清理，未拦截接口返回预制结果。
- 初轮静态检查发现历史测试将总题数固定为46，已改为只锁定前46题顺序，并由新测试锁定49题；最终全量静态检查126文件/648项PASS。初轮新增真实运行专项在对照10000字符输入时超出了教学演示30字符上限；改为超出演示范围仍与独立oracle对照，小输入同时差分参考状态与真实Java。没有放宽判题、删除或跳过测试。
- `npm run verify`最终退出0：doctor PASS、126文件/648项静态测试PASS、生产构建PASS、22文件/203项真实容器测试PASS、58项真实浏览器测试PASS、shutdown PASS，零跳过。新三题39个发布用例、6个可编译错解和12个额外输入经真实Java核对；超出演示上限的大输入直接对照独立oracle。
- 两名课程agent在交付后只读交叉审查。`/root/course58`发现110 `content.ts`原引导的“null高度为1”虽不符合课程高度约定，但整体高度统一加1不改变最终布尔结果，原`single-case`不是有效反例（P2）。主agent改为与失衡哨兵混淆的`null→-1`错误，并把反例改为`empty-case`；新增真实Java专项检查空树与单节点均被判`WRONG_ANSWER`。`/root/course110`发现58重复字符输入`letter`时，去重后的`members`被界面泛称“窗口成员”，可能误导学习者把6个字符看成4个（P3）。主agent把公共视图标为“窗口内不同字符（去重）”，逐位置显示仍完整；新增单测核对6个位置、长度6和标签。两处修复后再跑`npm run check`：126文件/649项PASS；新增三题真实Docker专项1文件/11项PASS；全量浏览器测试已在视图和引导修复后运行并通过。
- 最终代码再次`npm run build` PASS；Vite仍报告Monaco大块性能提示，未影响构建。独立只读残留检查：项目标签容器0、`jab-run-*`任务目录0、5173/3001监听0。`git diff --check` PASS；远程`main`在提交前仍与起点相同。

其他操作系统、断电注入和真人学习成效均为NOT_RUN；本站通过不等于LeetCode官方评测。Monaco构建大块提示属于现有性能告警，当前不影响本地运行。
