import { useId } from 'react';
import type { ReferenceTrace, Structure } from '@jab/contracts';
import { ListDiagram } from './ListDiagram.js';

type Snapshot = ReferenceTrace['initialState'] | ReferenceTrace['snapshots'][number];
type Value = Snapshot['variables'][number]['value'];

export function formatValue(value: Value): string {
  if (value.kind === 'reference') return value.objectId === null ? 'null（未引用对象）' : `对象 ${value.objectId}`;
  if (value.kind === 'char') return value.value === ' ' ? "'␠'（空格）" : `'${value.value}'`;
  if (value.kind === 'string') return JSON.stringify(value.value);
  return String(value.value);
}

export function structureItemCount(structure: Structure): number {
  switch (structure.kind) {
    case 'array': return structure.values.length;
    case 'map': return structure.entries.length;
    case 'stack': return structure.items.length;
    case 'list': return structure.nodes.length;
    case 'tree': return Math.max(structure.nodes.length, structure.frames.length);
    case 'dp': return structure.values.length;
    case 'window': return structure.text.length;
  }
}

function intVariable(snapshot: Snapshot, name: string) {
  const value = snapshot.variables.find(variable => variable.name === name)?.value;
  return value?.kind === 'int' ? value.value : undefined;
}

function ArrayDiagram({ array, closedInterval }: { array: Extract<Structure, { kind: 'array' }>; closedInterval?: { left: number; right: number; mid?: number } }) {
  const width = Math.max(300, array.values.length * 68);
  return <section className="structure-diagram" data-testid={`structure-array-${array.id}`}>
    <h4>数组 {array.id}</h4>
    {closedInterval && <p data-testid="search-interval">{closedInterval.left > closedInterval.right ? `搜索区间为空：left=${closedInterval.left}，right=${closedInterval.right}` : `候选闭区间 [${closedInterval.left}, ${closedInterval.right}]`}</p>}
    <div style={{ overflowX: 'auto' }}><svg role="img" aria-label={closedInterval ? '数组与搜索区间' : `数组 ${array.id}`} width={width} height="138" viewBox={`0 0 ${width} 138`}>
      {array.values.map((value, index) => {
        const inRange = closedInterval !== undefined && index >= closedInterval.left && index <= closedInterval.right;
        const isMid = closedInterval?.mid === index;
        return <g key={`${array.id}-${index}`} transform={`translate(${index * 68 + 4}, 20)`} data-array-index={index}>
          <rect width="60" height="48" rx="7" fill={inRange ? '#dcefe6' : '#edf0f3'} stroke={isMid ? '#a54117' : '#7b8790'} strokeWidth={isMid ? 3 : 1} />
          <text x="30" y="30" textAnchor="middle" fill="#172b32" fontSize="15">{value}</text>
          <text x="30" y="67" textAnchor="middle" fill="#354c55" fontSize="12">下标 {index}</text>
          <text x="30" y="88" textAnchor="middle" fill="#762e13" fontSize="11">{array.indices.filter(pointer => pointer.index === index).map(pointer => pointer.name).join('/')}</text>
        </g>;
      })}
    </svg></div>
    {array.values.length === 0 && <p>空数组：没有可显示的元素。</p>}
    <p>{array.indices.filter(pointer => pointer.index < 0 || pointer.index >= array.values.length).map(pointer => `${pointer.name}=${pointer.index}（边界哨兵，不是数组元素）`).join('；')}</p>
  </section>;
}

function MapDiagram({ map }: { map: Extract<Structure, { kind: 'map' }> }) {
  return <section className="structure-diagram" data-testid={`structure-map-${map.id}`}>
    <h4>映射 {map.id}</h4>
    {!map.entries.length ? <p>映射为空，尚未记录键值。</p> : <table aria-label={`映射 ${map.id}`}><thead><tr><th>键</th><th>值</th></tr></thead><tbody>{map.entries.map((entry, index) => <tr key={`${entry.key.kind}-${formatValue(entry.key)}-${index}`}><td>{formatValue(entry.key)}</td><td>{formatValue(entry.value)}</td></tr>)}</tbody></table>}
  </section>;
}

