# 阶段03：Java桥接与206真实验收

日期：2026-09-09。仅执行03，704与206共用课程/编辑器/进度/执行体系；未增加另外八题或另一套链表页面。真实派工、输入契约及互斥路径见[TASKS](TASKS.md)、[STAGE03_HANDOFF](STAGE03_HANDOFF.md)。当前checkout共享且无Git；三个原生subagent分别负责桥接/通用前端、206课包/模型/引用图、API/真实Java适配，主agent独占公共类型、入口、根配置、脚本、锁与集成验收。

## 实际文件

- 公共：packages/contracts/src/linked-list.ts新增206输入/平台定义/图；index.ts与learning.ts扩严格两题请求、Lesson、引用预测、BridgeUnit/BridgeProgress和图完整性；curriculum package导出/入口、web registry.ts由主agent注册。
- 微课：packages/curriculum/bridge/content.ts、content.test.ts、index.ts。八单元均有目标、C对照、Java例子和预测互动；按十题关联先修，当前704/206提供返回来源步骤。
- 206：packages/curriculum/problems/206/{content,reference,model,model.test,index}.ts。9例、3份错Java、两处预测、三步支架、独立骨架、三层提示、手算/不变量/常见错误；共享ReferencePlayer扩展ListDiagram，未使用数组反转动画代替对象字段。
- 前端：新增BridgePanel，通用化App/LearningPanels/progress/useLearningProgress；同一编辑器和结果区，题目/模式草稿隔离，704旧key兼容，206恢复所选课程。
- 执行：apps/api/src/{app,runner}.ts和runner/java/{Adapter,Supervisor,ListNode}.java、Dockerfile/README。独立平台类、对象身份图、宿主结构判定，保留资源限制和任务清理。
- 运行配置：scripts/ports.ts、dev/doctor/smoke-shutdown、API入口、Vite与Playwright统一回环端口；runner-build固定stage03镜像。无新外部依赖，package-lock由主agent维护。
- 验证：linked-contracts/progress206/linked-judge、reference206真实Docker、linked-java夹具、learning206与persistence03真实浏览器测试。704原测试保留，仅模型返回类型收窄以适配共享输出联合。

## 命令与状态

本轮命令前置：

```powershell
. ./scripts/use-node.ps1
$env:JAB_WEB_PORT='5174'
$env:JAB_API_PORT='3002'
```

默认5173/3001有用户已启动的旧本项目服务，初查端口FAIL并保留；上述配置只在本进程生效，未杀进程或关闭安全保护。

| 验收 | 状态 | 实际证据 |
|---|---|---|
| npm run runner:build | PASS | 新stage03镜像真实编译ListNode/Adapter/Supervisor；固定基础digest |
| npm run doctor（5174/3002） | PASS | Node24.20.0/npm11.19.0、可绑定两回环端口、真实Docker/JDK约束探针 |
| npm run check | PASS | lint、TypeScript、100 tests；含原704及新微课/身份/Progress反例 |
| npm run build | PASS | Vite/tsup构建成功；Monaco约3MB警告保留 |
| npm run test:runner | PASS | 25 tests，196.92秒；原18项704与限制回归 + 新7项206真实组 |
| 206完整E2E + 八微课 | PASS | 首次2项25.7秒；真实API/容器，无成功结果拦截 |
| 时序/存储故障E2E | PASS | 2项6.5秒；延迟真实SHA调度、存储禁用，不伪造Java结果 |
| 全部test:e2e | PASS | 9项全部通过，约1.2分钟；704原流程完整回归 |
| test:shutdown / verify | PASS | 实际在途任务关闭、容器清理、5174/3002关闭；最终汇总退出0 |
| Git提交 / 阶段04 | NOT_RUN | 非Git仓库，未初始化/提交/推送；不自动扩题 |
| 真人学习效果 / 其他OS / 断电 | NOT_RUN | 自动化操作不等于学习效果，无未执行通过声明 |

## 206真实Java判定

每次请求实际进入独立受限Docker容器，javac编译原Solution.java，java调用reverseList。Adapter以IdentityHashMap绑定原输入对象h0…，保留原对象数组，读取返回根及全部原节点实际val/next；不会按值合并，也不会对错误环无限遍历。宿主检查原ID集合、根身份、值保持和严格反向next，节点记录的序列化顺序可以不同。unknown根/字段作为错误证据，与原身份分开。

