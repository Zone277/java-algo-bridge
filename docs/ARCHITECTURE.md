# 最小架构 · 阶段 00

规格基线：PRODUCT_SPEC v1；契约基线：CONTRACTS v1。此文是后续实现边界，当前没有网站或 runner 实现。

沿用 Node.js 24、npm workspaces、React/TypeScript/Vite、Fastify、Monaco、SVG、Zod、Vitest、Playwright。具体受支持补丁和兼容依赖由阶段 01 在本机核验后锁定；阶段 00 不安装依赖。

| 路径 | 职责 |
|---|---|
| apps/web | 学习路线、工作台、编辑器、反馈、本地进度与草稿 |
| apps/api | 回环 HTTP、输入验证、有限队列、可信题目注册和服务端判定 |
| packages/contracts | Zod schema、推导 TS 类型、版本与跨字段约束；主 agent 独占 |
| packages/curriculum | 本地课程、Java 骨架/参考代码、有效用例、错误夹具、纯参考模型 |
| packages/visualizer | 快照选择播放器和 SVG/HTML 渲染，不执行学生程序 |
| runner/java | 固定 JDK 21 镜像、调用器、节点类、序列化和任务生命周期 |
| tests/e2e | 真实前后端和 Docker 的浏览器验证 |
| docs | 决策、派工、环境、状态、验收证据 |

参考通道：课程已验证的演示输入 → 该题预置纯状态模型 → ReferenceTrace → 同一不可变快照驱动代码高亮、变量表、对象图和解释。播放器前进/回退只选择快照，计时器不推进算法。输入或参考版本变化时重建轨迹。固定显示“参考解法 · 算法状态演示（非 JVM 调试）”，展示参考代码而非学生编辑器源码。对象 ID 是教学身份，不是地址或 GC 事实。

执行通道：Monaco 当前源码快照 → RunRequest → /api/runs → 白名单/schema/字节限制 → 单并发有限队列 → 独立临时目录与一次性容器 → javac → 可信调用器调用 Solution → 有界结构化结果 → 宿主 API 对照可信用例判定 → RunResult。原样保存 Solution.java，不拼接用户源码进包装文件；行号来自真实 javac。学生 stdout/stderr 单独捕获，绝不解析打印的 PASS 作为判定。

服务端仅接受注册题目；客户端不能选择命令、文件名、镜像、适配器或 submit 预期。调用器输出结构化协议需要校验类型、任务/用例关联、长度、完整性与节点身份。学生代码与调用器同容器并非防恶意伪造的完备 OJ；协议文件不从 stdout 读取，不将学生自报 status 当可信判定。

计划 API：POST /api/runs 同步返回最终 RunResult（最多总预算 30 秒；排队时间计入）；GET /api/health 报 runner 可用性；GET /api/session 在Host校验后返回本次服务启动的随机会话令牌，禁止跨域读取、响应no-store，前端仅保存在内存，POST通过X-Java-Algo-Session提交。断开请求触发取消清理；首版不设数据库或后台持久任务。requestId 由 API 创建，用于日志、任务目录及标签关联；不允许客户端作为路径。无 Docker 返回 RUNNER_UNAVAILABLE，保留明确非执行阅读/参考演示，无宿主 Java 回退。

前端 127.0.0.1:5173，通过 /api 代理到 127.0.0.1:3001。前后端均校验精确 Host 白名单；执行接口要求 JSON、精确 Origin 白名单及启动会话令牌（同源引导获取、刷新重取），不开放 CORS；无 Origin 执行请求亦拒绝。localhost/IPv6 仅在明确配置并验证后加入白名单，不隐式信任任意回环域名。令牌不写持久进度或日志。该设计的实际防跨站验证在阶段 01/05 执行。

每任务只读挂载自己的输入目录，输出/编译写有上限的 tmpfs。非 root、禁网、cap-drop ALL、no-new-privileges、默认 seccomp、只读根文件系统；无 socket/项目根/用户主目录挂载。初始预算见 DECISIONS。成功、失败、取消、超时及服务退出统一 finally 清理；启动仅清理本项目标签且已确认过期的任务。资源限制必须在 Docker/cgroup 实测，不能凭参数认定成功。

进度通道：学习操作 → Progress reducer → 带 schema/lesson 版本的 localStorage；存储失败允许当前内存会话继续并提示不能恢复。guided 与 independent 草稿分离，课程更新保留旧草稿并提示迁移。通过结果绑定源码 hash、课程版本、测试集版本及是否看答案；旧结果不能标记新源码通过。

全部课程/字体/编辑器 worker/图标本地提供，安装完成后再验证离线。无 Spring、数据库、Redis、AI API、云判题或通用 JVM 调试器。产品为单用户本机教学原型，不是可直接公网部署的多租户沙箱。

## 阶段03已实现的复用关系

apps/web/src/registry.ts绑定704/206课程、输入、参考模型和语法检查；同一个工作台按配置展示。同一个ReferencePlayer选快照，对array渲染区间、对list使用ListDiagram渲染节点next箭头和独立变量绑定。J1—J8通过桥接数据入口按需进入并返回来源步骤。

同一个/api/runs按已验证problemId选择课程测试集，将固定题号写入只读任务数据；镜像Supervisor按题号调用同一可信Adapter的704/206分支。206将输入数组构造成真实ListNode对象链，以IdentityHashMap保存原身份，执行学生reverseList后把全部原对象实际字段序列化，宿主比较结构。前端参考图既不参与判题，也不展示学生源码的虚构状态。

统一scripts/ports.ts读取可选回环端口，供Vite、API入口、dev、doctor、Playwright和退出清理检查消费；默认地址不变。本轮实测5174/3002，与已有旧服务互不占用。两种课程和桥接各自版本化存储，切题前一致性flush，共用编辑器与真实结果验证。
