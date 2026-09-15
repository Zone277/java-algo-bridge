# 公共契约 v1

状态：阶段00规范冻结，尚非可执行Zod实现。阶段01由主agent独占 packages/contracts，将本规范转为strict schema、TS推导类型与跨字段测试；修改本文件须同步DECISIONS并重新派发版本。所有对象拒绝未知字段，不使用any。下列类型为规范记法，标为可选之外均必填。

阶段01实施说明（v1-stage01）：`packages/contracts/src/index.ts`已实现704的严格RunRequest、RunResult、ApiError、Health、Session及共享类型；其余九题请求暂不开放。`learning.ts`提供Progress和ReferenceTrace分离结构/只读类型以及Lesson类型，完整Lesson实例、题目模型不变量/引用完整性和全题输入schema留待各自课程阶段，不将这些未实现部分标为已验收。Trace.finalOutput当前仅int对应704，之后扩题由主agent按本规范增加其他输出联合。GET /api/health固定返回`{status:"ok",runner:{available:boolean,reason:string|null}}`，GET /api/session返回`{token:string}`。

## 公共值与输入

ProblemId = 字符串联合 `"704" | "283" | "977" | "1" | "20" | "206" | "21" | "104" | "70" | "3"`；BridgeId = J1—J8；版本为非空稳定字符串；Hash为64位小写十六进制SHA-256；时间为UTC ISO8601。int为Java有符号32位整数，禁止NaN/Infinity/小数。所有字符串/数组都受下述题目限制及请求字节限制约束。

sourceHash/referenceSourceHash = 原样源码UTF-8字节SHA-256，不预先改换行或格式；inputHash = 已验证Input按对象键字典序递归排序、数组保持原顺序、紧凑JSON编码的UTF-8 SHA-256。Hash实现须有换行、Unicode、键顺序测试。来源字段是服务端/本地参考模型生成的类型边界，不是浏览器提供的安全凭证。

| problemId | Java公开实例方法（class Solution） | JSON Input 与本站判题上限 | 结构化实际输出 / 判定 |
|---|---|---|---|
| 704 | `public int search(int[] nums, int target)` | `{nums:int[], target:int}`；1—10000项，严格升序，值/target为-9999..9999 | `{kind:"int",value:int}`；命中返回对应下标，不存在-1 |
| 283 | `public void moveZeroes(int[] nums)` | `{nums:int[]}`；1—10000项，int全范围 | `{kind:"int-array",values:int[]}`；调用后原数组内容，非零稳定后接零；不能检查重新赋值后的局部参数 |
| 977 | `public int[] sortedSquares(int[] nums)` | `{nums:int[]}`；1—10000项，非降序，值-10000..10000 | int-array；平方结果非降序、长度一致 |
| 1 | `public int[] twoSum(int[] nums, int target)` | `{nums:int[],target:int}`；2—10000项，值/target为-10^9..10^9，恰一个不同索引无序对满足和 | int-array；恰两个不同合法下标，和等于target，顺序任意；预期不是固定下标顺序 |
| 20 | `public boolean isValid(String s)` | `{s:string}`；1—10000字符，仅`()[]{}` | `{kind:"boolean",value:boolean}`；匹配类型、顺序、嵌套及最终空栈 |
| 206 | `public ListNode reverseList(ListNode head)` | `{head:int[]}`；0—5000项，值-5000..5000 | list-graph；原节点身份顺序严格反转、值不变、无环、无丢失/新增节点，尾next=null |
| 21 | `public ListNode mergeTwoLists(ListNode list1, ListNode list2)` | `{list1:int[],list2:int[]}`；各0—50项，非降序，值-100..100 | list-graph；恰复用两个输入链节点，值不变、非降序、无环；相等值跨链次序不强制，哑节点不能进入返回链 |
| 104 | `public int maxDepth(TreeNode root)` | `{root:(int|null)[]}`；最多1000个非null节点、深度最多128，值-100..100 | int；空树0，按节点数计算深度 |
| 70 | `public int climbStairs(int n)` | `{n:int}`；1..45 | int；1→1、2→2，递推；0不进入正式用例 |
| 3 | `public int lengthOfLongestSubstring(String s)` | `{s:string}`；0—10000字符，本站仅U+0020..U+007E可打印ASCII（含空格） | int；最长连续无重复子串长度，非子序列；不宣称Java char覆盖任意完整Unicode字符 |

