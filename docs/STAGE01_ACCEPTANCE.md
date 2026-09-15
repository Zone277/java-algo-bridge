# 阶段01实际验收

日期：2026-09-09；范围：仅704最小编辑→本地API→一次性Docker→javac/java→结构化结果→反馈。完整课程/参考模型/微课属于后续阶段，不在本次通过声明内。

环境：Windows11 x64；项目内Node24.20.0/npm11.19.0；Docker Desktop4.90.0 / Engine29.7.2 Linux amd64、cgroup v2；Temurin21.0.12+8。基础digest见Dockerfile，项目镜像构建记录见下方日志（构建证明metadata可能使镜像索引ID随重新构建变化，运行层和配置受固定源码/基础digest约束）。最后构建配置digest为`sha256:81477d2b11e84e1febd5e8dc545e54ae51b7dac324be367cf2dade4e52ec602d`，镜像索引ID为`sha256:4f95c523e77b245555f53e812e6bc80436fda1dba5a0ed29fb02a8c2a1a1b162`。

全部npm命令使用`. ./scripts/use-node.ps1`准备当前PowerShell PATH。原全局Node22未变更。

| 验收项 | 状态 | 真实命令 / 结果 / 证据 |
|---|---|---|
| 依赖和锁文件 | PASS | npm install / npm ls；package-lock.json，npm audit --audit-level=low零漏洞 |
| 环境、端口、镜像及实际安全约束 | PASS | npm run doctor；Node固定版本、两个回环实际bind、容器内部probe通过 |
| 固定JDK和Gson镜像构建 | PASS | npm run runner:build；校验jar SHA256、Docker构建、输出image ID/amd64，见[构建日志](evidence/stage01-runner-build.log) |
| lint、TS、公共契约/API无Docker边界 | PASS | npm run check，30 tests，零skip；见[汇总日志](evidence/stage01-verify.log) |
| 前后端实际构建 | PASS | npm run build，Vite+tsup；Monaco包大小警告保留，不压制 |
| 真实Java集成 | PASS | npm run test:runner，15 tests，零skip，最终汇总52.27s |
| 浏览器编辑与真实API/Docker | PASS | npm run test:e2e，3 tests，零skip；真实粘贴Java，不拦截判题接口 |
| 开发服务关闭中取消与清理 | PASS | npm run test:shutdown；实际启动dev、创建无限循环任务、IPC关闭、任务容器消失、3001/5173均关闭 |
| 汇总必要检查 | PASS | npm run verify退出0，包含doctor/check/build/runner/e2e/shutdown；[原始日志](evidence/stage01-verify.log) |
| API先就绪再开放前端 | PASS | 启动竞态修订后再次check/build/e2e/shutdown，见[启动回归日志](evidence/stage01-startup-regression.log) |
| 页面视觉核对 | PASS | 主agent实际查看成功工作台截图，代码与实际返回表格可读；[截图](evidence/stage01-workbench.png) |

## 实际功能反例

- 正确二分查找及不同写法的线性查找均真实编译通过；改变target，输出从2变为0或-1。没有检查算法源码字符串来判通过，也不宣称小样例验证了复杂度。
- submit真实执行服务器12个有效输入，包括单元素、两元素、首尾、缺失、10000项；与run单输入区分，返回测试集版本。
- 错误下标、打印PASS/伪JSON但返回错误值、修改输入后返回错误值均WRONG_ANSWER；可信预期基于原始输入。
- 语法错误为COMPILE_ERROR，实际javac定位原Solution.java第3行；除零异常与提前退出缺协议为RUNTIME_ERROR。
- 无限循环被实际终止为TIME_LIMIT；输出洪泛为OUTPUT_LIMIT，有截断标记、受限捕获；真实Java堆OOME为RESOURCE_LIMIT。
- submit先答错、后无限循环最终TIME_LIMIT，保留早先WRONG_ANSWER用例，不让普通错误掩盖执行故障。
- 无Docker路径以不存在的dockerExecutable触发真实spawn ENOENT：RUNNER_UNAVAILABLE、HTTP503、空cases、编译/执行时间0。没有停掉本机Docker，也没有返回预制成功或宿主Java回退。
- 两个同时请求hash/输入/返回互不串用；成功、编译失败、超时、取消和关闭后均检查独立临时目录为空；inspect真实运行容器确认只有任务输入只读挂载。
- 容器内部实际读取memory/cpu/pids/swap cgroup约束，UID10001、NoNewPrivs、seccomp2、无capabilities、仅lo网络、只读根与有限tmpfs；不是只检查启动参数。
- HTTP拒绝陌生Host/Origin、缺令牌/Origin、非ASCII伪令牌、超大请求、客户端expected、submit自带输入；无假判定。
- 浏览器正确→错误、语法诊断→超时、请求执行中编辑→旧sourceHash过期→刷新恢复新草稿三条路径全部真实运行。测试观察该编辑/运行路径无外部HTTP资源请求；没有声称全产品离线验收完成。

## 修复记录

独立测试/主agent复核发现并修复：Dockerfile库文件名整合；超时phase；close和finally并发rm竞态；WA遮盖后续TLE；协议错误分类；OOME分类；非ASCII令牌引发异常；健康probe并发合并和关闭等待；120秒过期项目资源恢复。首次E2E自动化insertText触发Monaco补括号，改为真实剪贴板Ctrl+V并保留精确sourceHash断言，没有放宽Java结果断言。

主agent新增关闭烟测时出现TypeScript可空流检查失败，修正后汇总全部通过。汇总首次启动烟测出现短暂API未就绪代理错误，改为主agent入口IPC ready之后启动Vite，针对check/build/e2e/shutdown复验。日志中的NO_COLOR/FORCE_COLOR提示不影响执行；构建Monaco约2.9MB大块警告尚存。

## 尚未验证 / 下一阶段

编译超时专门压力用例、Docker daemon运行中崩溃、内核OOM kill（与已测Java堆OOME不同）、PID耗尽、硬断电及过期恢复故障注入：NOT_RUN。当前有相应限制/处理路径，不把未运行的压力场景宣称通过。其他操作系统/架构：NOT_RUN。Git提交：NOT_RUN（当前非Git仓库）。

阶段02完整704课程、参考模型差分与中间不变量、预测/引导/完整Progress：NOT_RUN。学生学习效果：NOT_RUN。此产品为单用户本机教学原型；学生与可信调用器同容器UID，非防作弊或公网多租户隔离保证，边界见runner/java/README.md。

本轮服务在验收后已停止，未留下3001/5173监听或项目任务容器。启动方法见[LOCAL_RUN](LOCAL_RUN.md)。阶段01完成后停止；下次仅按明确指令进入[阶段02](../prompts/02-binary-search.md)。
