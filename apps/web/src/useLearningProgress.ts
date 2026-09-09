import { useEffect, useRef, useState } from 'react';
import { ProgressSchema, type Progress } from '@jab/contracts';
import { hashSource, progressKey, type LearningMode } from './progress.js';

export function useLearningProgress(initial: Progress, storageAllowed: boolean) {
  const [progress, setProgress] = useState(initial);
  const progressRef = useRef(initial);
  const [drafts, setDrafts] = useState({ guided: initial.drafts.guided.source, independent: initial.drafts.independent.source });
  const draftsRef = useRef(drafts);
  const [storageNote, setStorageNote] = useState(storageAllowed ? '草稿与学习记录保存在本机。' : '旧数据已保留；本次使用内存，刷新不会保存修改。');
  const storageEnabled = useRef(storageAllowed);
  const revision = useRef(0);
  function changeProgress(update: (old: Progress) => Progress) {
    const next = update(progressRef.current);
    progressRef.current = next;
    setProgress(next);
  }
  function changeSource(mode: LearningMode, source: string) {
    draftsRef.current = { ...draftsRef.current, [mode]: source };
    setDrafts(draftsRef.current);
  }
  useEffect(() => {
    const token = ++revision.current;
    const snapshot = drafts;
    Promise.all([hashSource(snapshot.guided), hashSource(snapshot.independent)]).then(([guidedHash, independentHash]) => {
      if (token !== revision.current || draftsRef.current.guided !== snapshot.guided || draftsRef.current.independent !== snapshot.independent) return;
      const now = new Date().toISOString();
      changeProgress(old => ({ ...old, drafts: { guided: { source: snapshot.guided, sourceHash: guidedHash, updatedAt: old.drafts.guided.source === snapshot.guided ? old.drafts.guided.updatedAt : now }, independent: { source: snapshot.independent, sourceHash: independentHash, updatedAt: old.drafts.independent.source === snapshot.independent ? old.drafts.independent.updatedAt : now } }, updatedAt: now }));
    }).catch(() => { storageEnabled.current = false; setStorageNote('源码指纹计算失败，本次使用内存草稿。'); });
    return () => { revision.current++; };
  }, [drafts]);
  useEffect(() => {
    if (!storageEnabled.current || progress.drafts.guided.source !== draftsRef.current.guided || progress.drafts.independent.source !== draftsRef.current.independent) return;
    try { localStorage.setItem(progressKey(progress.problemId, progress.lessonVersion), JSON.stringify(ProgressSchema.parse(progress))); }
    catch { storageEnabled.current = false; setStorageNote('本机存储不可用，本次修改仅保存在内存中。'); }
  }, [progress]);
  async function flush(): Promise<Progress> {
    // Typing remains possible while digest runs. Only commit hashes of the latest pair.
    for (;;) {
      const current = draftsRef.current;
      const [guidedHash, independentHash] = await Promise.all([hashSource(current.guided), hashSource(current.independent)]);
      if (current.guided !== draftsRef.current.guided || current.independent !== draftsRef.current.independent) continue;
      const now = new Date().toISOString();
      const next = { ...progressRef.current, drafts: { guided: { source: current.guided, sourceHash: guidedHash, updatedAt: now }, independent: { source: current.independent, sourceHash: independentHash, updatedAt: now } }, updatedAt: now };
      changeProgress(() => next);
      if (storageEnabled.current) {
        try { localStorage.setItem(progressKey(next.problemId, next.lessonVersion), JSON.stringify(ProgressSchema.parse(next))); }
        catch { storageEnabled.current = false; setStorageNote('本机存储不可用，本次修改仅保存在内存中。'); }
      }
      return next;
    }
  }
  return { progress, progressRef, drafts, draftsRef, changeSource, changeProgress, storageNote, flush };
}
