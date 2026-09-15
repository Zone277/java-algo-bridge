# Java Algo Bridge

[English](README.md) | [简体中文](README.zh-CN.md)

A local-first Java algorithm learning tool for Windows. It helps learners with basic C and data-structure knowledge turn familiar concepts into practical Java and algorithm skills.

## Highlights

- Ten progressively structured algorithm problems covering arrays, hashing, stacks, linked lists, binary trees, dynamic programming, and sliding windows.
- Eight short Java bridge lessons (J1–J8) covering syntax differences, arrays, collections, strings, references, and common data structures.
- A complete learning path from syntax preparation and problem analysis to guided coding and independent practice.
- State-based visualizations of built-in reference algorithms, showing how variables and data structures change step by step.
- A Monaco-based Java editor with real compilation, execution, and local tests powered by Docker and Java 21.
- Drafts and learning progress saved in the current browser for future sessions.

## Course Content

| No. | Topic | Java Focus | Algorithm Focus |
| --- | --- | --- | --- |
| 704 | Binary Search | Arrays, loops, and integer indices | Shrinking a sorted search interval |
| 283 | Move Zeroes | In-place array modification | Two pointers |
| 977 | Squares of a Sorted Array | Creating arrays and handling boundaries | Opposing two pointers |
| 1 | Two Sum | Using `HashMap` | Hash lookup |
| 20 | Valid Parentheses | Characters and `Deque` | Stack-based matching |
| 206 | Reverse Linked List | References and `ListNode` | Reconnecting node links |
| 21 | Merge Two Sorted Lists | Object identity and linked-list operations | Two-list merge |
| 104 | Maximum Depth of Binary Tree | `TreeNode` and recursion | Depth-first traversal |
| 70 | Climbing Stairs | Methods, variables, and boundary conditions | Dynamic programming |
| 3 | Longest Substring Without Repeating Characters | Strings and sets | Sliding window |

## Requirements

- Windows 11, or Windows 10 with WSL 2 support
- Node.js 24.20.x and npm 11
- Docker Desktop using WSL 2 and Linux containers

You do not need to install a JDK on the Windows host. Student code is compiled and executed only inside a restricted, disposable Java 21 container.

Before starting, verify WSL and Docker in PowerShell:

```powershell
wsl --version
docker version
```

Both commands should return version information, and Docker Desktop should be running.

## Quick Start

Run the following commands in PowerShell:

```powershell
git clone https://github.com/Zone277/java-algo-bridge.git
cd java-algo-bridge
npm ci
npm run runner:build
npm run doctor
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173) after startup. Press `Ctrl+C` to stop the web and API services.

## Learning Flow

1. Choose a problem from the course list and review the required Java concepts.
2. Read the problem and complete state-prediction exercises to build intuition.
3. Play the reference algorithm visualization and observe how key data structures change.
4. Complete the solution in guided mode, then implement it again in independent mode.
5. Run a custom input and submit the solution against the site's local test suite.

Reference solutions are collapsed by default. Visualizations show the state of a built-in reference algorithm; they are not JVM step-debugging traces of student code.

## Execution and Evaluation

The editor accepts a complete `Solution` class:

- “Run Input” checks only the current input.
- “Submit Local Tests” runs the problem's bundled local test suite.
- A passing result means only that the solution passed this project's tests. It does not indicate acceptance by LeetCode or another external judge.
- Problems 206 and 21 provide `ListNode`; problem 104 provides `TreeNode`. Student code should not redeclare these classes.
- Linked-list problems validate original node identity and link structure, not only node values.
- Problem 283 checks the modified input array; problem 1 accepts either valid index order; problem 104 uses compact level-order `null` semantics; problem 3 requires a contiguous substring.

If Docker or the pinned runner image is unavailable, the application returns `RUNNER_UNAVAILABLE`. It never falls back to executing student Java source directly on the host.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run doctor` | Check Node.js, Docker, the runner image, and local ports |
| `npm run runner:build` | Build the pinned Java 21 runner image |
| `npm run dev` | Start the local web and API services |
| `npm run typecheck` | Check TypeScript types |
| `npm run build` | Build production assets |

## Port Configuration

The web app listens on `127.0.0.1:5173` by default, and the API listens on `127.0.0.1:3001`. If either port is unavailable, set alternative loopback ports for the current PowerShell session:

```powershell
$env:JAB_WEB_PORT='5174'
$env:JAB_API_PORT='3002'
npm run dev
```

Then open [http://127.0.0.1:5174](http://127.0.0.1:5174).

## Troubleshooting

### `wsl --version` fails or Docker Desktop does not start

Install available Windows updates, run `wsl --update` from an administrator PowerShell window, restart Windows, and launch Docker Desktop again. Confirm that Docker Desktop uses the WSL 2 backend and Linux containers, then rerun `docker version`.

### The application shows `RUNNER_UNAVAILABLE`

Make sure Docker Desktop is running, then run:

```powershell
npm run runner:build
npm run doctor
```

If `doctor` still fails, use its output to check the Docker service, pinned runner image, or local port availability.

### The web or API port is already in use

Close the program using the port, or set `JAB_WEB_PORT` and `JAB_API_PORT` as described in “Port Configuration.”

### Clearing learning progress

Drafts, prediction results, hint usage, and passing records are stored in the current browser's `localStorage`. Delete the site data for `127.0.0.1` in your browser settings to clear all local learning records.

## Security Boundary and Current Limitations

This project is designed for single-user learning on a local machine and listens only on loopback addresses. It is not a production multi-tenant judging platform and should not be exposed directly to a local network or the internet.

Each student task uses an isolated temporary directory and a disposable container. Containers have networking disabled, run as a non-root user, and limit CPU, memory, process count, output size, and execution time. Do not use global cleanup commands such as `docker system prune` to manage this project.

The current course is limited to the ten problems listed above. Learning data is stored only in the current browser and is not synchronized after switching browsers, clearing site data, or reinstalling the operating system. Algorithm visualizations support only the built-in reference solutions and do not generate execution traces for arbitrary Java programs.
