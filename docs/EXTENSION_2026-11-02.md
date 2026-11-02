# 2026-11-02 三题续扩验收

本批在原49题后追加26「删除有序数组中的重复项」、100「相同的树」、141「环形链表」，当前共52题。复用同一课程工作台、J1—J8按需桥接、版本化草稿与进度、不可变参考状态播放器，以及一次性受限Docker Java 21 runner。没有新增依赖、页面系统、AI API或宿主机学生源码执行。公开题页只用于核对任务语义，课程文字、示例、参考Java、状态模型与测试均为本站原创。

## 实际协作与所有权

客户端原生subagent可用。主agent先用`git worktree list`确认只有单一共享checkout，没有把共享目录误称为隔离worktree；随后冻结输入、输出、版本与独立期望，三个工作agent只写互不重叠的课程目录：

| agent | 写入范围 | 交付 |
|---|---|---|
| `/root/course26` | `packages/curriculum/problems/26/**` | 15个发布用例、2个错解、原地有效前缀课程与状态模型 |
| `/root/course100` | `packages/curriculum/problems/100/**` | 13个发布用例、2个错解、双树对应节点课程与状态模型 |
| `/root/course141` | `packages/curriculum/problems/141/**` | 13个发布用例、2个错解、真实环与Floyd状态模型 |

主agent独占公共契约、课程导出、桥接映射、前后端注册、Java Adapter/Supervisor、全局测试、状态文档和Git。三名agent交付后交换执行只读审查：课程反例审查发现100的`inputSchemaId`少了`Schema`后缀；前端审查指出恢复只读localStorage、播放器操作、SVG回边及错解状态断言不足；执行审查用错误前缀、同值异结构、1000节点尾自环和打印伪造路径核对，未发现实现缺陷。主agent统一修复与加固，没有让审查agent修改公共文件。

## 契约与真实执行

- 26同时检查返回`k`和原数组对象的`nums[0..k)`，后缀忽略。可信Adapter拒绝越界`k`，把有效前缀转为`int-array`；独立oracle从有序输入生成唯一值序列。
- 100分别构造p/q两棵TreeNode对象图，按对应null结构和值返回boolean。重复值节点保持不同身份；独立迭代节点对oracle与递归参考Java分开。
- 141由可信Adapter根据`pos`连接尾节点到稳定原节点，学生方法只收到`head`。独立下标图访问oracle与Floyd参考Java分开；同值节点不合并。
- 三题trace均为`reference-model`，包含输入哈希、参考源码哈希、稳定步骤和代码范围；学生结果固定为`student-java`。参考动画、源码相似度、stdout中的`PASS`或JSON都不能判通过。

新增41个发布用例、6个可编译错解夹具、每题至少2个动态预测和3段引导。参考终态与独立oracle及真实Java对照，中间快照另行检查不变量、代码映射、树身份与环回边。

## 本机环境与恢复

最终环境为Windows/PowerShell、Docker Desktop 4.90.0、Engine 29.7.2、linux/amd64。Docker初始停止，陈旧AF_UNIX运行时入口阻断启动；核验精确路径属于Docker本机数据目录且是重解析点后，以可逆改名保留三个失效目录，没有删除未知资源、重置Docker或关闭安全保护。详见[ENVIRONMENT.md](ENVIRONMENT.md)。

固定镜像`java-algo-bridge-runner:21.0.12`重建PASS，Image ID为`sha256:d1636999e717fefffbbf61ae20e16dfca6b8d7caefa9fc72d2d13c6b57aec89f`，linux/amd64。Temurin 21.0.12固定digest、禁网、非root、只读根、cap-drop ALL、no-new-privileges、默认seccomp、CPU/内存/PID/输出/超时限制保持不变。

最终系统PATH中的Node已是22.13.1/npm10.9.2，不满足项目固定版本，因此第一次`npm run verify`在doctor按预期FAIL。主agent没有修改全局Node，而是临时缓存Node 24.20.0和npm 11.19.0；组合doctor实际PASS。最终完整verify由固定Node 24.20.0执行，项目依赖与锁文件未变化。

## 实际验证

| 检查 | 状态 | 结果 |
|---|---|---|
| 新课程、契约与可视化专项 | PASS | 9文件/40项；含源码哈希、逐步代码映射、稳定身份、环回边与所有快照next不变 |
| 新三题真实runner专项 | PASS | 1文件/11项；三份参考、独立输入、非法k及6个错解均经Docker/javac/java |
| 新三题浏览器专项 | PASS | 3/3；语法→预测→输入切换/前后/播放暂停/变量表/代码高亮→引导→错误→修正→真实通过→刷新恢复 |
| `npm run check` | PASS | 133文件/684项；lint、TypeScript与非Docker测试 |
| 生产构建 | PASS | web/API构建通过；Monaco大块提示为既有已知限制 |
| 全量真实runner | PASS | 23文件/215项；52题参考/错解、编译、异常、超时、输出、资源、并发、取消、隔离与清理 |
| 全量真实浏览器 | PASS | 61项；全部课程真实失败/通过/恢复，另含窄屏、存储、旧结果与错误状态 |
| 退出清理 | PASS | dev实际启动；在途任务取消，容器清理，5173/3001关闭 |
| 最终`npm run verify` | PASS | doctor、684项静态、构建、215项runner、61项E2E及shutdown全部退出0，零跳过 |
| 最终残留 | PASS | 项目标签容器0、`jab-run-*`任务目录0、5173/3001监听0 |

## 中间失败与处理

- 首次新增runner专项在Docker刚恢复时三个参考任务得到`DOCKER_CHECK_TIMEOUT`；Engine稳定后重跑真实测试通过，没有把不可用标成PASS。
- 141的一个错解最初只指向单节点无环用例，该代码不进入循环，反例不成立；改为两/三节点无环与重复值无环后，真实错解测试通过。
- 首次新增E2E在学习路线阶段查找只在编码区显示的方法签名；把断言移动到引导页后通过。
- 加固后的E2E首次在刷新恢复末尾因Windows剪贴板CRLF与课程LF逐字不同失败；确认编辑器源码内容一致后仅归一化换行再重跑，3/3通过。
- 第一次完整verify使用系统Node22.13.1，doctor正确失败；改用固定Node24.20.0后完整verify退出0，没有放宽版本断言。

## 阻塞与边界

功能无待解决阻塞。其他操作系统、断电/强杀Docker注入、完整离线重装和真实学生学习成效为NOT_RUN。Monaco生产包体大于500kB的提示沿用。本站结果只表示通过本站测试，不代表通过LeetCode官方隐藏测试，也不构成公网多租户沙箱保证。
