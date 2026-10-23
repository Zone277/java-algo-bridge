# 当前验收入口

更新日期：2026-10-23。当前31题，本批新增724「寻找数组中心下标」、219「存在重复元素 II」、560「和为 K 的子数组」。实现、实际协作限制、首轮lint失败及修复见[本批验收](EXTENSION_2026-10-23.md)，启动命令见[LOCAL_RUN.md](LOCAL_RUN.md)。

环境为Windows / PowerShell、项目Node24.20.0/npm11.19.0、Docker29.7.2/Linux amd64、固定Java21镜像。无新依赖，学生源码仅在受约束一次性容器中执行。

| 检查 | 状态 | 实际证据 |
|---|---|---|
| `npm run runner:build`、verify doctor | PASS | 固定镜像构建、JDK探针和回环端口检查通过 |
| `npm run verify` 静态门禁 | PASS | ESLint、TypeScript、79文件/430项非Docker测试 |
| `npm run verify` 生产构建 | PASS | 前后端构建通过；Monaco大块警告仍在 |
| `npm run verify` 真实runner | PASS | 16文件/142项真实容器测试，零跳过；含限制、异常、判题和清理 |
| 新三题参考/错误解法 | PASS | 48发布用例、12固定种子输入、6错解及17具名错答目标；参考模型与真实Java对照 |
| `npm run verify` 真实浏览器 | PASS | 40项；31题完整学习/运行流程和刷新恢复均覆盖 |
| `npm run test:shutdown`（verify内） | PASS | 实际启动、在途任务关闭、容器和端口清理 |
| 最终独立残留检查 | PASS | 项目容器0、任务目录0、5173/3001监听0 |
| 其他操作系统、断电注入、真实学生学习成效 | NOT_RUN | 本批未执行，自动化不能替代学生试用 |

完整 `npm run verify` 退出0；没有删除、跳过或放宽测试。参考状态演示与学生真实执行分离，“通过本站测试”不等于官方评测通过。此前28题版本与草稿键保持不变。原生工作agent遇模型容量错误，主agent随后串行完成，不宣称完成了完整原生多agent协作。上一批验收见[2026-10-21记录](EXTENSION_2026-10-21.md)。
