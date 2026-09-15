import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ReferenceTraceSchema, expectedOutput, stableJson, type ReferenceTrace } from '@jab/contracts';
import { buildReferenceTrace, predictionAt } from './model.js';
import { REFERENCE_SOURCE, REFERENCE_STEP_MAP } from './reference.js';

type State = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];

function intAt(snapshot: State, name: string): number | undefined {
  const value = snapshot.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
}

function boolAt(snapshot: State, name: string): boolean | undefined {
  const value = snapshot.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'boolean' ? value.value : undefined;
}

function charAt(snapshot: State, name: string): string | undefined {
  const value = snapshot.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'char' ? value.value : undefined;
}

function stackAt(snapshot: State): string[] {
  const structure = snapshot.structures.find(item => item.kind === 'stack');
  if (structure?.kind !== 'stack') throw new Error('Missing unmatched-opens stack');
  expect(structure.id).toBe('unmatched-opens');
  expect(structure.topIndex).toBe(structure.items.length === 0 ? null : structure.items.length - 1);
  return structure.items.map(item => {
    if (item.kind !== 'char') throw new Error('Parentheses stack must contain chars');
    return item.value;
  });
}

function processValidPrefix(prefix: string): string[] {
  const stack: string[] = [];
  const matching: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  for (const current of prefix) {
    if ('([{'.includes(current)) stack.push(current);
    else {
      const open = stack.pop();
      if (open !== matching[current]) throw new Error(`Prefix is already invalid: ${prefix}`);
    }
  }
  return stack;
}

function verifyInvariants(trace: ReferenceTrace, s: string) {
  expect(trace.initialState.structures.some(structure => structure.kind === 'stack')).toBe(false);
  let sawTerminal = false;
  for (const snapshot of trace.snapshots) {
    const mapped = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId);
    expect(snapshot.codeRange).toEqual(mapped && { startLine: mapped.startLine, endLine: mapped.endLine });
    const stack = stackAt(snapshot);
    const index = intAt(snapshot, 'i');

    if (snapshot.stepId === 'init-stack') expect(stack).toEqual([]);
    if (index !== undefined && ['check-char', 'read-char', 'check-opening', 'check-empty'].includes(snapshot.stepId)) {
      expect(stack).toEqual(processValidPrefix(s.slice(0, index)));
    }
    if (index !== undefined && snapshot.stepId === 'push-open') {
      expect(stack).toEqual(processValidPrefix(s.slice(0, index + 1)));
      expect(stack.at(-1)).toBe(charAt(snapshot, 'current'));
    }
    if (index !== undefined && ['pop-open', 'compare-pair', 'return-mismatch'].includes(snapshot.stepId)) {
      const before = processValidPrefix(s.slice(0, index));
      expect(charAt(snapshot, 'open')).toBe(before.at(-1));
      expect(stack).toEqual(before.slice(0, -1));
    }
    if (index !== undefined && snapshot.stepId === 'compare-pair' && boolAt(snapshot, '类型匹配')) {
      expect(stack).toEqual(processValidPrefix(s.slice(0, index + 1)));
    }
    if (snapshot.stepId === 'check-empty') expect(boolAt(snapshot, '栈为空')).toBe(stack.length === 0);
    if (['return-empty-error', 'return-mismatch', 'return-final'].includes(snapshot.stepId)) {
      sawTerminal = true;
      const returned = boolAt(snapshot, '返回值');
      expect(returned).toBe(trace.finalOutput.kind === 'boolean' ? trace.finalOutput.value : undefined);
    }
  }
  expect(sawTerminal).toBe(true);
  expect(trace.finalOutput).toEqual(expectedOutput('20', { s }));
}

