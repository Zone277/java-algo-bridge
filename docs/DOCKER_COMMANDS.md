# Java Algo Bridge 的 Docker 命令

本文列出本项目实际会用到的 Docker 命令，示例面向 Windows PowerShell。项目只使用 Linux 容器，不使用 Docker Compose、命名卷或自定义网络。学生 Java 的正常执行入口是本地 API；API 会创建带随机名称的一次性受限容器、挂载单次任务目录，并在 `finally` 中清理。手工 `docker run` 主要用于探针和排障。

## 当前应保留的镜像

```powershell
docker image ls --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.Size}}"
```

本项目只需保留：

- `java-algo-bridge-runner:21.0.12`：API 实际运行的固定 runner 镜像。
- `eclipse-temurin:21.0.12_8-jdk-noble`：Dockerfile 的固定基础镜像，保留后可以本地重建 runner，不必再次下载基础层。

2026-09-15 已按精确标签删除 `21.0.12-stage01`、`21.0.12-stage03`、`21.0.12-stage04`，并删除唯一阻止旧镜像移除的已退出容器。没有执行全局 prune，也没有处理其他项目资源。

## 1. 检查 Docker

```powershell
docker version
docker context show
docker info
docker info --format '{{.OSType}} / {{.Architecture}} / cgroup {{.CgroupVersion}}'
docker system df
```

`docker info` 必须成功，`OSType` 必须是 `linux`。Docker Desktop CLI 可用时，可以显式查看或改变 Desktop 状态：

```powershell
docker desktop status
docker desktop start
docker desktop stop
docker desktop restart
docker desktop version
docker desktop diagnose
docker desktop logs
```

`stop` 和 `restart` 会中断正在进行的学习运行和其他 Docker 工作，只在确实需要时执行。`diagnose` 和 `logs` 用于 daemon 无法启动时收集 Docker Desktop 自身信息。项目自身不会自动升级 WSL、改变 Docker context 或修改全局设置。

项目的一键环境检查是：

```powershell
. ./scripts/use-node.ps1
npm run doctor
```

## 2. 构建和检查镜像

推荐用项目脚本构建，因为脚本与 API 共用同一个镜像常量：

```powershell
. ./scripts/use-node.ps1
npm run runner:build
```

对应的底层 Docker 命令是：

```powershell
docker build --pull=false --tag java-algo-bridge-runner:21.0.12 runner/java
```

Dockerfile 已把 Temurin 21.0.12+8 基础镜像固定到 digest。首次构建且本机没有基础层时需要网络。如需显式准备固定基础镜像：

```powershell
docker pull eclipse-temurin:21.0.12_8-jdk-noble@sha256:6b104fa1f9278a75c252729cab9d230ce782b828f2269d05c187ea3fddc70adf
```

构建排障时可以显示完整步骤，或重新执行所有构建层：

```powershell
docker build --pull=false --progress=plain --tag java-algo-bridge-runner:21.0.12 runner/java
docker build --pull=false --no-cache --progress=plain --tag java-algo-bridge-runner:21.0.12 runner/java
```

检查镜像身份、平台、配置和历史：

```powershell
docker image inspect java-algo-bridge-runner:21.0.12 --format 'ID={{.Id}} OS={{.Os}} ARCH={{.Architecture}} USER={{.Config.User}} ENTRYPOINT={{json .Config.Entrypoint}}'
docker image inspect eclipse-temurin:21.0.12_8-jdk-noble --format 'ID={{.Id}} DIGESTS={{json .RepoDigests}}'
docker image history java-algo-bridge-runner:21.0.12
docker image ls java-algo-bridge-runner --no-trunc
```

## 3. 运行受限探针

下面的命令使用和 API 相同的核心隔离参数。成功时只输出 `{"available":true}`，容器退出后由 `--rm` 删除。

```powershell
$probeName = "jab-manual-probe-$([guid]::NewGuid().ToString('N'))"
docker run --rm --pull=never --name $probeName --label "java-algo-bridge.managed=production" --network none --user 10001:10001 --cap-drop ALL --security-opt no-new-privileges --read-only --cpus 1 --memory 512m --memory-swap 512m --pids-limit 128 --tmpfs "/work:rw,nosuid,nodev,size=128m,mode=1777" --tmpfs "/tmp:rw,nosuid,nodev,size=32m,mode=1777" java-algo-bridge-runner:21.0.12 --probe
```

不要省略资源限制来证明 runner 可用。容器内 `Supervisor` 会真实核对 cgroup、UID、seccomp、capabilities、禁网、只读根目录和 tmpfs。

## 4. 正常启动项目

Docker 只负责 Java runner；前端和本地 API 由 Node 启动：

```powershell
. ./scripts/use-node.ps1
npm ci
npm run runner:build
npm run doctor
npm run dev
```

然后打开 `http://127.0.0.1:5173`。前端向 `127.0.0.1:3001` 的本地 API 提交 Java；API 执行的 Docker 命令等价于：

```text
docker run --pull=never --name <随机 jab-run 名称> --label java-algo-bridge.managed=production --network none --user 10001:10001 --cap-drop ALL --security-opt no-new-privileges --read-only --cpus 1 --memory 512m --memory-swap 512m --pids-limit 128 --tmpfs /work:rw,nosuid,nodev,size=128m,mode=1777 --tmpfs /tmp:rw,nosuid,nodev,size=32m,mode=1777 --mount type=bind,source=<单次随机任务目录>,target=/input,readonly java-algo-bridge-runner:21.0.12
```

