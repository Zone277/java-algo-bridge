# Security Review: java-algo-bridge-codex

## Scope

Java Algo Bridge whole-repository standard scan at git revision 9b2fa3b0, focused on the loopback Fastify API, Docker runner, trusted Java adapter, cleanup, and reference/student state separation.

- Scan mode: repository
- Target kind: git_revision
- Target ID: target_sha256_7289fe24a7a1227073b59a51c02685c1b1fb3ab883fafef0fcd61430ac7ee3e3
- Revision: 9b2fa3b0e4eca651de111f4e7ac02da8cd175e89
- Inventory strategy: repository
- Included paths: .
- Excluded paths: none
- Runtime or test status: Static and non-Docker contract validation completed. Live Docker runtime validation is blocked because Docker Desktop reports WSL update required.
- Artifacts reviewed: apps/api/src/app.ts, apps/api/src/main.ts, apps/api/src/runner.ts, runner/java/Dockerfile, runner/java/Supervisor.java, runner/java/Adapter.java, packages/contracts/src, apps/web/src/App.tsx, tests/integration, tests/e2e

Limitations and exclusions:
- Docker Desktop could not start until the host WSL component is updated, so live container limit, timeout, and cleanup claims remain dynamically unverified.
- The immutable target revision omitted locally ignored test and documentation files from Git; those local files were reviewed separately for the stage audit.
- Excluded public/multi-tenant deployment: The product is explicitly limited to a single-user loopback prototype.
- Excluded already-compromised host account or Docker daemon: Such control does not represent privilege gained through this application.
- Excluded public/multi-tenant deployment: 产品和用户明确限定单用户回环部署，不评估未支持的公网多租户场景。
- Excluded host account or Docker daemon already compromised: 已控制本机账户或daemon的主体没有通过本产品获得新增权限。

### Scan Summary

| Field | Value |
| --- | --- |
| Scan outcome | completed |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | none |
| Coverage | partial |
| Validation mode | Source-backed review plus controlled local non-Docker tests |

Canonical artifacts: `scan-manifest.json`, `findings.json`, and `coverage.json`. This report is a deterministic projection of those files.

## Threat Model

The local browser obtains a process token from a loopback-only Fastify service and submits untrusted Java source. Fastify validates Host, Origin, body schema, size, and session token, then invokes Docker with an argument vector and a random task directory mounted read-only. A trusted in-container supervisor compiles and runs the student class through a fixed adapter. The primary objectives are preventing host execution or host filesystem/network access, enforcing resource and output limits, cleaning project-owned resources, and keeping reference traces separate from student execution results.

### Assets

- Host files, local account, Docker daemon, and API availability
- Trusted Java adapter and typed judging results
- Student source, inputs, drafts, and progress
- CPU, memory, PID, temporary storage, output, and request time budgets

### Trust Boundaries

- Browser to loopback Fastify API
- Fastify process to Docker CLI
- Random host task directory to read-only /input mount
- Trusted container supervisor to untrusted student JVM
- Reference trace channel to student execution result channel

### Attacker Capabilities

- A local web page can attempt loopback requests but lacks the same-origin session token.
- A learner controls bounded Java source, valid custom input, stdout, stderr, exceptions, and runtime behavior.
- The learner does not control the Docker argument vector, trusted adapter, task directory path, or image selection.

### Security Objectives

- Never run student javac or java on the host and never fall back when Docker is unavailable.
- Use one constrained, networkless, non-root, capability-free, read-only container per request.
- Judge typed adapter output and object structure, never student PASS text or source patterns.
- Apply bounded request, execution, output, concurrency, and cleanup behavior.
- Prevent an old sourceHash or a reference trace from representing a newly edited student program.

### Assumptions

- This is a single-user loopback prototype and is not a public multi-tenant sandbox.
- An attacker who already controls the host account or Docker daemon is outside the product boundary.

## Findings

### No findings

No reportable findings survived the canonical discovery, validation, and reportability gates.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| Browser to loopback API | not recorded | No issue found | Host, Origin, session token, body limits, concurrency path, sourceHash binding, and reference/student channel separation were independently reviewed. No reportable vulnerability was validated. |
| Fastify to Docker CLI and cleanup | not recorded | Needs follow-up | No shell interpolation, host Java fallback, broad host mount, Docker socket mount, or network access was found. Recovery caching, deadline coverage, error classification, image pull policy, and shutdown cleanup reporting are operational hardening defects scheduled for stage05 repair; live validation is blocked. |
| Container supervisor and untrusted student JVM | not recorded | Needs follow-up | Static controls include non-root UID, cap-drop ALL, no-new-privileges, default seccomp, no network, read-only root, cgroup limits, and bounded tmpfs. Runtime proof for timeout, large output, PID/tmpfs exhaustion, and cleanup is deferred until Docker Desktop can start. |
| Reference trace, progress, and student result | not recorded | No issue found | Reference-model and student-java channels are distinct; no path was found that treats an animation as a student execution or uses printed PASS/source matching as a verdict. |

## Open Questions And Follow Up

- Do the Docker constraints and cleanup checks pass on this host after WSL is updated?
  - Follow-up prompt: Run the stage05 fixed-image runner, full Java/E2E suites, shutdown cleanup, and inspect remaining labeled containers and task directories.
- Docker Desktop reports WSL update required.
  - Follow-up prompt: Review deferred unit live-docker-runtime-validation and close its stated proof gap. Paths: apps/api/src/runner.ts, runner/java, tests/integration, tests/e2e.
- Static review found no reliable event-based classification for caught PID/tmpfs exhaustion; a safe fix requires live Docker evidence.
  - Follow-up prompt: Review deferred unit pid-tmpfs-classification and close its stated proof gap. Paths: runner/java/Supervisor.java, runner/java/Adapter.java, apps/api/src/runner.ts.
- 独立审查B及Docker真实验证尚未完成
  - Follow-up prompt: Review deferred unit pending-runner-audit and close its stated proof gap. Paths: apps/api, runner/java, scripts.
