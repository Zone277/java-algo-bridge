import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { OutputSchema, type ProblemId, type ProblemInput } from '@jab/contracts';
import { CONTAINER_LABEL, RUNNER_IMAGE, judgeRuntimeOutput } from '../../apps/api/src/runner.js';

const execute = promisify(execFile);
type WireCase = { status: string; output?: unknown; reason?: string };

async function trustedRun(problemId: ProblemId, source: string, input: ProblemInput): Promise<WireCase> {
  const root = resolve(tmpdir());
  const directory = await mkdtemp(join(root, 'jab-stage04-adapter-'));
  if (dirname(resolve(directory)) !== root) throw new Error('Unsafe stage04 test directory');
  const name = `jab-stage04-adapter-${randomUUID()}`;
  try {
    await Promise.all([
      writeFile(join(directory, 'Solution.java'), source),
      writeFile(join(directory, 'inputs.json'), JSON.stringify([input])),
      writeFile(join(directory, 'problem.txt'), problemId),
    ]);
    const { stdout } = await execute('docker', ['run', '--name', name, '--label', CONTAINER_LABEL, '--network', 'none', '--user', '10001:10001', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--read-only', '--cpus', '1', '--memory', '512m', '--memory-swap', '512m', '--pids-limit', '128', '--tmpfs', '/work:rw,nosuid,nodev,size=128m,mode=1777', '--tmpfs', '/tmp:rw,nosuid,nodev,size=32m,mode=1777', '--mount', `type=bind,source=${directory},target=/input,readonly`, RUNNER_IMAGE], { timeout: 30000, maxBuffer: 20 * 1024 * 1024, windowsHide: true });
    const packet = JSON.parse(stdout) as { phase: string; cases: WireCase[] };
    expect(packet.phase).toBe('execute');
    expect(packet.cases).toHaveLength(1);
    return packet.cases[0]!;
  } finally {
    try { await execute('docker', ['rm', '-f', name], { timeout: 5000, windowsHide: true }); } catch { /* absent container is already clean */ }
    await rm(directory, { recursive: true, force: true, maxRetries: 3 });
  }
}

const correct = [
  ['283', 'class Solution { public void moveZeroes(int[] a) { int w=0; for(int x:a) if(x!=0) a[w++]=x; while(w<a.length) a[w++]=0; } }', { nums: [0, 1, 0, 3] }],
  ['977', 'class Solution { public int[] sortedSquares(int[] a) { int[] r=new int[a.length]; int l=0,h=a.length-1; for(int w=a.length-1;w>=0;w--){ if(Math.abs(a[l])>Math.abs(a[h])) r[w]=a[l]*a[l++]; else r[w]=a[h]*a[h--]; } return r; } }', { nums: [-4, -1, 0, 3, 10] }],
  ['1', 'class Solution { public int[] twoSum(int[] a,int t) { for(int i=0;i<a.length;i++) for(int j=i+1;j<a.length;j++) if(a[i]+a[j]==t) return new int[]{j,i}; throw new RuntimeException(); } }', { nums: [2, 7, 11, 15], target: 9 }],
  ['20', 'class Solution { public boolean isValid(String s) { java.util.ArrayDeque<Character> q=new java.util.ArrayDeque<>(); for(char c:s.toCharArray()){ if(c==\'(\'||c==\'[\'||c==\'{\') q.push(c); else { if(q.isEmpty()) return false; char o=q.pop(); if((c==\')\'&&o!=\'(\')||(c==\']\'&&o!=\'[\')||(c==\'}\'&&o!=\'{\')) return false; } } return q.isEmpty(); } }', { s: '([]){}' }],
  ['21', 'class Solution { public ListNode mergeTwoLists(ListNode a,ListNode b) { ListNode d=new ListNode(),t=d; while(a!=null&&b!=null){ if(a.val<=b.val){t.next=a;a=a.next;}else{t.next=b;b=b.next;}t=t.next;} t.next=a!=null?a:b; return d.next; } }', { list1: [1, 2, 4], list2: [1, 3, 4] }],
  ['104', 'class Solution { public int maxDepth(TreeNode r) { return r==null?0:1+Math.max(maxDepth(r.left),maxDepth(r.right)); } }', { root: [1, null, 2, 3] }],
  ['70', 'class Solution { public int climbStairs(int n) { if(n==1)return 1; int a=1,b=2; for(int i=3;i<=n;i++){int c=a+b;a=b;b=c;} return b; } }', { n: 45 }],
  ['3', 'class Solution { public int lengthOfLongestSubstring(String s) { java.util.Map<Character,Integer> m=new java.util.HashMap<>(); int l=0,b=0; for(int r=0;r<s.length();r++){ l=Math.max(l,m.getOrDefault(s.charAt(r),-1)+1);m.put(s.charAt(r),r);b=Math.max(b,r-l+1);}return b;} }', { s: 'pwwkew' }],
] as const satisfies readonly (readonly [ProblemId, string, ProblemInput])[];

describe('stage04 trusted adapter signatures and typed outputs', () => {
  it.each(correct)('executes problem %s and lets the host semantic judge accept it', async (problemId, source, input) => {
    const item = await trustedRun(problemId, source, input);
    expect(item.status).toBe('OK');
    const output = OutputSchema.parse(item.output);
    expect(judgeRuntimeOutput(problemId, input, output).passed).toBe(true);
  });

  it('observes the original 283 array when student code only reassigns its local parameter', async () => {
    const input = { nums: [0, 1, 0] };
    const item = await trustedRun('283', 'class Solution { public void moveZeroes(int[] nums) { nums = new int[]{1,0,0}; } }', input);
    const output = OutputSchema.parse(item.output);
    expect(output).toEqual({ kind: 'int-array', values: [0, 1, 0] });
    expect(judgeRuntimeOutput('283', input, output).passed).toBe(false);
  });

  it('marks a cloned 21 result as an unknown identity without traversing it', async () => {
    const input = { list1: [1, 2], list2: [1, 3] };
    const source = 'class Solution { public ListNode mergeTwoLists(ListNode a,ListNode b) { ListNode d=new ListNode(),t=d; while(a!=null||b!=null){int v=b==null||(a!=null&&a.val<=b.val)?a.val:b.val;if(b==null||(a!=null&&a.val<=b.val))a=a.next;else b=b.next;t.next=new ListNode(v);t=t.next;}return d.next;} }';
    const item = await trustedRun('21', source, input);
    expect(item.status).toBe('WRONG_ANSWER');
    expect(item.reason).toContain('新增节点');
    expect(OutputSchema.parse(item.output)).toMatchObject({ kind: 'list-graph', headId: 'unknown0' });
  });
});
