# 资料与方案边界

核对日期：2026-09-09。

以下官方资料用于核对工具能力与技术语义。架构、分工、题目顺序、阶段划分和初始资源预算是本提示词包的设计建议，不是这些文档承诺的唯一最佳方案。

## Codex 与提示词

Subagents：当前文档说明原生 subagent 工作流、显式委派、客户端线程可见性，并提醒并行写入可能冲突。实际客户端能力仍以本机检查为准。
`https://learn.chatgpt.com/docs/agent-configuration/subagents`

AGENTS.md：项目级持久指令与分层发现规则。
`https://learn.chatgpt.com/docs/agent-configuration/agents-md`

Git worktrees：隔离工作目录与并行聊天，要求 Git 仓库；不能仅因存在子 agent 就假定自动隔离。
`https://learn.chatgpt.com/docs/environments/git-worktrees`

Codex CLI：本地目录内读写、执行与安装说明。
`https://learn.chatgpt.com/docs/codex/cli`

Prompting：目标、上下文、输出与边界。
`https://learn.chatgpt.com/docs/prompting`

## Java 与工具链

Java 21 语言规范第 4 章：基本类型、引用类型、对象和数组。
`https://docs.oracle.com/javase/specs/jls/se21/html/jls-4.html`

Vite 官方入门：React/TypeScript 模板与开发服务器。
`https://vite.dev/guide/`

Node.js 发布状态：本次核对时 24 为 LTS 分支；执行时仍应检查受支持补丁与依赖兼容性。
`https://nodejs.org/en/about/previous-releases`

Monaco Editor 官方入口：编辑器不是 Java 编译器，本站编译反馈设计来自独立 runner。
`https://microsoft.github.io/monaco-editor/`

Docker run、资源限制与安全说明：限制需要实际配置与环境验证，容器并不自动成为完备的多租户安全系统。
`https://docs.docker.com/engine/containers/run/`
`https://docs.docker.com/engine/containers/resource_constraints/`
`https://docs.docker.com/engine/security/`
`https://docs.docker.com/engine/security/rootless/tips/`

## 题目官方来源

704：`https://leetcode.com/problems/binary-search/`
283：`https://leetcode.com/problems/move-zeroes/`
977：`https://leetcode.com/problems/squares-of-a-sorted-array/`
1：`https://leetcode.com/problems/two-sum/`
20：`https://leetcode.com/problems/valid-parentheses/`
206：`https://leetcode.com/problems/reverse-linked-list/`
21：`https://leetcode.com/problems/merge-two-sorted-lists/`
104：`https://leetcode.com/problems/maximum-depth-of-binary-tree/`
70：`https://leetcode.com/problems/climbing-stairs/`
3：`https://leetcode.com/problems/longest-substring-without-repeating-characters/`
35：`https://leetcode.com/problems/search-insert-position/`
121：`https://leetcode.com/problems/best-time-to-buy-and-sell-stock/`
217：`https://leetcode.com/problems/contains-duplicate/`
53：`https://leetcode.com/problems/maximum-subarray/`
167：`https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/`
242：`https://leetcode.com/problems/valid-anagram/`
88：`https://leetcode.com/problems/merge-sorted-array/`
125：`https://leetcode.com/problems/valid-palindrome/`
169：`https://leetcode.com/problems/majority-element/`
11：`https://leetcode.com/problems/container-with-most-water/`
209：`https://leetcode.com/problems/minimum-size-subarray-sum/`
198：`https://leetcode.com/problems/house-robber/`

153：`https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/`
136：`https://leetcode.com/problems/single-number/`
746：`https://leetcode.com/problems/min-cost-climbing-stairs/`

33：`https://leetcode.com/problems/search-in-rotated-sorted-array/`
392：`https://leetcode.com/problems/is-subsequence/`
322：`https://leetcode.com/problems/coin-change/`

只用上述公开题目的任务信息作为算法原型范围；不复制付费题解或图形。本站原型不代表官方产品，不声明复现官方隐藏用例、时限或复杂度验证。

## 2026-10-23 新增公开来源

- 724：https://leetcode.com/problems/find-pivot-index/
- 219：https://leetcode.com/problems/contains-duplicate-ii/
- 560：https://leetcode.com/problems/subarray-sum-equals-k/

本轮读取公开题意与限制，课程文字、手算、代码及状态模型原创。219/560 的本站数组上限为10000，并明确区别官方上限。

## 2026-10-27 新增公开来源

- 34：https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/
- 202：https://leetcode.com/problems/happy-number/
- 387：https://leetcode.com/problems/first-unique-character-in-a-string/

仅参考公开任务语义；本站教学数组/字符串上限较公开题目缩小，课程内容和状态图原创，未声明官方合作或覆盖官方隐藏测试。

## 2026-10-28 新增公开来源