function StackDiagram({ stack }: { stack: Extract<Structure, { kind: 'stack' }> }) {
  return <section className="structure-diagram" data-testid={`structure-stack-${stack.id}`}>
    <h4>栈 {stack.id}</h4>
    {!stack.items.length ? <p data-testid="empty-stack">空栈：没有栈顶元素。</p> : <ol aria-label={`栈 ${stack.id}，从栈底到栈顶`} style={{ display: 'flex', gap: '.5rem', alignItems: 'stretch', padding: 0, listStyle: 'none', flexWrap: 'wrap' }}>{stack.items.map((item, index) => <li key={index} data-stack-index={index} style={{ border: index === stack.topIndex ? '3px solid #a54117' : '1px solid #7b8790', borderRadius: 7, padding: '.55rem', minWidth: '4rem', background: index === stack.topIndex ? '#ffe4ac' : '#edf0f3' }}><span>{formatValue(item)}</span>{index === stack.topIndex && <small style={{ display: 'block' }}>栈顶</small>}</li>)}</ol>}
  </section>;
}

function TreeDiagram({ tree }: { tree: Extract<Structure, { kind: 'tree' }> }) {
  const marker = useId().replace(/[^a-zA-Z0-9]/g, '');
  const byId = new Map(tree.nodes.map(node => [node.id, node]));
  const levelById = new Map<string, number>();
  const levels: string[][] = [];
  if (tree.rootId !== null) {
    const queue: Array<{ id: string; depth: number }> = [{ id: tree.rootId, depth: 0 }];
    while (queue.length) {
      const current = queue.shift()!;
      if (levelById.has(current.id)) continue;
      levelById.set(current.id, current.depth);
      (levels[current.depth] ??= []).push(current.id);
      const node = byId.get(current.id);
      if (node?.leftId) queue.push({ id: node.leftId, depth: current.depth + 1 });
      if (node?.rightId) queue.push({ id: node.rightId, depth: current.depth + 1 });
    }
  }
  const width = Math.max(420, Math.max(1, ...levels.map(level => level.length)) * 150);
  const height = Math.max(150, levels.length * 115 + 35);
  const positions = new Map<string, { x: number; y: number }>();
  levels.forEach((level, depth) => level.forEach((nodeId, index) => positions.set(nodeId, { x: (index + 1) * width / (level.length + 1), y: depth * 115 + 50 })));
  const phaseName = { enter: '进入', 'await-left': '等待左子树', 'await-right': '等待右子树', return: '准备返回' } as const;
  return <section className="structure-diagram" data-testid={`structure-tree-${tree.id}`}>
    <h4>树对象 {tree.id}</h4>
    <p>节点 ID 表示对象身份；调用帧 ID 表示一次方法调用，两者不是同一概念。</p>
    {tree.rootId === null ? <p data-testid="empty-tree">空树：root 引用为 null。</p> : <div style={{ overflowX: 'auto' }}><svg role="img" aria-label={`树对象图 ${tree.id}`} width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs><marker id={marker} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#28736a" /></marker></defs>
      {tree.nodes.flatMap(node => [node.leftId, node.rightId].flatMap(childId => {
        const from = positions.get(node.id); const to = childId === null ? undefined : positions.get(childId);
        return from && to ? [<path key={`${node.id}-${childId}`} d={`M ${from.x} ${from.y + 30} L ${to.x} ${to.y - 31}`} stroke="#28736a" strokeWidth="2" fill="none" markerEnd={`url(#${marker})`} />] : [];
      }))}
      {tree.nodes.flatMap(node => { const position = positions.get(node.id); return position ? [<g key={node.id} data-node-id={node.id}><circle cx={position.x} cy={position.y} r="30" fill="#e2f0ea" stroke="#28736a" strokeWidth="2" /><text x={position.x} y={position.y - 4} textAnchor="middle" fill="#173b35" fontWeight="bold">{node.id}</text><text x={position.x} y={position.y + 15} textAnchor="middle" fill="#173b35">val={node.value}</text></g>] : []; })}
    </svg></div>}
    <table aria-label={`树对象字段 ${tree.id}`}><thead><tr><th>节点 ID</th><th>val</th><th>left</th><th>right</th></tr></thead><tbody>{tree.nodes.map(node => <tr key={node.id}><td>{node.id}</td><td>{node.value}</td><td>{node.leftId ?? 'null'}</td><td>{node.rightId ?? 'null'}</td></tr>)}</tbody></table>
    <h4>方法调用帧（栈底 → 栈顶）</h4>
    {!tree.frames.length ? <p data-testid="empty-frames">当前没有活动调用帧。</p> : <table aria-label={`调用帧 ${tree.id}`}><thead><tr><th>帧 ID</th><th>参数节点</th><th>阶段</th><th>左深度</th><th>右深度</th><th>返回值</th></tr></thead><tbody>{tree.frames.map((frame, index) => <tr key={frame.frameId} data-frame-id={frame.frameId}><td>{frame.frameId}{index === tree.frames.length - 1 ? '（栈顶）' : ''}</td><td>{frame.nodeId ?? 'null'}</td><td>{phaseName[frame.phase]}</td><td>{frame.leftDepth ?? '—'}</td><td>{frame.rightDepth ?? '—'}</td><td>{frame.returnValue ?? '—'}</td></tr>)}</tbody></table>}
  </section>;
}

