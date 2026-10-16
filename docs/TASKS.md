# 阶段、所有权与验收

基线PRODUCT_SPEC v1 / CONTRACTS v1。只在用户明确指定的阶段实施；以下为后续派工计划，不是已完成工作。阶段依赖00→01→02→03→04→05→06，每阶段结束停止。

## 本轮实际派工

客户端实际调用collaboration.spawn_agent创建如下任务。平台说明及各agent Get-Location确认共享当前目录，无worktree。允许写入路径均为空，禁止所有修改/安装；主agent唯一写入六份新文档，不存在并行文件争用。

| 实际任务ID | 目标与输入 | 实际交付与检查 |
|---|---|---|
| /root/teaching | A教学：AGENTS、PRODUCT_SPEC、00、02、03；审查顺序、先修、704/206学习步骤 | Get-Location/Get-Content/Get-ChildItem PASS；保留顺序、先修映射、步骤级不变量及重复值身份反例；变更路径无；运行测试NOT_RUN；无只读阻塞 |
| /root/runner | B运行安全：AGENTS、PRODUCT_SPEC、00、01；核对本机容器可行性和I/O/限制/清理 | Get-Command/Get-Service/Test-Path/CIM/端口检查；Docker不可调用BLOCKED，给出打印PASS、数组改绑、杀CLI容器残留等反例；变更路径无；未运行Java |
| /root/architecture_review | C架构测试：AGENTS、PRODUCT_SPEC、00—06；阶段/所有权/契约反例与独立文件复核 | Get-Location/Get-Content/Get-ChildItem PASS；给出283、1、206、104、sourceHash反例，复核主agent实际文档；变更路径无 |

派工时契约v1待冻结，均以PRODUCT_SPEC v1提建议，由主agent统一决定；不允许子agent自行改公共接口。交付要求含变更路径、真实命令与结果、接口建议、已知问题/阻塞；以上来自真实工具回报，不是模拟讨论。

C最终独立审查PASS（仅阶段00文档）：发现合法大输入的结构化输出容量冲突及选择题options缺失，主agent修订后C再次读取实际文件确认；没有业务/Java运行测试。主agent另完成13个原文件哈希不变、六文档格式/链接检查。

## 后续所有权及门禁

