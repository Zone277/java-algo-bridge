import { useState } from 'react';
import { BridgeProgressSchema, type BridgeUnit } from '@jab/contracts';
import { bridgeUnits } from '@jab/curriculum/bridge';

const KEY = 'java-algo-bridge:v1:bridge:bridge-v1';
type BridgeProgress = ReturnType<typeof BridgeProgressSchema.parse>;
type BridgeState = { progress: BridgeProgress; allowed: boolean; note: string };
// Shared by every unit for this page session; a storage failure must survive remounts.
let sessionState: BridgeState | null = null;
function restoreBridge(): BridgeState {
  if (sessionState && !sessionState.allowed) return sessionState;
  try {
    const raw = localStorage.getItem(KEY);
    sessionState = { progress: raw ? BridgeProgressSchema.parse(JSON.parse(raw)) : { schemaVersion: 1, version: 'bridge-v1', results: [] }, allowed: true, note: raw ? '已恢复微课学习记录。' : '' };
  } catch {
    sessionState = { progress: sessionState?.progress ?? { schemaVersion: 1, version: 'bridge-v1', results: [] }, allowed: false, note: '微课存储不可用或损坏，旧数据保留；当前仅在内存练习。' };
  }
  return sessionState;
}
export default function BridgePanel({ unit, back }: { unit: BridgeUnit; back: () => void }) {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [state, setState] = useState<BridgeState>(restoreBridge);
  function submit() {
    if (!/^-?\d+$/.test(answer.trim()) || !Number.isSafeInteger(Number(answer))) { setFeedback('请先填写整数预测。'); return; }
    const correct = unit.prediction.answer.kind === 'int' && Number(answer) === unit.prediction.answer.value;
    const old = state.progress.results.find(r => r.unitId === unit.id);
    const progress: BridgeProgress = { ...state.progress, results: [...state.progress.results.filter(r => r.unitId !== unit.id), { unitId: unit.id, answer: { kind: 'int', value: Number(answer) }, correct, attempts: (old?.attempts ?? 0) + 1, lastAttemptAt: new Date().toISOString() }] };
    let { allowed, note } = state;
    if (allowed) try { localStorage.setItem(KEY, JSON.stringify(BridgeProgressSchema.parse(progress))); } catch { allowed = false; note = '存储不可用，当前修改仅保存在内存。'; }
    sessionState = { progress, allowed, note };
    setState(sessionState);
    setFeedback(`${correct ? '预测正确' : '预测不符'}：${unit.prediction.explanation} 这是静态教学检查，未执行 Java，不产生题目通过记录。`);
  }
  return <section className="learning-panel panel" data-testid="bridge-panel"><button data-testid="bridge-return" onClick={back}>← 返回来源课程</button><h2>{unit.id} · {unit.title}</h2><p>{unit.objectives.join(' ')}</p><h3>从 C 已知知识出发</h3><p>{unit.cComparison}</p><pre>{unit.javaSource}</pre><p className="lesson-body">{unit.explanation}</p><h3>先预测，再核对</h3><p>{unit.prediction.prompt}</p><input data-testid="bridge-answer" aria-label="微课预测" value={answer} onChange={e => setAnswer(e.target.value)} inputMode="numeric" /><button data-testid="bridge-check" onClick={submit}>提交静态预测</button><p role="status" data-testid="bridge-feedback">{feedback}</p><p>{state.note}</p><p>微课记录：{state.progress.results.length} / {bridgeUnits.length} 单元有作答。这不是 Java 执行成绩。</p></section>;
}
