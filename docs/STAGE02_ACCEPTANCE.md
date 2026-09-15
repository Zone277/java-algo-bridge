# 阶段02：704完整学习闭环验收

日期：2026-09-09。仅实施prompts/02-binary-search.md，不扩题。真实原生agent和互斥文件范围见[TASKS](TASKS.md)及[冻结派工接口](STAGE02_HANDOFF.md)。当前为共享目录而非隔离worktree；主agent先公共骨架/契约/锁文件，课程、模型、前端分开写入后集成。

## 实际交付文件

- 课程：packages/curriculum/package.json、problems/704/index.ts、content.ts、reference.ts、content.test.ts。原创语法/题面/输入输出/手算、线性寻找→闭区间不变量推导、参考Java、13个用例、2个典型错误Java、2处预测、3层提示和3步撤支架。
- 参考演示：problems/704/model.ts、model.test.ts、packages/visualizer/package.json、src/index.ts、ReferencePlayer.tsx。确定性深度冻结、真实输入/源码hash、动态预测、上一步/下一步/播放/暂停/重置/速度/输入切换、变量表/区间/SVG/行高亮。
- 学习流程：apps/web/src/App.tsx、LearningPanels.tsx、progress.ts、useLearningProgress.ts、styles.css。分模式草稿、真实submit通过、辅助事实、版本化恢复、损坏存储保留。原Monaco与真实API链路继续使用。
- 主agent集成：packages/contracts/src/learning.ts/index.ts、apps/api/src/runner.ts、vitest.config.ts、package-lock.json；课程schema与统一13例注册，测试集704-tests-v2。两个workspace不新增第三方依赖。
- 验证：tests/runner/reference704.test.ts、tests/e2e/learning704.spec.ts、适配原real-run.spec.ts、tests/unit/progress704.test.ts。文档更新CONTRACTS、DECISIONS、ENVIRONMENT、TASKS、STATUS、LOCAL_RUN及README。

## 验收矩阵

命令均在项目PowerShell先执行`. ./scripts/use-node.ps1`。测试没有skip/todo，也没有拦截判题API构造成功。

| 命令 / 检查 | 状态 | 结果与范围 |
|---|---|---|
| npm run doctor | PASS | 项目Node24.20.0/npm11.19.0、Docker29.7.2、固定Java21镜像及两回环端口 |
| npm run check | PASS | ESLint、TypeScript及61个测试：原30、课程4、模型6、进度21 |
| npm run build | PASS | Vite前端与tsup API构建；Monaco包体警告保留 |
| npm run test:runner | PASS | 18真实Docker测试：原15分类/隔离/清理回归及新增3组差分/错误夹具 |
| npm run test:e2e（最终回归） | PASS | 5个真实浏览器测试，50.6秒，完整学习闭环及原执行回归无API拦截 |
| npm run test:shutdown（本轮） | PASS | 真实运行中关闭dev，任务容器清理、两端口关闭 |
| npm run verify（最终） | PASS | 汇总退出0；check/build/18个Docker测试/5个E2E/shutdown全部通过 |
| Git提交 | NOT_RUN | 非Git仓库，未初始化/修改全局配置/推送 |
| 用户学习效果、其他OS、断电注入 | NOT_RUN | 自动化学习操作不等于目标用户已掌握；不属于本轮完成证据 |

## 真实执行与参考模型

参考模型标记mode=reference-model，Java执行标记origin=student-java，界面始终明确“参考解法 · 算法状态演示（非 JVM 调试）”。模型没有读取学生编辑源码，也不生成任意Java调试轨迹。

差分实际执行固定参考Java：全部13个公开本站用例（含10000项边界），再运行seed7042026生成的16个小输入（命中/缺失交替、长度1—30）。逐一比较实际Java返回值与trace.finalOutput、源码hash、输入hash及cleanup=done。两份典型错误Java在各自反例上被真实识别；这不是动画自比。

独立中间状态测试覆盖单/双/30项、左右分支和多个目标：候选目标仍在区间、边界合法、更新后严格缩小、compute-mid范围/计算正确、循环块作用域、旧mid在更新后允许落到新区间外、返回条件。逐步骤核对真实参考源行号，验证不可变/输入隔离；最终输出一致不替代这些断言。

原真实runner回归继续检查正确、错误、编译错误、异常、超时、输出超限、堆资源限制、Docker CLI不可用、打印PASS/伪协议不通过、并发/取消/退出清理。没有宿主机Java回退。本轮没有改变容器权限或放宽限制。

## 浏览器操作与进度

真实浏览器使用Monaco剪贴板粘贴完整Java，通过本地API进入固定Docker镜像编译执行。完整旅程覆盖：路线→语法错误/正确预测→手算→两处先预测后揭示（含错答解释）→状态回退/前进一致、代码高亮→播放/暂停/重置/输入切换→依次加载并补全三步支架→引导真实提交→独立错误运行→修正→13例submit通过→刷新并从两种草稿分别真实运行。

引导最终提交使用与参考不同的中点表达式，实际全通过，证明不靠填空字符串相等。独立初始草稿是STARTER_SOURCE，三步静态自检不产生通过；仅run也不产生整套通过。展开参考代码和使用三层提示均记录，最终明确标注“已查看答案”，不称独立掌握。

另外验证旧版draft显式导入且旧条目保留、损坏Progress保留原值并内存练习、真实执行中编辑旧结果不冒称新源码通过。纯reducer的合成数据仅用于21个门禁反例，文件明确标注不是Java运行证据。

## 修复与证据

独立课程agent只读审查实际前端，发现旧测试集API响应可显示通过、旧课程PassRecord恢复未标失效两处缺口。前端agent仅获对应两文件修复授权；主agent在真实获得的记录上变更历史版本，验证恢复提示。进度门禁本来就拒绝错版本写入，现显示层也保持一致。

验收期间先修正表格innerText/textContent的空白读取差异；首轮完整verify捕捉了350ms播放首帧被轮询错过的测试竞态。修订为验证自动前进及暂停跨完整tick保持状态；不删除测试或放宽算法/判题断言。[首轮日志](evidence/stage02-verify-first.log)保留失败，[最终日志](evidence/stage02-verify.log)记录重新运行结果。[单独真实差分](evidence/stage02-differential.log)、[学习闭环初次通过](evidence/stage02-learning-e2e.log)、[检查日志](evidence/stage02-check.log)保留。

已知限制：Monaco前端主包约2.96MB，构建有体积警告；演示最多30项而真实判题最多10000项；只提供预置参考输入切换。课程效果尚无真人学习实验，localStorage不是不可篡改成绩系统。无当前Docker/依赖环境阻塞；阶段03—06未执行。

最终截图：[参考状态与代码高亮](evidence/stage02-reference.png)、[真实错误反馈](evidence/stage02-failure.png)、[学习总结及答案使用事实](evidence/stage02-summary.png)。截图来自上述真实E2E；主agent检查参考与总结截图布局。验收服务已停止，阶段02完成，不自动进入03。

截图复核另发现当前步骤按钮的通用hover样式覆盖选中背景，白字对比不足。仅提高两处选中按钮CSS选择器优先级；随后build及两项学习E2E再次PASS（27.8秒），[末次视觉回归日志](evidence/stage02-visual-regression.log)保留。截图已更新，最终复查无本项目容器残留、3001/5173无监听。该CSS修订没有改变已通过的执行器、模型或进度逻辑。