上限为本站教学输入范围，界面透明展示；超限返回INVALID_INPUT（reason=SITE_LIMIT），不能报告WRONG_ANSWER。704/283/977/20不把空输入混进正式测试。额外鲁棒性实验应另标注，不计本站正式提交。判题预期使用可信原始输入，防学生修改输入影响预期。

树采用队列式紧凑层序：对每个非null父节点依次消费左右孩子，null不入队。空树规范为[]；非空根不能为null；尾部null移除后必须恰有可到达节点，拒绝多余孤立数据。例如[1,null,2,3]表示1的右子2、2的左子3，深度3；[1,null,null,2]非法。不使用堆下标定位。

平台提供独立可查看的 `ListNode { public int val; public ListNode next; public ListNode(); public ListNode(int val); public ListNode(int val,ListNode next); }` 与对应 `TreeNode { public int val; public TreeNode left,right; public TreeNode(); public TreeNode(int val); public TreeNode(int val,TreeNode left,TreeNode right); }`。构造器按参数初始化字段，默认0/null；学生不重复声明平台类。

list-graph输出形状为 `{kind:"list-graph",headId:string|null,nodes:{id:string,value:int,nextId:string|null}[]}`。调用器构造输入时以对象身份映射ID（206为h0…；21为a0…/b0…），保存原节点集合/值，返回后按原对象检查边与根，不以val作身份；未注册对象标记为结构错误，不伪分配成输入节点。遍历最多输入节点总数+1步并检测重复访问，环/新节点/丢节点为WRONG_ANSWER结构原因，有界输出而非无限打印。快照ID与此执行ID属于不同通道。

## Lesson

Lesson字段：`schemaVersion:1, id:ProblemId, slug:string, title:string, order:int(1..10), lessonVersion:string, prerequisites:BridgeId[], objectives:string[], source:{platform:"LeetCode",number:int,url:string}, taskSemantics:string, siteLimits:{description:string,inputSchemaId:string}, steps:ContentStep[], starter:{source:string,fileName:"Solution.java"}, reference:ReferenceDefinition, hints:[Hint,Hint,Hint], predictionChecks:PredictionCheck[], guided:GuidedExercise, independent:{initialSource:string}, commonErrors:CommonError[], testSuite:TestSuite, visualization:{modelId:string,modelVersion:string,inputIds:string[],maxItems:30,maxSnapshots:2000,maxTreeDepth:8}`。