9个课包有效输入逐例真实Java输出与参考模型图、源码hash、输入hash对照；16个seed2062026小输入另外比较，含重复值。另一份局部变量名和循环形式不同的正确Java提交通过9例。真实反例覆盖错误环、自环、未保存next的丢链、复制新节点、仅交换值、重复值新节点，以及全部三份课程错误夹具。另实际运行5000节点并检查完整原身份反转图；模型按2000快照上限明确拒绝此大输入，未冒充生成完整演示。

学生同名ListNode把字段改成static的源真实编译执行后产生IncompatibleClassChangeError，不能覆盖可信平台实例字段而通过。仍保留原704正确/错误/编译/异常/超时/输出限制/资源/取消/清理/Docker不可用回归。没有宿主机Java回退，打印PASS不是判定来源。

## 中间引用状态与交互

每步以同一不可变快照渲染变量绑定、对象next箭头、值/身份字段表和代码高亮。h0/h1同值时仍有两个节点、稳定位置和ID；所有原对象一直显示，不把变量移走解释为GC。

局部测试逐步检查save-next仅保存后继绑定、reverse-next只改curr对象字段、move-prev/move-curr各只改对应变量，反转/未处理分区完整且不重叠，前后快照恢复不修改历史，源码行6/7/8/9映射正确。另由独立C审查在0—30个重复值输入上核对2449快照所有赋值效果，发现并修复“对象null”文案。正常模型对399节点生成1999快照，400节点透明拒绝，UI最多30节点。

浏览器实际走：704写草稿→切206→按需J6→语法预测→手算→两次引用预测（含错答解释）→保存/改链/移变量和回退恢复→播放暂停/重置/空链/单节点切换→三步补全→不同正确写法真实引导提交→独立运行成环和丢链失败→修正并通过9例→刷新恢复→真实重跑→切回704检查草稿仍在。完整参考默认折叠，展开记答案使用，通过总结明确已查看答案。

所有J1—J8逐单元输入错误再正确预测，记录各2次；刷新恢复8项，返回原课程步骤。静态检查不生成题目通过。704旧学习流程与旧草稿/源码过期/编译/超时E2E在最终汇总回归。

## 独立复核修复

- C发现空引用显示“对象null”，主agent改为null（未引用对象），用真实浏览器空链断言验证。
- B发现flush等待hash时继续输入会丢末次编辑；A改为哈希完成后核对最新源码并重试。浏览器实际暂停SHA调度、切题时粘贴新源码、释放后检查最新持久草稿；哈希结果仍真实。
- B发现存储失败微课重挂载会丢记录；A保留页面会话fallback，禁用Storage的真实浏览器跨单元和跨题仍累计，损坏原记录不覆盖。
- 主agent统一206的J3先修关联，并把J1调用器示例明确标为只读示意。

早期跨agent内容尚未落盘引起的类型错误保留在stage03-integration-in-progress.log；不是最终PASS。未删除、跳过关键测试或放宽身份判定以换取绿色结果。

证据：[镜像构建](evidence/stage03-runner-build.log)、[环境](evidence/stage03-doctor.log)、[206首次真实差分](evidence/stage03-differential.log)、[首轮完整学习](evidence/stage03-learning-e2e.log)、[恢复故障回归](evidence/stage03-persistence-e2e.log)、[最终汇总](evidence/stage03-verify.log)。

已知范围：演示最多30节点且2000快照；Java判题最多5000节点；仅预置参考模型，不调试任意学生代码。Monaco包体警告约3MB；用户学习效果、其他操作系统和断电故障未验。当前无执行环境阻塞。旧默认服务保留，加载新API需重启其终端，或按LOCAL_RUN使用5174/3002；验收服务结束后关闭。阶段04未启动。

最终截图来自上述真实测试：[重复值节点和分离的变量/next](evidence/stage03-reference.png)、[206真实通过与辅助事实总结](evidence/stage03-summary.png)、[八微课记录恢复](evidence/stage03-bridge.png)。主agent实际查看参考图和微课截图，确认h0/h1分别保留值5、next字段和变量绑定不混画。验收结束再次检查无项目任务容器残留；5174/3002和默认5173/3001最终均可绑定，原PID24568已不在运行。主agent未主动终止原服务，不推断其退出原因；目前可按默认地址重新启动。
