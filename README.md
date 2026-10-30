# Java Algo Bridge

[English](README.md) | [简体中文](README.zh-CN.md)

A local-first Java algorithm learning tool for Windows. It helps learners with basic C and data-structure knowledge turn familiar concepts into practical Java and algorithm skills.

## Highlights

- Forty-three progressively structured algorithm problems covering arrays, strings, hashing, stacks, linked lists, binary trees, dynamic programming, and sliding windows.
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
| 35 | Search Insert Position | Half-open array intervals | Lower-bound binary search |
| 121 | Best Time to Buy and Sell Stock | Array scanning and local variables | Prefix minimum and best profit |
| 217 | Contains Duplicate | `HashSet<Integer>` | One-pass duplicate detection |
| 53 | Maximum Subarray | Array scanning and `Math.max` | Best sum of a nonempty contiguous range |
| 167 | Two Sum II — Input Array Is Sorted | Arrays and one-based result indices | Opposing pointers on sorted values |
| 242 | Valid Anagram | `String.charAt` and `int[26]` | Letter-frequency comparison |
| 88 | Merge Sorted Array | `void` and shared array objects | Backward in-place merge |
| 125 | Valid Palindrome | `String.charAt` and ASCII case handling | Opposing pointers skipping punctuation |
| 169 | Majority Element | `int` locals and enhanced `for` | Pair cancellation and vote count |
| 11 | Container With Most Water | Array indices, `Math.min/max`, integer arithmetic | Opposing pointers and discarding the shorter wall |
| 209 | Minimum Size Subarray Sum | Nested `while` and running sums | Shrinking a contiguous positive-number window |
| 198 | House Robber | Temporary variables and assignment order | Nonadjacent choices with rolling prefix optima |
| 153 | Find Minimum in Rotated Sorted Array | Integer division and array bounds | Binary search preserving the minimum candidate |
| 136 | Single Number | Bitwise XOR on Java int | Pair cancellation with a prefix invariant |
| 746 | Min Cost Climbing Stairs | Math.min and rolling variables | Minimum arrival cost with two free starting positions |
| 33 | Search in Rotated Sorted Array | Array bounds and boolean conditions | Binary search using the sorted half |
| 392 | Is Subsequence | String.length, charAt and short-circuit conditions | Ordered noncontiguous matching with two pointers |
| 322 | Coin Change | Arrays.fill, nested loops and sentinel values | Minimum coin count with unlimited reuse |
| 724 | Find Pivot Index | Array sums and update order | Leftmost balance of exclusive sides |
| 219 | Contains Duplicate II | HashMap and integer indices | Nearest occurrence with bounded distance |
| 560 | Subarray Sum Equals K | HashMap frequencies and getOrDefault | Prefix differences with negative numbers |
| 34 | Find First and Last Position of Element in Sorted Array | Array returns and half-open ranges | Two binary searches for duplicate boundaries |
| 202 | Happy Number | Remainder, integer division and HashSet | Digit-square transformation and cycle detection |
| 387 | First Unique Character in a String | charAt and int[26] | Whole-string counts and earliest unique index |
| 69 | Sqrt(x) | Integer division and overflow-safe bounds | Binary search for the floor square root |
| 122 | Best Time to Buy and Sell Stock II | Array scanning and running totals | Greedy sum of positive price changes |
| 144 | Binary Tree Preorder Traversal | `TreeNode`, `List<Integer>` and recursion | Root-left-right traversal with stable node identities |
| 94 | Binary Tree Inorder Traversal | `TreeNode`, `List<Integer>` and recursion | Left-root-right traversal with stable node identities |
| 268 | Missing Number | `int[]`, `length`, bitwise XOR | Pairwise cancellation across 0..n |
| 338 | Counting Bits | `int[]`, right shift, bitwise AND | Dynamic programming over computed prefixes |
| 145 | Binary Tree Postorder Traversal | `TreeNode`, `List<Integer>`, recursion | Visit left and right subtrees before the root |
| 231 | Power of Two | Signed `int`, bitwise AND, `boolean` | Test for exactly one set bit in a positive integer |
| 383 | Ransom Note | `String`, `charAt`, `int[26]` | Count and consume available letters |

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

The current course is limited to the sixteen problems listed above. Learning data is stored only in the current browser and is not synchronized after switching browsers, clearing site data, or reinstalling the operating system. Algorithm visualizations support only the built-in reference solutions and do not generate execution traces for arbitrary Java programs.