- ContentStep = `{id:string,kind:"syntax"|"understanding"|"derivation"|"prediction"|"reference-demo"|"guided-code"|"independent-code"|"summary",title:string,body:string,relatedIds:string[]}`；包含必要语法、输入输出解释、手工模拟、初始办法/目标办法推导、不变量、边界、复杂度。引用ID必须存在，顺序支持学习闭环，不把访问标记通过。
- ReferenceDefinition = `{source:string,fileName:"Solution.java",sourceHash:Hash,algorithmVersion:string,stepMap:{stepId:string,startLine:int,endLine:int}[]}`；行号1起、闭区间、在该版源码内，映射唯一，参考默认折叠，显式打开记录viewedSolution。演示显示完整参考代码也算看过答案。
- Hint = `{id:string,level:1|2|3,body:string}`；依次概念、结构/不变量、伪代码；完整答案不作为第四层自动展开。
- Answer = `{kind:"choice",optionId:string}` 或 `{kind:"int",value:int}` 或 `{kind:"text",value:string}`。PredictionCheck = `{id:string,prompt:string,answer:Answer,options?:{id:string,label:string}[],explanation:string,checkpointId:string}`，至少2个；choice必须提供至少两个ID唯一的options且正确optionId存在，int/text禁止options。只做静态教学检查。
- GuidedExercise = `{id:string,stages:{id:string,instruction:string,scaffoldSource:string,checkKind:"static-practice"}[],finalCheck:"real-java-submit"}`；至少3步递减支架，静态练习成功不记guidedPassed。
- CommonError = `{id:string,description:string,counterexampleInputId:string,explanation:string}`，至少3种。
- TestSuite = `{version:string,cases:{id:string,input:Input,expected:Output,coverage:string}[],wrongFixtures:{id:string,source:string,targetedCaseIds:string[]}[]}`；Input由Lesson.id判别，每题8—16个合法用例和至少2个故意错误Java夹具。206/21 expected使用对应输入身份；1 expected仅是合法答案示例，判定用表中谓词。结构化协议预算1 MiB/例、16 MiB/任务，与标准流64 KiB/任务分开计量；注册时验证有效输出加协议开销可容纳，逐例有界读取。
- 至少2个可切换演示输入，必须能关联到同题有效输入；方法签名由注册题目确定；starter/independent仅骨架，不含完整解法；所有Java资产后续真实编译验证，阶段00无“已通过”承诺。

Lesson示例轮廓（节选，非完整合法课程包）：`{schemaVersion:1,id:"704",slug:"binary-search",title:"二分查找",order:1,lessonVersion:"704-v1",prerequisites:["J1","J2","J8"],...}`。这里明确省略教学正文和测试，不创建占位Lesson让schema通过。正式课程完整样例及schema实例测试在阶段02生成。

## RunRequest / RunResult

RunRequest为严格判别联合：

```ts
type RunRequest =
  | { problemId: ProblemId; lessonVersion: string; source: string; mode: "run"; input: Input }
  | { problemId: ProblemId; lessonVersion: string; source: string; mode: "submit" };
```

lessonVersion必须匹配服务端当前注册课程，错误版本INVALID_INPUT。source非空、UTF-8最多65536字节，总JSON请求体最多131072字节。run要求输入经过题目白名单schema和语义校验；submit拒绝input/expected/tests等字段，使用服务器测试集。未实施但在固定十题内的题目返回INVALID_INPUT / PROBLEM_NOT_READY。请求中不接受sourceHash，以API计算为准。

示例：`{"problemId":"704","lessonVersion":"704-v1","source":"class Solution { public int search(int[] nums, int target) { return -1; } }","mode":"run","input":{"nums":[-4,2,9],"target":2}}`。相同源码的submit示例去掉input并改mode为submit。

RunResult字段：`schemaVersion:1, origin:"student-java", requestId:string, problemId:ProblemId, lessonVersion:string, sourceHash:Hash, mode:"run"|"submit", testSuiteVersion:string|null, phase:"validation"|"queue"|"compile"|"execute"|"judge"|"infrastructure", status:RunStatus, reason:string|null, cases:CaseResult[], stdout:string, stderr:string, diagnostics:Diagnostic[], timings:{queueMs:number,compileMs:number,executeMs:number,totalMs:number}, output:{stdoutBytes:int,stderrBytes:int,truncated:boolean}, limits:{cpu:number,memoryMiB:int,pids:int,sourceBytes:int,outputBytes:int,perCaseProtocolBytes:int,taskProtocolBytes:int,compileMs:int,perCaseMs:int,totalMs:int}, cleanup:{status:"done"|"pending"|"failed",message:string|null}`。

CaseResult = `{caseId:string,inputHash:Hash,status:"PASSED"|"WRONG_ANSWER"|"RUNTIME_ERROR"|"TIME_LIMIT"|"RESOURCE_LIMIT"|"OUTPUT_LIMIT",actual:Output|null,expected:Output|null,message:string,elapsedMs:number}`。stdout/stderr是真实流的有界前缀；输出字节数记录已观察数量（不能声称未读取部分总长已知）；时间为观测毫秒、非负，不用它证明渐进复杂度。

