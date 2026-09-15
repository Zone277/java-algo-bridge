# 阶段03共享契约及派工

当前目录共享且非Git仓库，无隔离worktree。主agent独占根/锁/公共契约/入口/脚本/docs/tests全局验收。输入：AGENTS、PRODUCT_SPEC、03提示词、STATUS、CONTRACTS与本文件；CONTRACTS v1-stage03，704-v1/704-tests-v2保持，206-v1/206-tests-v1新增，算法206-reverse-v1。

## A 桥接与通用前端（复用curriculum02）

允许packages/curriculum/bridge/**（排除index.ts入口）以及apps/web/src/**（排除main.tsx和registry.ts）。禁止其他范围。先J1—J8内容与局部测试，再将已有App/LearningPanels/progress通用化，不能另建206页面系统。

bridge/content.ts导出bridgeUnits:BridgeUnit[]，bridgePrerequisites按十题映射；BridgeUnitSchema已提供id/version/title/objectives/cComparison/javaSource/explanation/prediction/relatedProblems。至少每单元一静态互动，按需跳转并返回来源课程，使用BridgeProgressSchema独立版本key。704旧存储兼容，新增206隔离key；progress helper为旧704调用保留兼容默认参数，泛化为按当前lesson配置，不能硬编码测试集。前置知识题型映射见TASKS。新题复用工作台、编辑器、播放器、反馈和Progress。完整ListNode定义可查看，引用图不等于JVM地址/GC。

主agent提供apps/web/src/registry.ts：lessonRuntimes为两题列表，每个{lesson:Lesson,demoInputs:{id,title,input:LessonInput}[],buildTrace(input,id):Promise<ReferenceTrace>,predictionAt(trace,index):ReferencePrediction|null,defaultInput:LessonInput,syntaxCheck:{prompt,answer:number|string,explanation}}。保留704既有testid和交互流程；增加lesson-206入口。ReferencePlayer共享onPrediction的answer类型为Answer（int/text），引用答案用h0/h1/null文本。题目切换必须保留草稿，防在途结果跨题写入，按题课程版本测试集校验。

## B 206课程/模型/引用图（复用visualizer02）

允许packages/curriculum/problems/206/**（排除index.ts）；packages/visualizer/src/**（排除index.ts）。禁止704目录和其他范围。

content.ts导出lesson206（satisfies Lesson）、demoInputs（至少empty/singleton/duplicates示例，默认duplicates={head:[5,5,8]}）。reference.ts导出REFERENCE_SOURCE、ALGORITHM_VERSION='206-reverse-v1'、REFERENCE_STEP_MAP。model.ts导出buildReferenceTrace(input:LinkedListInput,id):Promise<ReferenceTrace>、predictionAt。ID按规范h0…，输出nodes原ID顺序，next反向，head最后节点；expectedReversedList公用可信期望函数。共享ListGraph/LinkedListInputSchema、LINKED_STARTER_SOURCE已提供。≥8合法用例、2错误Java、完整语法/手算/推导/三步支架/独立/三层提示。覆盖环、丢链、新建节点及重复值身份反例。保持方法原样，不能用源码匹配判定。

扩展同一ReferencePlayer支持array/list，保留704的int预测，206文本预测hN/null。变量绑定与对象next分层显示，所有输入节点始终存在，不随变量不可达消失；稳定位置/ID/值不同概念。每步save-next→reverse-next→move-prev→move-curr，各自断言字段与绑定变化；前后退直接恢复快照。模型2000快照上限，不能为5000节点生成无限快照；超限显式拒绝，差分只对模型支持输入，判题5000仍需真实通过。局部不变量/冻结/身份/映射测试必须独立。

## C 真实runner（复用frontend01）

允许apps/api/src/**（排除main.ts）；runner/java/**（保留Gson jar不改）。禁止其他范围。扩展同一JavaRunner/API两题注册及ListNode可信适配。inputHash按206 {head:[]}或704固定键计算。保留TEST_INPUTS旧704导出以兼容原测试；另导出206输入或注册查找。API解析共享RunRequestSchema（704/206联合）并按题核对版本，未实现题仍拒绝。

镜像新tag由主agent统一scripts引用为java-algo-bridge-runner:21.0.12-stage03；CONTAINER_LABEL保留旧值兼容项目清理。固定基础digest不变。ListNode独立平台类预编译，Java编译设置可信classpath并防学生同名类抢占。可信Adapter使用IdentityHashMap追踪原对象，返回图包含原节点的实际字段，标记未知节点/根为结构错误，不能按值合并。wire可新增WRONG_ANSWER以及graph、reason字段；宿主判定原身份反向、值保持、无环/丢失/新节点，环遍历有界。不可把学生stdout当协议或通过，保留原资源/编译/执行/清理限制。读取课包lesson206注册，数据不存在前可先编写待集成，不创建占位课包。

## 验收

各agent运行其路径eslint/typecheck/局部vitest；暂时跨agent未完成产生的编译错误如实报告。主agent统一runner:build、check/build、真实206差分/反例/最大输入、704原18Docker测试、两题真实E2E与桥接互动。运行前`. ./scripts/use-node.ps1`。端口5173/3001当前被已有本项目dev占用，不关闭；主agent将测试配置改为可选回环5174/3002。交付包含变更路径、真实命令结果、接口建议和阻塞；完成后释放路径。
