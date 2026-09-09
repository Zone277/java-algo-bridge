import { useEffect, useState } from 'react';
import { REFERENCE_LABEL, type Answer, type Progress, type ReferencePrediction, type ReferenceTrace } from '@jab/contracts';
import { ListDiagram } from './ListDiagram.js';

export type ReferencePlayerProps = {
  trace: ReferenceTrace;
  source: string;
  predictionAt: (index: number) => ReferencePrediction | null;
  predictionResults: Progress['predictionResults'];
  onPrediction: (record: { checkpointId: string; answer: Answer; correct: boolean }) => void;
  onViewSolution: () => void;
};

/** A keyed session ensures a new trace cannot display any state from its predecessor. */
export function ReferencePlayer(props: ReferencePlayerProps) {
  return <PlayerSession key={`${props.trace.algorithmVersion}:${props.trace.referenceSourceHash}:${props.trace.inputHash}:${props.trace.inputId}`} {...props} />;
}

function PlayerSession({ trace, source, predictionAt, predictionResults, onPrediction, onViewSolution }: ReferencePlayerProps) {
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(900);
  const [pending, setPending] = useState<ReferencePrediction | null>(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [answered, setAnswered] = useState<Set<string>>(() => new Set(predictionResults.map(p => p.checkpointId)));
  const snapshot = index < 0 ? trace.initialState : trace.snapshots[index]!;
  const array = snapshot.structures.find(s => s.kind === 'array');
  const list = snapshot.structures.find(s => s.kind === 'list');
  const next = () => {
    const nextIndex = index + 1;
    if (nextIndex >= trace.snapshots.length) { setPlaying(false); return; }
    const prediction = predictionAt(nextIndex);
    if (prediction && !answered.has(prediction.checkpointId)) {
      setPlaying(false); setPending(prediction); setAnswer(''); return;
    }
    setIndex(nextIndex); setFeedback('');
  };
  useEffect(() => {
    if (!playing || pending) return;
    const timer = setTimeout(next, speed);
    return () => clearTimeout(timer);
  });
  if (!array && !list) return <p role="alert">该演示需要数组或链表快照。</p>;
  if ((array?.values.length ?? list?.nodes.length ?? 0) > 30) return <p role="alert">演示最多显示 30 项；此输入超过演示上限，未截断播放。真实判题上限另见题面。</p>;
  const int = (name: string) => { const v = snapshot.variables.find(v => v.name === name)?.value; return v?.kind === 'int' ? v.value : undefined; };
  const left = int('left'); const right = int('right'); const mid = int('mid');
  const reset = () => { setPlaying(false); setIndex(-1); setPending(null); setFeedback(''); setAnswer(''); };
  const submitPrediction = () => {
    if (!pending || !answer.trim()) return;
    const value = typeof pending.answer === 'number' ? Number(answer) : answer.trim();
    if (typeof value === 'number' && (!Number.isInteger(value) || value < -2147483648 || value > 2147483647)) return;
    const correct = value === pending.answer;
    onPrediction({ checkpointId: pending.checkpointId, answer: typeof value === 'number' ? { kind: 'int', value } : { kind: 'text', value }, correct });
    setAnswered(new Set([...answered, pending.checkpointId]));
    setFeedback(`${correct ? '预测正确' : `预测不符，正确值为 ${pending.answer}`}。${pending.explanation} 这是教学预测，不是 Java 执行结果。`);
    setIndex(index + 1); setPending(null); setPlaying(false);
  };
  return <section className="reference-player" aria-label="参考状态播放器">
    <h3>{REFERENCE_LABEL}</h3>
    <p>预置参考算法生成的不可变状态。本站演示上限 30 项，未执行学生编辑的代码。</p>
    <div className="player-controls">
      <button type="button" onClick={() => { setPlaying(false); setPending(null); setIndex(Math.max(-1, index - 1)); setFeedback(''); }} disabled={index < 0}>上一步</button>
      <button type="button" onClick={next} disabled={!!pending || index >= trace.snapshots.length - 1}>下一步</button>
      <button type="button" onClick={() => setPlaying(true)} disabled={playing || !!pending || index >= trace.snapshots.length - 1}>播放</button>
      <button type="button" onClick={() => setPlaying(false)} disabled={!playing}>暂停</button>
      <button type="button" onClick={reset}>重置演示</button>
      <label>播放速度 <select aria-label="播放速度" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value={1600}>慢</option><option value={900}>正常</option><option value={350}>快</option></select></label>
    </div>
    <p data-testid="trace-position">{index < 0 ? '初始状态' : `步骤 ${index + 1} / ${trace.snapshots.length}`} · {snapshot.snapshotId}</p>
    {pending && <form onSubmit={e => { e.preventDefault(); submitPrediction(); }} className="prediction-check" data-testid="prediction-check">
      <strong>{pending.prompt}</strong><p>请先提交{typeof pending.answer === 'number' ? '整数' : '引用编号（h0、h1 或 null）'}预测，随后揭示下一快照；答错也会解释。</p>
      <label>预测值 <input aria-label="预测值" type={typeof pending.answer === 'number' ? 'number' : 'text'} step="1" required value={answer} onChange={e => setAnswer(e.target.value)} /></label>
      <button type="submit">提交预测并揭示</button>
    </form>}
    {feedback && <p role="status" data-testid="prediction-feedback">{feedback}</p>}
    <p data-testid="trace-explanation">{snapshot.explanation}</p>
    {array && <><p data-testid="search-interval">{left === undefined || right === undefined ? '搜索区间尚未初始化' : left > right ? `搜索区间为空：left=${left}，right=${right}` : `候选闭区间 [${left}, ${right}]`}</p>
    <div style={{ overflowX: 'auto' }}><svg role="img" aria-label="数组与搜索区间" width={Math.max(300, array.values.length * 68)} height="138" viewBox={`0 0 ${Math.max(300, array.values.length * 68)} 138`}>
      {array.values.map((value, i) => <g key={`${array.id}-${i}`} transform={`translate(${i * 68 + 4}, 20)`}>
        <rect width="60" height="48" rx="7" fill={left !== undefined && right !== undefined && i >= left && i <= right ? '#dcefe6' : '#edf0f3'} stroke={i === mid ? '#a54117' : '#7b8790'} strokeWidth={i === mid ? 3 : 1} />
        <text x="30" y="30" textAnchor="middle" fill="#172b32" fontSize="15">{value}</text>
        <text x="30" y="67" textAnchor="middle" fill="#354c55" fontSize="12">下标 {i}</text>
        <text x="30" y="88" textAnchor="middle" fill="#762e13" fontSize="11">{array.indices.filter(p => p.index === i).map(p => p.name).join('/')}</text>
      </g>)}
    </svg></div>
    <p>{array.indices.filter(p => p.index < 0 || p.index >= array.values.length).map(p => `${p.name}=${p.index}（边界哨兵，不是数组元素）`).join('；')}</p></>}
    {list && <ListDiagram list={list} />}
    <table aria-label="参考变量表"><thead><tr><th>变量</th><th>当前值</th></tr></thead><tbody>{snapshot.variables.map(v => <tr key={v.name}><td>{v.name}</td><td>{v.value.kind === 'reference' ? v.value.objectId === null ? 'null（未引用对象）' : `对象 ${v.value.objectId}` : String(v.value.value)}</td></tr>)}</tbody></table>
    <details onToggle={e => { if (e.currentTarget.open) onViewSolution(); }}>
      <summary>查看参考 Java 代码（记录答案使用）</summary>
      <pre aria-label="参考代码步骤高亮">{source.split('\n').map((line, i) => <span key={i} data-active={'codeRange' in snapshot && i + 1 >= snapshot.codeRange.startLine && i + 1 <= snapshot.codeRange.endLine ? 'true' : 'false'} style={{ display: 'block', background: 'codeRange' in snapshot && i + 1 >= snapshot.codeRange.startLine && i + 1 <= snapshot.codeRange.endLine ? '#ffe4ac' : undefined, color: '#172b32' }}>{String(i + 1).padStart(2)}  {line || ' '}</span>)}</pre>
    </details>
  </section>;
}