Diagnostic = `{fileName:string,severity:"error"|"warning"|"note",message:string,line:int|null,column:int|null,belongsToStudentSource:boolean}`；学生位置1起，来自原始Solution.java；平台诊断不得伪映射到学生行。Output为上文int/boolean/int-array/list-graph判别联合，不含Trace。

| RunStatus | 意义与判定 |
|---|---|
| PASSED_LOCAL_TESTS | 本次所选用例均经真实Java执行和服务端判定；run只表示该输入，submit才表示整套本站测试 |
| WRONG_ANSWER | Java完成但语义/结构不满足 |
| COMPILE_ERROR | 学生源码真实javac失败；可信平台资产故障为SYSTEM_ERROR |
| RUNTIME_ERROR | 学生执行异常/异常退出；缺完整协议且无已知资源证据时保留诊断，不伪判成功 |
| TIME_LIMIT | 监督器确认编译、用例或已执行任务总时限命中，phase区分；纯排队超时用SYSTEM_ERROR/QUEUE_TIMEOUT |
| RESOURCE_LIMIT | 有OOM/PID/受限空间等证据，不能仅用退出码137猜测OOM |
| OUTPUT_LIMIT | 标准流累计或结构化输出预算命中，终止、truncated=true，不判通过 |
| RUNNER_UNAVAILABLE | CLI/daemon/固定镜像/必要限制不可用，reason细分；不是学生错误 |
| INVALID_INPUT | 字段、题目语义、字节上限、本站上限、课程版本不符合 |
| SYSTEM_ERROR | 平台/协议设施/队列满/清理等故障；记录reason，与学生算法区分 |
| CANCELLED | 用户断开等取消；仍清理，不能更新通过 |

首版只有终态响应，不声明未实现的QUEUED/RUNNING推送。格式错误到无法可靠识别problemId/source时，HTTP返回独立ApiError `{requestId:string,status:"INVALID_INPUT"|"SYSTEM_ERROR",reason:string,message:string}`，不编造sourceHash。HTTP400校验失败、413过大、403 Host/Origin/令牌拒绝、429队列满、503 runner不可用、500平台故障；正常执行（含学生错误）200。前端不得把HTTP错误解读成算法失败。

RunResult示例语义（Hash在运行时计算，不使用假值充当证据）：上面的run返回origin=student-java、phase=judge、status=WRONG_ANSWER、actual={kind:"int",value:-1}、expected={kind:"int",value:1}、mode=run、testSuiteVersion=null、一个CaseResult；若Docker缺失则phase=infrastructure、status=RUNNER_UNAVAILABLE、reason=DOCKER_CLI_MISSING、cases=[]、stdout/stderr为空、diagnostics=[]、执行计时0、cleanup=done。它们是协议示例，不是本轮运行结果。

服务端终态只从执行证据和可信比较生成，不接受学生自报状态。异常后未执行用例不填PASSED；资源/输出/超时优先于不完整结果的错误答案；平台故障不得伪装学生错误。仅完整submit全通过且cleanup=done、课程/测试集/提交源匹配可更新通过记录。

## ReferenceTrace

`ReferenceTrace = {schemaVersion:1,mode:"reference-model",problemId:ProblemId,algorithmVersion:string,referenceSourceHash:Hash,inputId:string,inputHash:Hash,initialState:InitialSnapshot,snapshots:Snapshot[],finalOutput:Output}`。