function DpDiagram({ dp }: { dp: Extract<Structure, { kind: 'dp' }> }) {
  return <section className="structure-diagram" data-testid={`structure-dp-${dp.id}`}>
    <h4>动态规划状态 {dp.id}</h4>
    <div style={{ overflowX: 'auto' }}><table aria-label={`动态规划状态 ${dp.id}`}><thead><tr>{dp.values.map((_, index) => <th key={index}>状态 {index}</th>)}</tr></thead><tbody><tr>{dp.values.map((value, index) => <td key={index} data-active={index === dp.activeIndex ? 'true' : 'false'} style={{ background: index === dp.activeIndex ? '#ffe4ac' : undefined }}>{value === null ? '未计算' : value}</td>)}</tr></tbody></table></div>
    {!dp.values.length && <p>没有 DP 状态。</p>}
  </section>;
}

function WindowDiagram({ window }: { window: Extract<Structure, { kind: 'window' }> }) {
  const visibleChar = (char: string) => char === ' ' ? '␠' : char;
  return <section className="structure-diagram" data-testid={`structure-window-${window.id}`}>
    <h4>连续窗口 {window.id}</h4>
    <p data-testid="window-range">半开区间 [{window.left}, {window.rightExclusive})，长度 {window.rightExclusive - window.left}</p>
    {!window.text.length ? <p data-testid="empty-window-text">输入是空字符串。</p> : <ol aria-label={`字符串窗口 ${window.id}`} style={{ display: 'flex', gap: '.3rem', padding: 0, listStyle: 'none', flexWrap: 'wrap' }}>{Array.from(window.text).map((char, index) => <li key={index} data-text-index={index} style={{ border: '1px solid #7b8790', borderRadius: 5, padding: '.4rem', minWidth: '2.5rem', textAlign: 'center', background: index >= window.left && index < window.rightExclusive ? '#dcefe6' : '#edf0f3' }}><strong>{visibleChar(char)}</strong><small style={{ display: 'block' }}>{index}</small></li>)}</ol>}
    <p>窗口成员：{window.members.length ? window.members.map(formatValue).join('、') : '空'}</p>
  </section>;
}

export function StructureRenderer({ structure, snapshot, showBinaryRange = false }: { structure: Structure; snapshot: Snapshot; showBinaryRange?: boolean }) {
  switch (structure.kind) {
    case 'array': {
      const left = intVariable(snapshot, 'left'); const right = intVariable(snapshot, 'right'); const mid = intVariable(snapshot, 'mid');
      const closedInterval = showBinaryRange && left !== undefined && right !== undefined ? { left, right, ...(mid === undefined ? {} : { mid }) } : undefined;
      return <ArrayDiagram array={structure} closedInterval={closedInterval} />;
    }
    case 'map': return <MapDiagram map={structure} />;
    case 'stack': return <StackDiagram stack={structure} />;
    case 'list': return <ListDiagram list={structure} />;
    case 'tree': return <TreeDiagram tree={structure} />;
    case 'dp': return <DpDiagram dp={structure} />;
    case 'window': return <WindowDiagram window={structure} />;
  }
}