所有阶段主agent独占：根package.json/锁文件/公共tsconfig、packages/contracts/**、全局注册入口、docs/STATUS.md、契约/架构决策。其他写入必须精确分配路径；工作agent要改共享接口只提出补丁建议，由主agent串行集成。今后若建立Git并使用worktree，须记录真实路径；否则继续共享目录互斥写入。每批同时最多3工作agent。

| 阶段 / 入口 | 执行顺序与写入范围 | 验收条件 / 计划命令 |
|---|---|---|
| 00 / 00-bootstrap | A/B/C只读→主agent六文档→C独立复核→主agent修订 | 文档及链接检查、原文件hash不变；双来源、不同方法语义、环境阻塞明确；本轮不建业务 |
| 01 / 01-foundation-runner | 主agent先根配置/契约/脚本→A apps/web/**（排除全局入口）→B apps/api/**与runner/java/**（排除注册入口）→C tests/runner/**及tests/integration/**；先单任务容器→HTTP→前端 | doctor、runner:build、check、build、test:runner；704正确/错误/编译/异常/超时/输出限制、并发隔离、退出清理、旧hash；缺Docker真实验证BLOCKED |
| 02 / 02-binary-search | A packages/curriculum/problems/704/**但排除model.ts/model.test.ts；B独占这两个文件及packages/visualizer/**；C apps/web/**排除入口 | check、test:runner、真实704 e2e（阶段内补可运行用例）；≥8用例/2错夹具/2预测，参考Java差分+中间不变量、全教学路径、草稿恢复；不得拦截API伪通过 |
| 03 / 03-java-bridge-linked-list | 验证704门禁→A packages/curriculum/bridge/**；B packages/curriculum/problems/206/**；C先runner/java/**和apps/api/**非注册路径，再释放后分批apps/web/**、packages/visualizer/** | 206全闭环及704回归；重复值ID、断链/环/新节点拒绝、前后退恢复；J1—J8互动和语义核对；check/test:runner及704/206真实e2e |
| 04 / 04-expand-eight | 主agent先串行补公共适配/渲染能力→三批283/977/1，20/21/104，70/3；每agent独占分配题号目录及局部测试，公共renderer不交叉 | 每批check/test:runner、704/206回归；每题≥8有效例/2错Java/2预测、真实差分和中间不变量；十题可学可运行才完成 |
| 05 / 05-audit-polish | A教学/B安全/C前端只读独立审查→主agent登记严重度/复现→互斥修复窗口→复测；主agent维护docs/REVIEW.md | check/build/test:runner/test:e2e/verify；704、206、3完整真实e2e、其余真实冒烟；实际限制、离线请求、旧hash、可访问性、存储故障 |
| 06 / 06-local-acceptance | 安全干净验证目录/真实worktree→按锁安装→全验收；主agent更新README、docs/ACCEPTANCE.md、STATUS | npm ci、doctor、runner:build、check、build、test:runner、test:e2e、verify；健康端点及实际浏览器；检查skip数，列真实地址/停止方式；有BLOCKED不得说全部完成 |

表中简写命令均为未来`npm run <name>`，当前不存在这些脚本。02/03按实际建立的用例过滤运行，主agent实现脚本后记录准确命令，不预称已执行。镜像/浏览器不可用如实BLOCKED；04必须704与206两种真实闭环通过，不带阻塞扩题。

每次新派工必须补齐：目标、实际输入文件、冻结契约版本、明确允许写入及排除路径、当时可运行的验收命令、预期交付。全局入口路径在01建文件时由主agent列明再派工，未列明不能让多个agent自行创建同一入口。

## 已采纳教学路径

先修：704 J1/J2/J8；283/977/70 J1/J2/J3/J8；1 J1/J2/J3/J5/J8；20/3 J1/J2/J4/J5/J8；206/21 J1/J2/J3/J6/J8；104 J1/J2/J3/J7/J8。J8按错误需要呈现。02提供704必需微知识，03再统一J1—J8，不让未开发课程阻断首题。

704：对应方法参数/返回、length/while静态预测→辨别下标和值、命中/缺失手算→两处mid/区间预测→带固定标签的闭区间参考演示→初始化/循环、更新、返回三段撤支架→独立骨架、真实失败/修正/submit通过→刷新恢复。可观察标准包括单元素/两元素/首尾/间隙输入，compute-mid范围及边界更新区间缩小；不能将更新后的旧mid强行要求在新区间。

206：区分对象与引用值、变量重绑与next修改→明确返回新头且复用原节点→预测保存next及改链→依次保存curr.next、改curr.next、移prev、移curr→三段引导→独立骨架真实结构验证→回退/刷新恢复。必须覆盖空/单/双/重复值、丢链、环、新节点；循环边界检查分区完整，微步骤用各自断言；任何暂时不可达节点不画成已GC。

看过参考代码的成功保留答案使用事实；预测/访问/播放不产生真实通过；学习效果等待学生试用，测试不替代学习效果证据。

## 阶段01实际派工

主agent先建立根package.json/tsconfig/测试配置、npm workspaces、RunRequest/RunResult共享schema、main.ts/main.tsx入口、doctor/build/dev/check/test脚本和package-lock，再调用三个原生subagent。仍为共享目录，未创建worktree。

| 任务 | 允许写入 | 禁止范围 / 交付 |
|---|---|---|
| /root/frontend01 | apps/web/**，排除package.json与src/main.tsx | 其他全部禁止；实现本地Monaco工作台与真实API反馈；typecheck/build/eslint实际通过，浏览器集成由测试agent验证 |
| /root/runner01 | apps/api/**排除package.json/main.ts；runner/java/** | 根/scripts/contracts/docs禁止；实现Docker Supervisor/Adapter、API及清理；Gson jar由主agent经单次授权写入，其后释放 |
| /root/tests01 | tests/** | 所有实现与根配置禁止；独立Java反例、HTTP边界、资源隔离及Playwright真实路径 |

各派工输入为AGENTS、PRODUCT_SPEC、CONTRACTS v1-stage01、01提示词及已建立共享schema；验收命令分别为check/build、test:runner与test:e2e，Node在进程内使用.tools固定24.20.0。主agent独占全局入口/锁/共享类型/docs/集成，写入范围没有争用。测试agent提出缺陷时由对应实现者修复，释放路径后主agent才接手。最终真实结果见STAGE01_ACCEPTANCE。

## 阶段02实际派工

平台说明、当前路径及各agent确认共享checkout，未创建worktree。主agent先建立两个workspace、共享LessonSchema/ReferencePrediction、注册入口和锁文件，再冻结[STAGE02_HANDOFF](STAGE02_HANDOFF.md)并派发；最多三个工作agent同时运行。

| 原生任务 | 目标 / 允许写入 | 实际交付 / 验收 |
|---|---|---|
| /root/curriculum02 | 704课程包，排除index.ts/model.ts/model.test.ts | content.ts/reference.ts/content.test.ts；语法/原创题面/手算/推导、13例、2错Java、三层提示/三步支架；4课程测试PASS |
| /root/visualizer02 | model.ts/model.test.ts和packages/visualizer/src/**，排除index.ts | 不可变模型、动态预测、ReferencePlayer；6模型测试PASS，真实差分由主agent验 |
| /root/frontend01（复用） | apps/web/src/**排除main.tsx | App/LearningPanels/progress/useLearningProgress/styles；类型/构建/lint PASS，真实浏览器由主agent验 |

第三次新spawn遇客户端任务数量限制，实际通过followup_task复用已经完成的frontend01，并将真实ID同步给A/B；不是虚构learning_ui02成功，也没有额外第四个工作agent。输入为AGENTS、PRODUCT_SPEC、CONTRACTS v1-stage02、STATUS、02提示词与冻结handoff。其他路径均禁止写；交付要求是文件、实现摘要、真实命令、接口建议及阻塞。

主agent串行集成API课程用例，新增真实差分与E2E。C释放实现后另获仅tests/unit/progress704.test.ts授权，交付21个纯reducer反例PASS（合成数据不是Java执行证据）。A随后只读审查前端实际文件，发现旧测试集响应/旧课程历史记录两处显示缺口；C获仅App.tsx、LearningPanels.tsx授权修复并释放。主agent保留所有根配置/锁/公共契约/docs/验收所有权，无同文件并行写入。

最终门禁和命令结果见[STAGE02_ACCEPTANCE](STAGE02_ACCEPTANCE.md)。阶段02结束停止，阶段03未执行。

## 阶段03实际派工

客户端仍提供真实subagent，复用已有任务而非模拟协作。平台与Get-Location确认共享当前目录，无Git/worktree。主agent先扩公共704/206联合契约、ListGraph/BridgeUnit/BridgeProgress、registry入口、curriculum导出与锁文件；再依[STAGE03_HANDOFF](STAGE03_HANDOFF.md)以v1-stage03冻结三范围。最多三个工作agent同时运行。

| 实际任务 | 允许写入（其他路径禁止） | 交付与真实局部检查 |
|---|---|---|
| /root/curriculum02（A） | packages/curriculum/bridge/**除index.ts；apps/web/src/**除main.tsx/registry.ts | J1—J8和局部测试、BridgePanel、App/LearningPanels/Progress/hooks复用。类型/lint及bridge+704 reducer23 tests PASS；后续仅两个授权文件修复flush/内存问题 |
| /root/visualizer02（B） | packages/curriculum/problems/206/**除index.ts；packages/visualizer/src/**除index.ts | 206 content/reference/model及局部tests、共享ReferencePlayer与ListDiagram。704/206局部11 tests PASS、类型/lint PASS；未修改704课包 |
| /root/frontend01（C，本轮负责runner） | apps/api/src/**除main.ts；runner/java/**不改Gson | 真实ListNode/IdentityHashMap、Supervisor/Adapter/API两题支持、镜像文件。lint PASS，初次类型待206内容后集成成功；主agent统一build真实镜像 |

每份派工输入是AGENTS、PRODUCT_SPEC、03提示词、STATUS、CONTRACTS与handoff，验收与交付要求写入handoff。主agent独占根/脚本/锁/公共契约/入口/docs/全局tests；C先释放runner再获仅tests/integration/linked-judge.test.ts授权，22反例/HTTP测试PASS。真实Docker与浏览器由主agent验证，不把这些纯判定测试当作Java执行。

独立交叉审查：C只读B模型及图，另构造31组重复值输入、2449快照逐赋值检查，发现“对象null”显示问题，主agent修复并添加E2E断言；B只读A前端/微课，发现flush等待时编辑丢字及BridgePanel降级内存被卸载丢失，并指出206缺J3前置。A只重获useLearningProgress.ts/BridgePanel.ts（必要App.ts允许但未改）修复，主agent统一J3和可控时序E2E。释放后才由主agent作相关集成，没有同文件多写争用。

主agent实际验证206参考Java固定/随机对照、身份反例、最大5000输入、同名平台类不替换、完整206与微课E2E；最终再次执行704原有Docker和浏览器回归。详细命令与状态见[STAGE03_ACCEPTANCE](STAGE03_ACCEPTANCE.md)。阶段03完成后停止，04未执行。

## 阶段04实际派工

客户端提供三个原生 subagent；Get-Location 与平台说明确认所有 agent 共享当前 checkout，没有隔离 worktree。主 agent 先完成 `packages/contracts/src/problems.ts`、十题 Run/Lesson/Trace 联合、registry/导出、共享 runner 和渲染器集成窗口，再按 [STAGE04_HANDOFF](STAGE04_HANDOFF.md) 分三批授权互斥题目目录。最多三个工作 agent 同时运行。

| 实际任务 | 共享窗口 | 第一批 | 第二批 | 第三批 / 复核 |
|---|---|---|---|---|
| `/root/course_gap04` | `apps/web/src/App.tsx`、`LearningPanels.tsx`、`styles.css` | 283 课程目录 | 20 课程目录 | 70 课程目录 |
| `/root/visual_gap04` | `packages/visualizer/src/**`，排除主入口 | 977 课程目录 | 21 课程目录 | 3 课程目录 |
| `/root/runner_gap04` | `apps/api/src/{app,runner}.ts`、`runner/java/**` | 1 课程目录 | 104 课程目录 | 只读独立审查 |

每份题目交付包含 content/reference/model/index 和两份局部测试；其余路径禁止。主 agent 在 agent 释放路径后才写公共入口和全局测试，维护根/锁/contracts/docs 所有权。批次门禁依次得到 140、170、200 项非 Docker 测试；各批真实 runner 和真实浏览器均回归 704/206，失败修复并重跑后才进入下一批。

独立审查没有复述实现者结论：另跑 60 个新增发布用例的真实 Java/模型严格比较，并构造 283 数组改绑、1 反序/同索引、21 相等值/新节点/环、104 紧凑 null 反例。指出差分测试原先只分别通过语义谓词、批次 E2E 原先只操作第一段支架；主 agent 补为直接等值和三段支架全流程后完成最终 `npm run verify`。详细结果见 [STAGE04_ACCEPTANCE](STAGE04_ACCEPTANCE.md)。阶段04完成后停止，05未执行。

## 三题扩展实际派工（2026-10-13）

客户端提供三个原生工作 agent；平台确认所有 agent 共享当前 checkout。主 agent 先扩 `ProblemId`、输入/输出判定与固定 Java Adapter，再分配互不重叠目录；公共入口、根配置、文档、测试和 Git 均由主 agent 保留。

| 实际任务 | 唯一允许写入路径 | 交付与局部验收 |
|---|---|---|
| `/root/problem35` | `packages/curriculum/problems/35/**` | 半开 lower_bound 完整课程；12 例、3 错夹具、2 动态预测；2 文件 / 8 测试 PASS |
| `/root/problem121` | `packages/curriculum/problems/121/**` | 前缀最低价完整课程；12 例、3 错夹具、2 动态预测；2 文件 / 10 测试 PASS |
| `/root/problem217` | `packages/curriculum/problems/217/**` | HashSet 查重完整课程；12 例、2 错夹具、2 动态预测；2 文件 / 10 测试 PASS |

工作 agent 均未修改共享文件。主 agent 的集成验收与推送结果记录在 `STATUS.md`。

## 三题续扩实际派工（2026-10-15）

客户端原生 subagent 可用；平台明确所有 agent 共享当前 checkout，没有隔离 worktree。主 agent 先冻结 53/167/242 公共输入、期望、Lesson/Run 联合及可信 Java 方法签名，再把互不重叠的课程目录分别授权三个工作 agent。公共入口、根清单/锁、测试、文档、Git 和最终验收由主 agent 独占。

| 实际任务 | 唯一允许写入路径 | 课程交付与局部命令 |
|---|---|---|
| `/root/problem53` | `packages/curriculum/problems/53/**` | Kadane 完整课程；12 例、3 错夹具、2 动态预测；目录 Vitest 2 文件 / 9 测试 PASS |
| `/root/problem167` | `packages/curriculum/problems/167/**` | 双指针完整课程；12 例、3 错夹具、至少 2 动态预测；目录 Vitest 2 文件 / 6 测试与 ESLint PASS |
| `/root/problem242` | `packages/curriculum/problems/242/**` | 字母频次完整课程；12 例、3 错夹具、3 动态预测；目录 Vitest 2 文件 / 9 测试与 ESLint PASS |

三份任务的输入资料为 AGENTS、PRODUCT_SPEC、CONTRACTS、DECISIONS 与相邻题目课程；指定契约版本、写入边界、验收命令和交付格式均在实际派工中明确。工作 agent 均未修改共享注册、契约或根文件。主 agent 处理公共联合扩展导致的 704 测试用例类型窄化，并执行真实容器与浏览器集成验收。

## 三题续扩实际派工（2026-10-16）

平台确认三个原生工作 agent 与主 agent 共用同一 checkout，没有独立 worktree。主 agent 先固定 88/125/169 公共输入、可信输出和 Java 调用签名，随后以互不重叠目录派工；契约版本 `v1-extension-2026-10-16`。输入资料为 AGENTS、PRODUCT_SPEC、CONTRACTS、DECISIONS 与相邻课程。各 agent 必须交付完整课程、参考源码与模型、局部测试、路径清单和阻塞；验收命令为项目 Node24 环境中的 `npx vitest run packages/curriculum/problems/<id>`。

| 实际任务 | 唯一允许写入路径 | 目标 |
|---|---|---|
| `/root/course88` | `packages/curriculum/problems/88/**` | 原数组向后归并；含重绑定错误夹具与中间状态不变量 |
| `/root/course125` | `packages/curriculum/problems/125/**` | ASCII 回文双指针；标点/大小写/数字反例 |
| `/root/course169` | `packages/curriculum/problems/169/**` | 多数元素投票；过半前提、抵消状态与反例 |

主 agent 独占 `packages/contracts/**`、根清单和锁、公共注册、桥接映射、全局测试及文档；统一做真实 Docker 和浏览器集成。三份派工都禁止跨目录编辑、提交或推送。