InitialSnapshot = `{snapshotId:"initial",variables:Variable[],structures:Structure[],explanation:string}`，没有执行后stepId。Snapshot = `{snapshotId:string,stepId:string,codeRange:{startLine:int,endLine:int},variables:Variable[],structures:Structure[],explanation:string,checkpointId?:string}`；snapshotId每轨迹唯一稳定（可为stepId+迭代序号），stepId跨输入稳定映射参考代码，循环可以多次出现同stepId。快照是该代码步骤执行后的状态；预测在揭示对应快照之前提交。最多2000，超限返回显式模型错误，不给伪完整Trace。

Variable = `{name:string,value:Value}`；Value = `{kind:"int",value:int}` / `{kind:"boolean",value:boolean}` / `{kind:"char",value:string}` / `{kind:"string",value:string}` / `{kind:"reference",objectId:string|null}`；char恰一个UTF-16代码单元，本站输入按题限制。

Structure按kind严格联合，共同含id:string：

- array：`{kind:"array",id,values:int[],indices:{name:string,index:int}[]}`，索引允许算法所需哨兵-1/length但不得渲染成有效元素。
- map：`{kind:"map",id,entries:{key:Value,value:Value}[]}`，键唯一，顺序明确由模型给出。
- stack：`{kind:"stack",id,items:Value[],topIndex:int|null}`，空栈topIndex=null，否则为length-1。
- list：`{kind:"list",id,nodes:{id:string,value:int,nextId:string|null}[],bindings:{name:string,objectId:string|null}[]}`，边和变量绑定分开；节点ID稳定且所有非null引用存在。
- tree：`{kind:"tree",id,nodes:{id:string,value:int,leftId:string|null,rightId:string|null}[],rootId:string|null,frames:{frameId:string,nodeId:string|null,phase:"enter"|"await-left"|"await-right"|"return",leftDepth:int|null,rightDepth:int|null,returnValue:int|null}[]}`，frames按栈底到栈顶，调用帧身份不同于节点身份。
- dp：`{kind:"dp",id,values:(int|null)[],activeIndex:int|null}`，null表示未计算。
- window：`{kind:"window",id,text:string,left:int,rightExclusive:int,members:Value[]}`，半开区间、0≤left≤rightExclusive≤text.length。

Trace示例轮廓：704输入[-4,2,9]/target2，initial只有nums引用和target；init-left/init-right分别初始化left=0/right=2；首个compute-mid快照mid=1，stepId="compute-mid"映射该版参考源第6行；比较命中后finalOutput={kind:"int",value:1}。206仍为未来规范：重复值节点r0/r1均为5，初始r0.next=r1；保存next后变量next=r1，改链后r0.next=null但r1仍存在。

所有快照深拷贝/冻结；播放器不能修改旧状态；同一步所有视图读同一个对象。中间不变量按步骤定义：704 compute-mid时检查mid范围，更新区间后旧mid可在区间外；206在循环边界检查已反转/未处理分区，中间绑定尚未移动时不能误套边界断言。Java参考实际输出差分与中间不变量均必须测试；仅最终相等不充分。

## Progress

`Progress = {schemaVersion:1,problemId:ProblemId,lessonVersion:string,startedAt:string|null,completedStepIds:string[],predictionResults:PredictionResult[],drafts:{guided:Draft,independent:Draft},hintsUsed:{hintId:string,firstUsedAt:string}[],viewedSolution:boolean,viewedSolutionAt:string|null,guidedPassed:PassRecord|null,independentLocalPassed:PassRecord|null,updatedAt:string}`。

Draft = `{source:string,sourceHash:Hash,updatedAt:string}`；PredictionResult = `{checkpointId:string,answer:Answer,correct:boolean,attempts:int,lastAttemptAt:string}`，attempts≥1；PassRecord = `{requestId:string,sourceHash:Hash,lessonVersion:string,testSuiteVersion:string,passedAt:string,viewedSolutionBeforePass:boolean,hintIdsBeforePass:string[]}`。两个通过字段名称中的Passed表示记录而非裸boolean，以保留依据。