describe('20 immutable unmatched-open stack reference model', () => {
  it('validates input, hashes, topIndex and initial state independently', async () => {
    const input = { s: '([{}])' };
    const trace = await buildReferenceTrace(input, 'nested-valid');
    expect(ReferenceTraceSchema.parse(trace)).toEqual(trace);
    expect(trace.referenceSourceHash).toBe(createHash('sha256').update(REFERENCE_SOURCE).digest('hex'));
    expect(trace.inputHash).toBe(createHash('sha256').update(stableJson(input)).digest('hex'));
    expect(trace.initialState.variables.map(variable => variable.name)).toEqual(['s', 'length', '阶段']);
    expect(trace.initialState.structures).toEqual([]);
    const initialized = trace.snapshots.find(snapshot => snapshot.stepId === 'init-stack')!;
    expect(stackAt(initialized)).toEqual([]);
    expect(initialized.variables).toContainEqual({ name: 'stack', value: { kind: 'reference', objectId: 'unmatched-opens' } });
    await expect(buildReferenceTrace({ s: '' }, 'empty')).rejects.toThrow();
    await expect(buildReferenceTrace({ s: '(a)' }, 'bad-char')).rejects.toThrow();
    await expect(buildReferenceTrace({ s: '('.repeat(31) }, 'too-long')).rejects.toThrow(/30/);
    await expect(buildReferenceTrace(input, '')).rejects.toThrow();
  });

  it('maintains exactly the unmatched opening brackets for valid, crossed, empty-pop and leftover paths', async () => {
    const samples = ['()', '()[]{}', '([{}])', '(]', '([)]', ']', '(', '{{[[(())]]}}', '(){[()]}', '}{'];
    for (const s of samples) verifyInvariants(await buildReferenceTrace({ s }, `case-${s}`), s);

    const leading = await buildReferenceTrace({ s: ']' }, 'order-check');
    expect(leading.snapshots.map(snapshot => snapshot.stepId)).toEqual([
      'init-stack', 'check-char', 'read-char', 'check-opening', 'check-empty', 'return-empty-error',
    ]);
    expect(leading.snapshots.some(snapshot => snapshot.stepId === 'pop-open')).toBe(false);
    expect(leading.finalOutput).toEqual({ kind: 'boolean', value: false });
  });

  it('provides two input-specific predictions with options on every choice answer', async () => {
    const predictions = async (s: string) => {
      const trace = await buildReferenceTrace({ s }, `prediction-${s}`);
      return trace.snapshots.flatMap((_, index) => predictionAt(trace, index) ?? []);
    };
    const nested = await predictions('([{}])');
    expect(nested.map(item => item.answer)).toEqual([
      { kind: 'text', value: '(' },
      { kind: 'choice', optionId: 'true' },
    ]);
    const leading = await predictions(']');
    expect(leading.map(item => item.answer)).toEqual([
      { kind: 'choice', optionId: 'stop' },
      { kind: 'choice', optionId: 'false' },
    ]);
    const leftover = await predictions('(');
    expect(leftover.map(item => item.answer)).toEqual([
      { kind: 'text', value: '(' },
      { kind: 'choice', optionId: 'false' },
    ]);
    for (const item of [...nested, ...leading, ...leftover]) {
      if (item.answer.kind === 'choice') {
        const optionId = item.answer.optionId;
        expect(item.options?.length).toBeGreaterThanOrEqual(2);
        expect(item.options?.some(option => option.id === optionId)).toBe(true);
      }
    }
  });

  it('is deterministic, deeply frozen, input-isolated and preserves earlier stack states for back/forward display', async () => {
    const input = { s: '([])' };
    const trace = await buildReferenceTrace(input, 'history');
    expect(trace).toEqual(await buildReferenceTrace({ s: '([])' }, 'history'));
    const afterRound = trace.snapshots.find(snapshot => snapshot.stepId === 'push-open' && intAt(snapshot, 'i') === 0)!;
    const afterSquare = trace.snapshots.find(snapshot => snapshot.stepId === 'push-open' && intAt(snapshot, 'i') === 1)!;
    const afterSquareClose = trace.snapshots.find(snapshot => snapshot.stepId === 'compare-pair' && intAt(snapshot, 'i') === 2)!;
    expect(stackAt(afterRound)).toEqual(['(']);
    expect(stackAt(afterSquare)).toEqual(['(', '[']);
    expect(stackAt(afterSquareClose)).toEqual(['(']);
    expect(stackAt(afterSquare)).toEqual(['(', '[']);

    input.s = '()';
    expect(trace.finalOutput).toEqual({ kind: 'boolean', value: true });
    const assertFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(assertFrozen);
      }
    };
    assertFrozen(trace);
    expect(Reflect.set(afterSquare, 'explanation', 'mutated')).toBe(false);
    const other = await buildReferenceTrace({ s: '[]' }, 'other');
    expect(other.inputHash).not.toBe(trace.inputHash);
    expect(other.snapshots.some(snapshot => snapshot.checkpointId && trace.snapshots.some(old => old.checkpointId === snapshot.checkpointId))).toBe(false);
  });

  it('returns null outside checkpoints and maps every snapshot to the fixed reference source', async () => {
    const trace = await buildReferenceTrace({ s: '()' }, 'mapping');
    expect(predictionAt(trace, -1)).toBeNull();
    expect(predictionAt(trace, 999)).toBeNull();
    const lines = REFERENCE_SOURCE.split('\n');
    for (const snapshot of trace.snapshots) {
      const mapped = REFERENCE_STEP_MAP.find(step => step.stepId === snapshot.stepId)!;
      expect(lines[mapped.startLine - 1]!.trim()).not.toBe('');
      expect(snapshot.codeRange).toEqual({ startLine: mapped.startLine, endLine: mapped.endLine });
    }
  });
});