这里用说明性的占位符展示内部调用，不能原样粘贴。正常运行不要手工创建学生任务容器：API 还负责请求校验、可信题目输入、总超时、结构化协议、本站判题和异常清理。Docker 不可用时 API 返回 `RUNNER_UNAVAILABLE`，不会回退到宿主机 Java。

## 5. 查看运行中的项目容器

项目容器都带固定标签。只按这个标签查看，避免把其他项目混入结果：

```powershell
docker container ls --filter "label=java-algo-bridge.managed=production" --format "table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}"
docker container ls -a --filter "label=java-algo-bridge.managed=production" --format "table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}"
docker container inspect <精确容器名或ID>
docker container inspect <精确容器名或ID> --format 'State={{json .State}} Labels={{json .Config.Labels}} Mounts={{json .Mounts}}'
docker container logs <精确容器名或ID>
docker container top <精确容器名或ID>
docker container stats --no-stream <精确容器名或ID>
docker container wait <精确容器名或ID>
docker events --filter "label=java-algo-bridge.managed=production"
```

这些容器通常只存在几秒；命令返回空列表往往表示任务已经正常清理。把 `<精确容器名或ID>` 替换成前一条列表真实返回的值，不要输入尖括号。

## 6. 精确停止和清理本项目容器

正常做法是在运行 `npm run dev` 的终端按 `Ctrl+C`，让 API 取消任务并清理。只有异常残留时才手工处理。先检查标签、镜像、状态和挂载：

```powershell
docker container inspect <精确容器名或ID> --format 'Name={{.Name}} Image={{.Config.Image}} State={{.State.Status}} Labels={{json .Config.Labels}} Mounts={{json .Mounts}}'
```

确认它确属 Java Algo Bridge 后，按单个精确名称或 ID 操作：

```powershell
docker container stop --time 2 <精确容器名或ID>
docker container rm <精确容器名或ID>
docker container rm --force <精确容器名或ID>
```

最后一条只用于容器无法正常停止的情况。不要把动态列表直接通过管道批量传给删除命令；先逐个核对可避免处理错误资源。API 启动时只会清理由相同项目标签标记且超过两分钟的残留容器。

## 7. 精确删除或重建镜像

列出项目镜像：

```powershell
docker image ls java-algo-bridge-runner --no-trunc
```

删除旧阶段标签时使用精确标签，例如本轮已经执行的命令：

```powershell
docker image rm java-algo-bridge-runner:21.0.12-stage01
docker image rm java-algo-bridge-runner:21.0.12-stage03
docker image rm java-algo-bridge-runner:21.0.12-stage04
```

如果以后要强制重建当前 runner，先确认没有项目任务，再删除当前标签并重新构建：

```powershell
docker container ls -a --filter "label=java-algo-bridge.managed=production"
docker image rm java-algo-bridge-runner:21.0.12
npm run runner:build
```

若只运行现成 runner、不准备在本机重建，可以精确删除基础镜像标签；下一次构建会重新下载它：

```powershell
docker image rm eclipse-temurin:21.0.12_8-jdk-noble
```

当前正式 runner 和基础镜像共享绝大多数层，因此删除基础标签通常几乎不释放空间。不要用 `--force` 绕过仍被容器引用的提示；先找到引用它的容器并核对归属。

## 8. 构建缓存和磁盘排障

只读查看不会删除数据：

```powershell
docker system df
docker system df --verbose
docker builder du
docker buildx du
```

Docker 构建缓存可能由多个项目共享，本项目不自动清理它。不要为了本项目运行以下全局命令：

```text
docker system prune
docker system prune --all
docker image prune --all
docker container prune
docker volume prune
docker network prune
docker builder prune
docker buildx prune
```

这些命令会影响 Docker Desktop 中其他项目的镜像、容器、卷、网络或缓存。确需回收全局空间时，应先用 `docker system df --verbose` 单独审计所有资源；这不属于 Java Algo Bridge 的项目清理。

## 9. Docker 相关验收命令

这些 npm 命令会调用真实 Docker，而不是返回预制结果：

```powershell
. ./scripts/use-node.ps1
npm run doctor
npm run test:runner
npm run test:e2e
npm run test:shutdown
npm run verify
```

- `doctor`：检查 Docker daemon、Linux 容器、镜像和完整受限探针。
- `test:runner`：真实编译和执行三十四题 Java，并覆盖错误答案、编译错误、异常、超时、输出超限和清理。
- `test:e2e`：启动真实前后端并经 API 调用 Docker。
- `test:shutdown`：验证服务退出时的在途容器和端口清理。
- `verify`：依次执行完整门禁；不要在同一端口上同时运行另一个 dev。

验收完成后检查没有项目容器残留：

```powershell
docker container ls -a --filter "label=java-algo-bridge.managed=production"
```

## 10. 本项目不应使用的容器选项

不要给 runner 增加 `--privileged`、`--network host`、Docker socket 挂载、项目根目录挂载或用户主目录挂载，也不要去掉 `--read-only`、非 root UID、capability、seccomp、CPU、内存、PID 和 tmpfs 限制。学生源码必须只由上述受限 Linux 容器执行。
