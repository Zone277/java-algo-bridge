import { useEffect, useState } from 'react';
import { REFERENCE_LABEL, type Answer, type Progress, type ReferencePrediction, type ReferenceTrace } from '@jab/contracts';
import { formatValue, structureItemCount, StructureRenderer } from './StructureRenderer.js';

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
  const oversized = [trace.initialState, ...trace.snapshots].flatMap(state => state.structures).find(structure => structureItemCount(structure) > 30);
  if (oversized) return <p role="alert">演示最多显示 30 项；结构 {oversized.id} 超过演示上限，未截断播放。真实判题上限另见题面。</p>;
  const reset = () => { setPlaying(false); setIndex(-1); setPending(null); setFeedback(''); setAnswer(''); };
  const expectedLabel = (prediction: ReferencePrediction) => {
    const expected = prediction.answer;
    if (expected.kind === 'choice') return prediction.options?.find(option => option.id === expected.optionId)?.label ?? expected.optionId;
    return expected.kind === 'int' ? String(expected.value) : expected.value;
  };
  const answersEqual = (submitted: Answer, expected: Answer) => {
    if (submitted.kind !== expected.kind) return false;
    if (submitted.kind === 'int') return expected.kind === 'int' && submitted.value === expected.value;
    if (submitted.kind === 'choice') return expected.kind === 'choice' && submitted.optionId === expected.optionId;
    return expected.kind === 'text' && submitted.value === expected.value;
  };
  const submitPrediction = () => {
    if (!pending) return;
    let submitted: Answer;
    if (pending.answer.kind === 'int') {
      const value = Number(answer.trim());
      if (!answer.trim() || !Number.isInteger(value) || value < -2147483648 || value > 2147483647) return;
      submitted = { kind: 'int', value };
    } else if (pending.answer.kind === 'choice') {
      if (!answer) return;
      submitted = { kind: 'choice', optionId: answer };
    } else {
      const preserveWhitespace = pending.answer.value.trim() !== pending.answer.value;
      const value = preserveWhitespace ? answer : answer.trim();
      if (!value && pending.answer.value !== '') return;
      submitted = { kind: 'text', value };
    }
    const correct = answersEqual(submitted, pending.answer);
    onPrediction({ checkpointId: pending.checkpointId, answer: submitted, correct });
    setAnswered(previous => new Set([...previous, pending.checkpointId]));
    setFeedback(`${correct ? '预测正确' : `预测不符，正确值为 ${expectedLabel(pending)}`}。${pending.explanation} 这是教学预测，不是 Java 执行结果。`);
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
      <strong>{pending.prompt}</strong><p>请先提交{pending.answer.kind === 'int' ? '整数' : pending.answer.kind === 'choice' ? '一个选项' : '文本'}预测，随后揭示下一快照；答错也会解释。</p>
      <label>预测值 {pending.answer.kind === 'choice' ? <select aria-label="预测值" required value={answer} onChange={e => setAnswer(e.target.value)}><option value="">请选择</option>{pending.options?.map(option => <option value={option.id} key={option.id}>{option.label}</option>)}</select> : <input aria-label="预测值" type={pending.answer.kind === 'int' ? 'number' : 'text'} step={pending.answer.kind === 'int' ? '1' : undefined} required={pending.answer.kind === 'int' || pending.answer.value !== ''} value={answer} onChange={e => setAnswer(e.target.value)} />}</label>
      {pending.answer.kind === 'choice' && !pending.options?.length && <p role="alert">该预测缺少可选项，无法提交。</p>}
      <button type="submit">提交预测并揭示</button>
    </form>}
    {feedback && <p role="status" data-testid="prediction-feedback">{feedback}</p>}
    <p data-testid="trace-explanation">{snapshot.explanation}</p>
    {!snapshot.structures.length && <p>当前步骤没有结构状态。</p>}
    {snapshot.structures.map((structure, structureIndex) => <StructureRenderer key={structure.id} structure={structure} snapshot={snapshot} showBinaryRange={trace.problemId === '704' && structureIndex === 0 && structure.kind === 'array'} />)}
    <table aria-label="参考变量表"><thead><tr><th>变量</th><th>当前值</th></tr></thead><tbody>{snapshot.variables.map(v => <tr key={v.name}><td>{v.name}</td><td>{formatValue(v.value)}</td></tr>)}</tbody></table>
    <details onToggle={e => { if (e.currentTarget.open) onViewSolution(); }}>
      <summary>查看参考 Java 代码（记录答案使用）</summary>
      <pre aria-label="参考代码步骤高亮">{source.split('\n').map((line, i) => <span key={i} data-active={'codeRange' in snapshot && i + 1 >= snapshot.codeRange.startLine && i + 1 <= snapshot.codeRange.endLine ? 'true' : 'false'} style={{ display: 'block', background: 'codeRange' in snapshot && i + 1 >= snapshot.codeRange.startLine && i + 1 <= snapshot.codeRange.endLine ? '#ffe4ac' : undefined, color: '#172b32' }}>{String(i + 1).padStart(2)}  {line || ' '}</span>)}</pre>
    </details>
  </section>;
}