初始语义示例：startedAt=null、completedStepIds=[]、predictionResults=[]、两草稿分别是对应骨架及计算hash、hintsUsed=[]、viewedSolution=false、viewedSolutionAt=null、guidedPassed=null、independentLocalPassed=null。观看参考演示后可能viewedSolution=true，但两个通过记录仍为null。

存储key为`java-algo-bridge:v1:progress:<problemId>:<lessonVersion>`。schema或课程变化保留旧key，提示迁移/重置，不无提示覆盖；显式清除全部本地学习数据才删除历史。损坏数据隔离并提示，存储不可用降级内存会话。

仅同题、同课程、同模式提交时草稿hash的真实submit成功才能设置对应PassRecord；mode guided/independent是前端提交上下文，与run/submit请求模式正交。源码编辑后历史通过可保留，但当前代码状态由hash重新匹配，不能仍显示当前代码已通过。答案标记单调保留；看过答案后的独立模式通过显示“独立模式通过本站测试（已查看答案）”，不能称独立掌握。访问、播放、预测、静态填空均不产生通过记录。进度为本机学习辅助，不是不可篡改成绩证明。

## 阶段02实施绑定

CONTRACTS v1-stage02：`LessonSchema`现已实际校验704完整课程；其他题仍是后续规范。课程`704-v1`，参考算法`704-closed-v1`，测试集更新为`704-tests-v2`（13例）。API和前端读取同一课程数据源，服务器在注册时校验Lesson，不能分别维护两套用例。参考源码及错误夹具以TypeScript字符串单源存储，真实runner将原文写入Solution.java，不另存漂移的Java副本。

`ReferencePrediction={checkpointId,prompt,answer:number,explanation}`为参考播放器内部契约，与RunResult不同通道。`buildReferenceTrace(input,inputId)`计算真实SHA256并深度冻结；`predictionAt(trace,index)`按目标快照推导答案。完整checkpointId由algorithmVersion、inputHash、snapshotId及局部检查点组成；默认mid和边界两处，首轮命中则第二处预测返回值。切换输入创建新轨迹，旧输入答案不会替代新输入预测。

播放上限30项，模型支持有效判题输入用于差分、最多2000快照。mid只在有效循环体中定义；边界更新后的旧mid可以位于新区间之外，下一次循环条件快照清除其块作用域绑定。所有变量表、SVG、区间解释和代码高亮读取同一当前快照；快照为对应语句执行后的状态。

草稿保存先计算两种模式源码hash，异步版本号阻止旧计算覆盖新编辑。恢复时验证schema、顶层课程版本和两份源码hash；损坏记录保留、进入内存模式。阶段01旧draft key仅显式导入、原条目保留。历史PassRecord按课程、测试集、源码分别标注失效；旧测试集submit响应拒采用。参考源码展开记答案使用；三步自检只记学习操作，最终完整源码必须真实submit。

## 阶段03实施绑定（v1-stage03）

前述未实现描述保留为历史；当前已实际注册704和206，其他八题仍拒绝。RunRequest由problemId/lessonVersion及run/submit组成严格联合；206输入`{head:int[]}`，0—5000项、-5000..5000。课程206-v1，测试集206-tests-v1（9例），算法206-reverse-v1；704版本不变。LessonSchema按704/206判别输入与输出，并校验206原节点反向期望。

ListNode在独立可信文件预编译，定义由公共LIST_NODE_SOURCE在界面展示。学生只编写完整Solution及辅助代码，平台类由可信classpath提供。Adapter用IdentityHashMap生成h0…身份，保留所有原对象，返回后读取原对象实际val/next。实际graph的nodes以原输入顺序序列化，headId为返回引用；unknown身份保留为错误证据，不冒充原节点。宿主judgeListGraph不依赖记录数组顺序，核对原ID集合、原值、反向next及正确根；原字段精确匹配保证无环、无丢失/新增和尾null。运行中错误图仍可包含环或未知引用供反馈，不能按成功图强行校验而误报平台故障。

