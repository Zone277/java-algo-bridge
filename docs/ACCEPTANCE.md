# 当前验收入口

更新日期：2026-10-20。当前范围为二十五题，本批新增 153、136、746。完整过程、真实 agent 分工、初次失败和修复记录见 [本批验收](EXTENSION_2026-10-20.md)；运行命令见 [LOCAL_RUN](LOCAL_RUN.md)。

环境：Windows / PowerShell，项目 Node 24.20.0、npm 11.19.0，Docker Engine 29.7.2 / Linux amd64，固定 Java 21 runner。学生源码仅在受约束一次性容器执行。

| 检查 | 状态 | 实际证据 |
|---|---|---|
| `npm run runner:build` | PASS | 固定镜像与容器内适配器编译成功；镜像 ID 见本批验收 |
| `npm run doctor` | PASS | Node、Docker/JDK 与 127.0.0.1:5173/3001 可绑定 |
| `npm run check`（verify 内） | PASS | ESLint、TypeScript、68 文件 / 370 项非 Docker 测试 |
| `npm run build` | PASS | 前后端生产构建；保留 Monaco bundle 大块警告 |
| `npm run test:runner`（verify 内） | PASS | 13 文件 / 121 项真实容器测试，含二十五题、异常状态与隔离清理 |
| 本批严格错误夹具补验 | PASS | 六个错误解法的14个具名反例全部 WRONG_ANSWER；结构化输出与源码hash复核 |
| `npm run test:e2e` | PASS | 完整34项；探针清理修复后再跑新三题、704/206/3等11项，全部通过 |
| `npm run test:shutdown` | PASS | 修复前后均实际启动、运行中关闭、清理任务并关闭端口 |
| 探针修复后容器专项 | PASS | stage11 + isolation + probe-cleanup，3文件/12项；Docker在宿主rm前自动删除探针 |
| 最终容器、任务目录、端口残留 | PASS | 修复后独立检查三项均为0；首次1个已退出探针的发现和修复见本批记录 |
| 其他操作系统、断电注入、真实学生学习成效 | NOT_RUN | 本批未执行；自动化结果不能代替学生试用 |

前两次静态门禁失败及修复保留在本批验收记录中；没有删除或跳过测试。参考状态演示与学生 Java 执行使用不同通道，“通过本站测试”不代表官方评测通过。

完整 verify 后发现并修复了探针清理窗口，因此最终证据由完整回归和修复后的专项复验共同构成；不把前一次退出0等同于当时零残留。修复后完整静态门禁与生产构建也已重新通过。
