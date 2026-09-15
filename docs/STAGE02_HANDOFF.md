# 阶段02冻结接口与文件所有权

基线：CONTRACTS v1-stage02，lessonVersion仍704-v1（首次完整课程，阶段01只有独立草稿）；algorithmVersion=704-closed-v1。当前目录共享，无worktree。主agent持有所有根配置/锁/公共契约/注册入口/docs/tests全局验收；三个agent不得交叉写入。

## A 课程

允许packages/curriculum/problems/704/**，排除index.ts、model.ts、model.test.ts。提供content.ts、reference.ts、Java资产、局部content.test.ts；禁止其他目录。

- reference.ts导出REFERENCE_SOURCE:string（规范LF）、ALGORITHM_VERSION='704-closed-v1'、REFERENCE_STEP_MAP（Lesson.reference.stepMap结构）。代码使用闭区间left/right和mid，步骤ID由A与B直接确认后固定。
- content.ts导出lesson704:Lesson、demoInputs:{id:string;title:string;input:BinarySearchInput}[]。lesson704.reference.sourceHash必须真实SHA256，可离线计算常量并测试；独立initialSource与公共STARTER_SOURCE一致。
- demo至少两项，默认`found`输入[-8,-2,3,7,12],target7；`missing`同数组,target6。至少两预测，对应B模型first-mid/first-boundary检查点。完整课程通过LessonSchema验证。
- testSuite用例8—16项，至少两个错误Java夹具。主agent将runner注册的本站输入与此测试集串行统一，消除两份用例事实来源。

## B 可视化

允许packages/curriculum/problems/704/model.ts、model.test.ts及packages/visualizer/src/**（排除index.ts）；禁止content/reference等A范围和根配置。

- model.ts导出async buildReferenceTrace(input:BinarySearchInput,inputId:string):Promise<ReferenceTrace>，使用REFERENCE_SOURCE/STEP_MAP，实际sha256输入和源码。不可变快照，非JVM轨迹；模型允许有效判题数组用于差分，播放器另限最多30项，模型快照2000上限透明拒绝。
- model.ts导出predictionAt(trace:ReferenceTrace,index:number):ReferencePrediction|null；index为snapshots下标，预测针对尚未揭示的该快照。至少first-mid和first-boundary两个动态检查点，按输入计算答案，不能把默认输入答案套给其他输入。
- 公共ReferencePrediction={checkpointId:string,prompt:string,answer:number,explanation:string}；checkpointId含algorithmVersion/inputHash/snapshotId以区分输入及版本。
- ReferencePlayer props：trace:ReferenceTrace、source:string、predictionAt:(index:number)=>ReferencePrediction|null、predictionResults:Progress['predictionResults']、onPrediction:(record:{checkpointId:string,answer:{kind:'int',value:number},correct:boolean})=>void。导出命名ReferencePlayer。初始化显示initialState；下一步遇未作答checkpoint先停并索取预测，提交后才揭示并解释；错误也记录，不伪称真实运行。回退/重置/播放/暂停/速度和变量/区间/代码高亮均从同一快照对象读取。source初始折叠，额外props onViewSolution:()=>void，打开参考源才记录答案使用。

## C 前端

允许apps/web/src/**但排除main.tsx；禁止根/契约/课程/visualizer/API/tests目录。

消费@jab/curriculum/704的lesson704/demoInputs，@jab/curriculum/704/model的buildReferenceTrace/predictionAt及@jab/visualizer的ReferencePlayer。保留真实API接口、运行结果data-testid及Monaco真实编辑。

路线入口→语法→读题推导→预测演示→引导→独立→总结；可自主跳转。模式切换草稿隔离，run与submit不等同，只有真实submit通过且当前提交源/课程/测试集匹配才写PassRecord。看答案/提示事实保留；完整参考源默认折叠，不能当未辅助掌握。完成步骤显式学习操作触发，不因导航/播放而通过。

使用ProgressSchema/version localStorage key，首次完整Progress可以显式导入阶段01旧独立草稿，旧key保留；课程版本不匹配不静默覆盖。保存hash异步竞态需测试。存储不可用仍内存练习，保持清晰告知。

## 验收与交付

各agent先读AGENTS/PRODUCT_SPEC/CONTRACTS/STATUS/02，再实施。验收命令npm run check / build；主agent更新Vitest范围包含局部tests。主agenttests/runner进行所有课程固定例+固定seed小输入的真实Java差分，错误夹具真实识别；tests/e2e跑完整学习闭环，不拦截判题成功。命令前置`. ./scripts/use-node.ps1`。交付需含变更路径、真实测试/结果、接口建议、已知问题；共享依赖只由主agent安装。
