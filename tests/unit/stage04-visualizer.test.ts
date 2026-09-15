import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ReferenceTrace, Structure } from '@jab/contracts';
import { formatValue, structureItemCount, StructureRenderer } from '@jab/visualizer';

const structures = [
  { kind: 'array', id: 'nums', values: [2, 7], indices: [{ name: 'left', index: 0 }, { name: 'right', index: 1 }, { name: 'mid', index: 0 }] },
  { kind: 'array', id: 'answer', values: [0, 1], indices: [{ name: 'write', index: 1 }] },
  { kind: 'map', id: 'seen', entries: [{ key: { kind: 'int', value: 2 }, value: { kind: 'int', value: 0 } }] },
  { kind: 'stack', id: 'opens', items: [{ kind: 'char', value: '(' }], topIndex: 0 },
  { kind: 'list', id: 'nodes', nodes: [{ id: 'a0', value: 1, nextId: 'b0' }, { id: 'b0', value: 1, nextId: null }], bindings: [{ name: 'tail', objectId: 'a0' }] },
  { kind: 'tree', id: 'root', nodes: [{ id: 't0', value: 1, leftId: null, rightId: null }], rootId: 't0', frames: [{ frameId: 'f0', nodeId: 't0', phase: 'return', leftDepth: 0, rightDepth: 0, returnValue: 1 }] },
  { kind: 'dp', id: 'ways', values: [1, 2, null], activeIndex: 1 },
  { kind: 'window', id: 'unique', text: 'a b', left: 1, rightExclusive: 3, members: [{ kind: 'char', value: ' ' }, { kind: 'char', value: 'b' }] },
] as const satisfies readonly Structure[];

const snapshot: ReferenceTrace['initialState'] = {
  snapshotId: 'initial',
  variables: [
    { name: 'left', value: { kind: 'int', value: 0 } },
    { name: 'right', value: { kind: 'int', value: 1 } },
    { name: 'mid', value: { kind: 'int', value: 0 } },
  ],
  structures,
  explanation: 'test',
};

describe('stage04 generic structure rendering', () => {
  it('renders every structure kind and keeps multiple structures of one kind', () => {
    const html = renderToStaticMarkup(createElement('div', null, structures.map((structure, index) => createElement(StructureRenderer, { key: structure.id, structure, snapshot, showBinaryRange: index === 0 }))));
    for (const marker of ['structure-array-nums', 'structure-array-answer', 'structure-map-seen', 'structure-stack-opens', 'reference-bindings', 'structure-tree-root', 'structure-dp-ways', 'structure-window-unique']) expect(html).toContain(marker);
    expect(html).toContain('候选闭区间 [0, 1]');
    expect(html).toContain('节点 ID 表示对象身份');
    expect(html).toContain('方法调用帧（栈底 → 栈顶）');
    expect(html).toContain('半开区间 [1, 3)');
    expect(html).toContain('␠');
  });

  it('applies the 30-item limit independently by structure kind', () => {
    expect(structures.map(structureItemCount)).toEqual([2, 2, 1, 1, 2, 1, 3, 3]);
    const largeWindow: Structure = { kind: 'window', id: 'long', text: 'x'.repeat(31), left: 0, rightExclusive: 0, members: [] };
    expect(structureItemCount(largeWindow)).toBe(31);
  });

  it('formats values without conflating null, references, strings and spaces', () => {
    expect(formatValue({ kind: 'reference', objectId: null })).toBe('null（未引用对象）');
    expect(formatValue({ kind: 'reference', objectId: 'h0' })).toBe('对象 h0');
    expect(formatValue({ kind: 'char', value: ' ' })).toBe("'␠'（空格）");
    expect(formatValue({ kind: 'string', value: 'null' })).toBe('"null"');
  });
});