- 69：[Sqrt(x)](https://leetcode.com/problems/sqrtx/)：非负int的整数平方根，向下取整；本站参考代码不调用内置幂函数。
- 122：[Best Time to Buy and Sell Stock II](https://leetcode.com/problems/best-time-to-buy-and-sell-stock-ii/)：可多次交易，但同时最多持有一股；本站数组上限10000，小于公开题目的30000。
- 144：[Binary Tree Preorder Traversal](https://leetcode.com/problems/binary-tree-preorder-traversal/)：根→左→右访问，空树返回空列表；本站复用已有紧凑层序输入解析，教学演示最多30节点。

仅核对公开任务语义；课程题面、手算、参考Java代码与状态模型由本站原创，未复制官方题解或声称官方合作。

## 2026-10-29 新增公开来源

- 94：[Binary Tree Inorder Traversal](https://leetcode.com/problems/binary-tree-inorder-traversal/)：按左→根→右访问，空树返回空列表。本站沿用紧凑层序树输入，演示最多30节点。
- 268：[Missing Number](https://leetcode.com/problems/missing-number/)：0..n 的 n+1 个候选值中，输入有 n 个互异值，返回唯一缺失值；本站 n 上限10000。
- 338：[Counting Bits](https://leetcode.com/problems/counting-bits/)：返回 0..n 各整数的二进制1位数量，结果长度 n+1；公开题目 n 上限100000，本站因结构化输出与可视化限制收紧为9999。

只核对公开题意和约束；本站的中文题面、手算、Java参考解法和状态演示均为原创，不声称复现官方全部测试。

## 2026-10-30 新增公开来源

- 145：[Binary Tree Postorder Traversal](https://leetcode.com/problems/binary-tree-postorder-traversal/)：左→右→根，空树返回空列表。本站使用既有紧凑层序输入契约。
- 231：[Power of Two](https://leetcode.com/problems/power-of-two/)：正整数2的幂返回true，输入可覆盖完整有符号32位整数。
- 383：[Ransom Note](https://leetcode.com/problems/ransom-note/)：杂志里的每个字符最多用一次；公开约束为小写英文字母、两串各长1—100000，本站上限收紧为10000。

仅参考公开题意与限制；教学文本、示例、Java代码与状态模型均为原创，不声称通过官方隐藏测试。

## 2026-10-31 新增公开来源

- 9：[Palindrome Number](https://leetcode.com/problems/palindrome-number/)：输入有符号32位整数，判断十进制数字序列是否左右对称；负数不是回文。本站包含0与完整Java `int` 边界，参考用半段反转避免溢出。
- 101：[Symmetric Tree](https://leetcode.com/problems/symmetric-tree/)：比较二叉树围绕中心轴是否镜像对称；重复值不能替代结构配对。本站沿用紧凑层序树输入，并额外允许空树作教学边界。
- 112：[Path Sum](https://leetcode.com/problems/path-sum/)：只在完整的根到叶路径和等于目标时返回真；空树返回假。本站复用紧凑层序树输入，上限1000节点、深度128、节点值-100—100、`targetSum` -1000—1000。

仅核对公开任务语义；中文题面、推导、Java参考解法、状态模型与测试均为本站原创，不宣称官方合作或通过官方隐藏测试。

## 2026-11-01 新增公开来源

- 58：[Length of Last Word](https://leetcode.com/problems/length-of-last-word/)：仅由英文字母和空格组成的字符串，返回最后一个单词长度；本站输入沿用公开长度上限10000。
- 66：[Plus One](https://leetcode.com/problems/plus-one/)：十进制数字数组整体加一并返回数组；本站长度1—100，支持全9扩位。
- 110：[Balanced Binary Tree](https://leetcode.com/problems/balanced-binary-tree/)：每个节点的左右子树高度差均不超过1；本站复用较紧的树输入上限（1000节点、深度128）。

仅核对公开任务语义和边界；本站中文题面、推导、Java解法、状态演示与测试为原创，不宣称官方合作或通过官方隐藏测试。

## 2026-11-02 新增公开来源

- 26：[Remove Duplicates from Sorted Array](https://leetcode.com/problems/remove-duplicates-from-sorted-array/)：有序数组原地写入唯一值前缀并返回长度，返回长度后的数组内容不参与答案；本站将长度上限收紧为10000。
- 100：[Same Tree](https://leetcode.com/problems/same-tree/)：只有两棵树结构相同且每个对应节点值相同时返回true；本站分别构造两个对象图并保留null位置语义。
- 141：[Linked List Cycle](https://leetcode.com/problems/linked-list-cycle/)：判断沿`next`能否再次到达已访问节点；`pos`只描述测试输入中尾节点连接位置，不是学生方法参数。本站节点上限为1000。

仅核对公开任务语义与边界；课程题面、示例、Java参考解法、状态模型和测试均为本站原创，不宣称官方合作或通过官方隐藏测试。

## 2026-11-03 新增公开来源

- 27：[Remove Element](https://leetcode.com/problems/remove-element/)：原地移除指定值并返回有效前缀长度；有效前缀内保留元素的顺序可以不同。本站数组长度上限为10000。
- 111：[Minimum Depth of Binary Tree](https://leetcode.com/problems/minimum-depth-of-binary-tree/)：返回根到最近叶节点的节点数；缺失孩子不是叶节点路径。本站复用1000节点、深度128的树输入边界。
- 205：[Isomorphic Strings](https://leetcode.com/problems/isomorphic-strings/)：两个字符串具有一致的重复模式且字符映射双向唯一时返回true；本站限制为等长可打印ASCII字符串，长度1—10000。

仅核对公开任务语义与边界；课程题面、示例、Java参考解法、状态模型和测试均为本站原创，不宣称官方合作或通过官方隐藏测试。

## 2026-11-04 新增公开来源

- 13：[Roman to Integer](https://leetcode.com/problems/roman-to-integer/)：把1—3999的规范罗马数字转换为整数，本站输入仅接受大写规范表示。
- 203：[Remove Linked List Elements](https://leetcode.com/problems/remove-linked-list-elements/)：删除所有值等于目标值的链表节点并返回结果头；本站按无环值序列判定，不额外要求复用原节点。
- 349：[Intersection of Two Arrays](https://leetcode.com/problems/intersection-of-two-arrays/)：返回两个数组的不同共同值，顺序不限；本站值域0—1000。

仅使用公开题页核对任务语义和边界；中文题面、推导、示例、Java代码、状态模型与测试均为本站原创，不宣称官方合作或通过官方隐藏测试。
