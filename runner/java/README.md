# Java 21 task image

Build from the repository root with `npm run runner:build`. The base image is pinned by digest in Dockerfile; no host Java executable is used.

`Supervisor` is a trusted, precompiled image asset. It checks live cgroup v2 quotas and process security flags, starts `javac` with annotation processing disabled and then starts a fresh JVM for every case. `Adapter` selects one of the forty-six fixed problem signatures from trusted `problem.txt`; browser input cannot choose a class, method, image, command or path. Its structured return file is separate from the bounded student stdout/stderr streams. The host computes expected results from the original immutable JSON input. Printing `PASS` or JSON does not affect grading.

Each request gets only its own read-only input mount, a non-root disposable container, and capped `/work` and `/tmp` tmpfs. The container has no network, capabilities or writable root. CPU=1, memory/swap=512 MiB, PID=128; Java heaps are capped at 192 MiB and JVM processor count at 1. Container-side compile/case deadlines and a host total deadline are independent. Container removal and request-directory removal run in `finally`; server pre-close aborts and cleans active requests.

This is a local single-user educational runner, not an anti-cheating system or a production multi-tenant sandbox. Student code shares a container and UID with the adapter, so deliberately hostile in-container process/filesystem manipulation is outside the grading authenticity guarantee. Container isolation remains the host security boundary.

Gson 2.14.0 is vendored in `lib/gson-2.14.0.jar` for standard JSON serialization/parsing, SHA-256 `2cbd119bf1961c28788310963dc80ba65f58cdeec1dd139c8bdb1240faa2c36f`. Gson is licensed under Apache License 2.0; the jar includes its upstream `META-INF/LICENSE`. Project dependency preparation verifies the hash before image builds.
# 四十六题固定适配与恢复边界

同一 Supervisor 使用宿主注册的 `problem.txt` 选择 704、283、977、1、20、206、21、104、70、3、35、121、217、53、167、242、88、125、169、11、209、198、153、136、746、33、392、322、724、219、560、34、202、387、69、122、144、94、268、338、145、231、383、9、101 或 112，学生不能通过请求指定适配器类。固定镜像为 `java-algo-bridge-runner:21.0.12`；运行使用 `--pull=never`，本地镜像缺失时不访问 registry。基础 JDK digest 与原有资源限制保持。

`ListNode.java` 和 `TreeNode.java` 是镜像内预编译的可信类。学生源码编译使用可信 classpath；运行时平台目录和 Gson 在学生输出之前，同名平台 class 输出也会移除，不能替换平台类。

206 调用前保存原节点数组和 `IdentityHashMap<ListNode,String>`，身份为 h0、h1 等，重复值不合并。调用后逐个读取所有原对象实际 `val` 与 `next`，而非沿返回链无界遍历。未知根或 next 使用单独 unknown 身份并报告结构错误；环和丢失链段同样有界反馈。宿主检查根身份、全部原身份、值保持与精确反向 next，尾节点必须为 null。

阶段 05 的 Docker 实测结果以 `docs/REVIEW.md` 和 `docs/STATUS.md` 为准；本文只描述实现边界，不能替代运行证据。Docker/WSL 不可用时必须记录 BLOCKED，不得回退到宿主机执行学生源码。