ReferenceTrace.finalOutput现在为int或list-graph，通道标签不变。Structure.list校验节点ID唯一、next/bindings目标存在、变量名唯一。节点以稳定ID定位，变量绑定与对象字段分别渲染；空引用显示null（未引用对象），不是“对象null”。所有原节点保留，不做GC推断。206微步骤save-next/reverse-next/move-prev/move-curr分别映射参考源6/7/8/9行，只有改链步骤改变next字段。model最多2000快照：399节点1999步可生成，400节点明确拒绝；播放器最多30节点，真实判题5000节点单独验证。

ReferencePrediction.answer从number扩展为number|string：704整数，206为hN或字符串null。提交转为Answer的int/text，预测标识含算法/输入hash/快照，动态计算下一状态，不挪用学生执行输出。

BridgeUnitSchema实际包含id(J1—J8)、bridge-v1版本、title、objectives、cComparison、javaSource、explanation、prediction、relatedProblems。BridgeProgressSchema为`{schemaVersion:1,version:"bridge-v1",results:{unitId,answer,correct,attempts,lastAttemptAt}[]}`，key为java-algo-bridge:v1:bridge:bridge-v1；所有微课检查明确静态，不产生任何题目PassRecord。桥接先修映射关联全部十题，当前可返回704/206工作台。

Progress按题+课程版本保存两种草稿；704旧key完全兼容。切题flush在真实SHA计算后再核对最新源码，变化则重试；执行时禁用切题，避免跨题归属。206 reducer显式接收其测试集版本，不落回704默认版本。存储不可用的微课记录在同一页面会话跨单元保留，刷新仍不保证恢复。

## 阶段 04 实施冻结（v1-stage04）

`packages/contracts/src/problems.ts` 是十题 ID、顺序、元数据、输入解析、可信期望及语义判定的实现事实来源；`index.ts` 的 RunRequest 为十题严格判别联合。服务端 `READY_PROBLEM_IDS`、课程 registry 与 `PROBLEM_ORDER` 必须完全同序且恰好包含十题，未知题号在调用 Docker 前返回 `INVALID_INPUT`。

实际输出联合为 `int | boolean | int-array | list-graph`。run 与 submit 都由固定可信适配器读取 Java 返回值或调用后数据；submit 保留课程 `testSuite.cases[].id`，不得生成会掩盖课程覆盖点的替代 ID。283 的 void 调用保留并读取原参数数组对象；1 使用不同合法索引的谓词；206/21 使用 Java 对象身份表；104 用紧凑队列层序构造 TreeNode；3 的字符串按连续下标窗口判定。

ReferenceTrace 的 `finalOutput` 使用同一 Output 联合但通道固定为 `reference-model`，不能被送入学生结果通道。结构状态联合已实施 array、map、stack、list、tree、dp、window；同一不可变快照驱动全部显示和代码范围。list 的稳定教学 ID 与真实执行对象 ID 各自属于其通道；tree 的对象图和递归 frame 分开表达。模型达到 display/snapshot 限制时必须显式拒绝，不能截断后给出貌似完整的 finalOutput。70 的当前演示上限为 n<=30，本站真实判题仍覆盖 1..45。

十题当前 Lesson/Test/Algorithm 版本分别为：704 `704-v1/704-tests-v2/704-closed-v1`；283 `283-v1/283-tests-v1/283-stable-compaction-v1`；977 `977-v1/977-tests-v1/977-two-pointers-v1`；1 `1-v1/1-tests-v1/1-complement-map-v1`；20 `20-v1/20-tests-v1/20-unmatched-open-stack-v1`；206 `206-v1/206-tests-v1/206-reverse-v1`；21 `21-v1/21-tests-v1/21-dummy-merge-v1`；104 `104-v1/104-tests-v1/104-recursive-depth-v1`；70 `70-v1/70-tests-v1/70-rolling-dp-v1`；3 `3-v1/3-tests-v1/3-last-seen-window-v1`。
