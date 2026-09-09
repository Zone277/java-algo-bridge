import { useId } from 'react';
import type { Structure } from '@jab/contracts';

/** Node position/identity never depend on val, reachability, or current variable bindings. */
export function ListDiagram({ list }: { list: Extract<Structure, { kind: 'list' }> }) {
  const marker = useId().replace(/[^a-zA-Z0-9]/g, '');
  const width = Math.max(360, list.nodes.length * 160 + 30);
  const positions = new Map(list.nodes.map((node, i) => [node.id, i * 160 + 20]));
  return <div className="list-diagram">
    <p>稳定 ID 是教学编号，不是内存地址。所有原节点始终保留显示；不推断 GC。</p>
    <div data-testid="reference-bindings" aria-label="变量引用绑定" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>{list.bindings.map(b => <span key={b.name}><strong>{b.name}</strong> → {b.objectId ?? 'null'}</span>)}</div>
    {!list.nodes.length && <p data-testid="empty-list">空链表：没有节点对象，引用为 null。</p>}
    <div style={{ overflowX: 'auto' }}><svg role="img" aria-label="节点对象与 next 字段" data-testid="list-object-graph" width={width} height="225" viewBox={`0 0 ${width} 225`}>
      <defs><marker id={marker} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#28736a" /></marker></defs>
      {list.nodes.map(node => {
        const x = positions.get(node.id)!;
        const toX = node.nextId === null ? undefined : positions.get(node.nextId);
        return <g key={node.id} data-node-id={node.id}>
          <rect x={x} y="80" width="112" height="86" rx="10" fill="#e2f0ea" stroke="#28736a" strokeWidth="2" />
          <text x={x + 56} y="103" textAnchor="middle" fill="#173b35" fontSize="16" fontWeight="bold">{node.id}</text>
          <text x={x + 56} y="128" textAnchor="middle" fill="#173b35" fontSize="15">val = {node.value}</text>
          <text x={x + 56} y="150" textAnchor="middle" fill="#173b35" fontSize="13">next = {node.nextId ?? 'null'}</text>
          {toX !== undefined ? <path d={toX > x ? `M ${x + 112} 108 C ${x + 145} 65 ${toX - 25} 65 ${toX} 108` : `M ${x} 130 C ${x - 30} 205 ${toX + 140} 205 ${toX + 112} 130`} stroke="#28736a" strokeWidth="2" fill="none" markerEnd={`url(#${marker})`} /> : <text x={x + 56} y="191" textAnchor="middle" fill="#596b69" fontSize="13">next → null</text>}
        </g>;
      })}
    </svg></div>
    <table aria-label="对象字段表" data-testid="reference-node-fields"><thead><tr><th>对象 ID</th><th>val</th><th>next 字段</th></tr></thead><tbody>{list.nodes.map(node => <tr key={node.id}><td>{node.id}</td><td>{node.value}</td><td>{node.nextId ?? 'null'}</td></tr>)}</tbody></table>
  </div>;
}
