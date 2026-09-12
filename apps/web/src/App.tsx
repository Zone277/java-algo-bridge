import { useEffect, useRef, useState } from 'react';
import { ApiErrorSchema, HealthSchema, LIST_NODE_SOURCE, PROBLEM_META, PROBLEM_ORDER, ProblemIdSchema, REFERENCE_LABEL, RunRequestSchema, RunResultSchema, SessionSchema, ProgressSchema, TREE_NODE_SOURCE, type Output, type ProblemId, type Progress, type RunResult, type RunStatus } from '@jab/contracts';
import JavaEditor from './JavaEditor.js';
import { lessonRuntimes, type LessonRuntime } from './registry.js';
import { bridgeUnits } from '@jab/curriculum/bridge';
import BridgePanel from './BridgePanel.js';
import type { BridgeUnit } from '@jab/contracts';
import LearningPanels, { sections, type Section } from './LearningPanels.js';
import { applyPassResult, createProgress, hashSource, LEGACY_DRAFT_KEY, progressKey, type LearningMode } from './progress.js';
import { useLearningProgress } from './useLearningProgress.js';

const titles: Record<RunStatus, string> = {
  PASSED_LOCAL_TESTS: '通过本站测试', WRONG_ANSWER: '答案不正确', COMPILE_ERROR: '编译错误',
  RUNTIME_ERROR: '运行异常', TIME_LIMIT: '超过时间限制', RESOURCE_LIMIT: '超过资源限制',
  OUTPUT_LIMIT: '超过输出限制', RUNNER_UNAVAILABLE: 'Java 执行器不可用', INVALID_INPUT: '输入无效',
  SYSTEM_ERROR: '本地服务错误', CANCELLED: '请求已取消',
};
const mobilePanels = [
  { id: 'problem', title: '题面' },
  { id: 'editor', title: '编辑' },
  { id: 'result', title: '结果' },
] as const;
type MobilePanel = typeof mobilePanels[number]['id'];

function focusWorkbench() {
  requestAnimationFrame(() => {
    const workbench = document.getElementById('workbench');
    workbench?.scrollIntoView({ block: 'start' });
    workbench?.focus({ preventScroll: true });
  });
}

function resultTitle(result: RunResult): string {
  if (result.status === 'PASSED_LOCAL_TESTS' && result.mode === 'run') return '本次输入通过';
  return titles[result.status];
}

function executionErrorMessage(cause: unknown): string {
  if (cause instanceof TypeError && /fetch|network/i.test(cause.message)) return '无法连接本地 API。请检查启动终端，确认页面通过本机回环地址打开，然后重试。';
  return cause instanceof Error ? cause.message : '请求失败，请检查本地 API。';
}

function useNarrowScreen(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 650px)');
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return narrow;
}
const orderedLessonRuntimes = PROBLEM_ORDER.flatMap(problemId => {
  const runtime = lessonRuntimes.find(candidate => candidate.lesson.id === problemId);
  return runtime ? [runtime] : [];
});

function initialProblemId(): ProblemId {
  try {
    const parsed = ProblemIdSchema.safeParse(localStorage.getItem('java-algo-bridge:v1:active-lesson'));
    if (parsed.success && orderedLessonRuntimes.some(runtime => runtime.lesson.id === parsed.data)) return parsed.data;
  } catch { /* Falling back keeps course selection available without storage. */ }
  return orderedLessonRuntimes[0]?.lesson.id ?? '704';
}

function formatOutput(output: Output | null): string {
  if (output === null) return '（无结构化返回）';
  if (output.kind === 'int' || output.kind === 'boolean') return String(output.value);
  if (output.kind === 'int-array') return `[${output.values.join(', ')}]`;
  const nodes = output.nodes.map(node => `${node.id}(${node.value})→${node.nextId ?? 'null'}`).join('；');
  return `head=${output.headId ?? 'null'}${nodes ? `；${nodes}` : ''}`;
}

const providedTypes: Partial<Record<ProblemId, { testId: string; title: string; source: string; note: string }>> = {
  '206': { testId: 'listnode-definition', title: 'ListNode', source: LIST_NODE_SOURCE, note: '平台提供此类，请勿重复声明。对象编号是教学身份，不是物理地址；移动变量绑定不代表删除或回收对象。' },
  '21': { testId: 'listnode-definition', title: 'ListNode', source: LIST_NODE_SOURCE, note: '平台提供此类，请勿重复声明。合并结果需要复用输入节点；哑节点不能成为返回链的一部分。' },
  '104': { testId: 'treenode-definition', title: 'TreeNode', source: TREE_NODE_SOURCE, note: '平台根据层序输入构造树并提供此类，请勿重复声明。树节点对象与递归调用栈帧是两类身份。' },
};

type Loaded = { progress: Progress; storageAllowed: boolean; legacy: string | null; note: string };
export default function App() {
  const [selected, setSelected] = useState<ProblemId>(initialProblemId);
  const cached = useRef(new Map<ProblemId, Loaded>());
  const runtime = orderedLessonRuntimes.find(candidate => candidate.lesson.id === selected) ?? orderedLessonRuntimes[0];
  if (!runtime) return <p role="alert">没有可用课程。请检查本地课程注册入口。</p>;
  return <LessonApp key={selected} runtime={runtime} cached={cached.current.get(selected)} onSelect={(id, state) => { cached.current.set(selected, state); try { localStorage.setItem('java-algo-bridge:v1:active-lesson', id); } catch { /* Session switching remains available. */ } setSelected(id); focusWorkbench(); }} />;
}
function LessonApp({ runtime, cached, onSelect }: { runtime: LessonRuntime; cached?: Loaded; onSelect: (id: ProblemId, state: Loaded) => void }) {
  const lesson = runtime.lesson;
  const LESSON_VERSION = lesson.lessonVersion;
  const PROGRESS_KEY = progressKey(lesson.id, LESSON_VERSION);
  const [loaded, setLoaded] = useState<{ progress: Progress; storageAllowed: boolean; legacy: string | null; note: string } | null>(null);
  const [loadError, setLoadError] = useState('');
  useEffect(() => {
    let active = true;
    async function load() {
      if (cached) { setLoaded(cached); return; }
      let progress = await createProgress(lesson.guided.stages[0]!.scaffoldSource, undefined, lesson);
      let storageAllowed = true;
      let legacy: string | null = null;
      let note = '';
      try {
        const raw = localStorage.getItem(PROGRESS_KEY);
        if (raw) {
          const parsed = ProgressSchema.parse(JSON.parse(raw));
          if (parsed.problemId !== lesson.id || parsed.lessonVersion !== LESSON_VERSION || parsed.drafts.guided.sourceHash !== await hashSource(parsed.drafts.guided.source) || parsed.drafts.independent.sourceHash !== await hashSource(parsed.drafts.independent.source)) throw new Error('草稿版本或指纹不匹配');
          progress = parsed;
          note = '已恢复本机学习记录与两种模式草稿。';
        } else {
          const legacyRaw = lesson.id === '704' ? localStorage.getItem(LEGACY_DRAFT_KEY) : null;
          if (legacyRaw) {
            const old: unknown = JSON.parse(legacyRaw);
            if (typeof old === 'object' && old !== null && 'source' in old && typeof old.source === 'string') legacy = old.source;
          }
          if (Object.keys(localStorage).some(key => key.startsWith(`java-algo-bridge:v1:progress:${lesson.id}:`) && key !== PROGRESS_KEY)) note = '发现其他课程版本记录，已保留；当前版本从新骨架开始。';
        }
      } catch { storageAllowed = false; note = '存储不可用或记录损坏/版本不匹配。原数据已保留，本次在内存中练习。'; }
      if (active) setLoaded({ progress, storageAllowed, legacy, note });
    }
    void load().catch(() => { if (active) setLoadError('无法初始化源码指纹，请通过本机回环地址打开。'); });
    return () => { active = false; };
  }, []);
  return loaded ? <Workbench initial={loaded} runtime={runtime} onSelect={onSelect} /> : <p role="status">{loadError || '正在恢复课程与本机草稿…'}</p>;
}
function Workbench({ initial, runtime, onSelect }: { initial: Loaded; runtime: LessonRuntime; onSelect: (id: ProblemId, state: Loaded) => void }) {
  const lesson = runtime.lesson;
  const LESSON_VERSION = lesson.lessonVersion;
  const TEST_SUITE_VERSION = lesson.testSuite.version;
  const STARTER_SOURCE = lesson.independent.initialSource;
  const [bridge, setBridge] = useState<BridgeUnit | null>(null);
  const [switching, setSwitching] = useState(false);
  const { progress, drafts, draftsRef, changeSource, changeProgress, storageNote, flush } = useLearningProgress(initial.progress, initial.storageAllowed);
  const [section, setSection] = useState<Section>('route');
  const [learningMode, setLearningMode] = useState<LearningMode>('independent');
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('editor');
  const narrowScreen = useNarrowScreen();
  const learningModeRef = useRef(learningMode);
  const source = drafts[learningMode];
  const setSource = (value: string) => changeSource(learningMode, value);
  const [legacy, setLegacy] = useState(initial.legacy);
  function navigate(next: Section) {
    if (next === 'guided' || next === 'independent') { learningModeRef.current = next; setLearningMode(next); setMobilePanel('editor'); }
    setResetRequested(false);
    setSection(next);
    if (next !== 'route') changeProgress(p => p.startedAt ? p : { ...p, startedAt: new Date().toISOString() });
  }
  const [input, setInput] = useState(JSON.stringify(runtime.defaultInput));
  const [health, setHealth] = useState('正在检查本地执行器…');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RunResult | null>(null);
  const [currentHash, setCurrentHash] = useState<string | null>(null);
  const [resultSource, setResultSource] = useState<string | null>(null);
  const [resultInput, setResultInput] = useState<string | null>(null);
  const [resultLearningMode, setResultLearningMode] = useState<LearningMode | null>(null);
  const [resetRequested, setResetRequested] = useState(false);
  const stale = result !== null && (resultSource !== source || currentHash !== result.sourceHash || resultLearningMode !== learningMode);
  const inputChanged = result?.mode === 'run' && resultInput !== input;

  useEffect(() => {
    let active = true;
    fetch('/api/health').then(async response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = HealthSchema.parse(await response.json());
      if (active) setHealth(data.runner.available ? 'Java 21 · Docker 执行器就绪' : `执行器不可用：${data.runner.reason ?? '未知原因'}。不会在宿主机执行 Java。`);
    }).catch(() => { if (active) setHealth('无法连接本地 API。请检查启动终端；尚未执行 Java。'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setCurrentHash(null);
    hashSource(source).then(hash => { if (active) setCurrentHash(hash); }).catch(() => { if (active) setError('无法计算源码 SHA-256，请使用本机回环地址打开页面。'); });
    return () => { active = false; };
  }, [source]);

  async function execute(mode: 'run' | 'submit') {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    setResult(null);
    setResultSource(null);
    setResultInput(null);
    setResultLearningMode(null);
    if (narrowScreen) setMobilePanel('result');
    const submittedSource = source;
    const submittedInput = input;
    const submittedMode = learningMode;
    try {
      let parsedInput: unknown;
      if (mode === 'run') {
        try { parsedInput = JSON.parse(input); } catch { throw new Error(`输入不是有效 JSON。请按“${lesson.siteLimits.inputSchemaId}”格式填写；${lesson.siteLimits.description}`); }
      }
      const request = RunRequestSchema.safeParse({ problemId: lesson.id, lessonVersion: LESSON_VERSION, source: submittedSource, mode, ...(mode === 'run' ? { input: parsedInput } : {}) });
      if (!request.success) throw new Error(request.error.issues.map(issue => issue.message).join('；'));
      const submittedHash = await hashSource(submittedSource);
      const sessionResponse = await fetch('/api/session', { cache: 'no-store' });
      if (!sessionResponse.ok) throw new Error(`无法获取本机会话（HTTP ${sessionResponse.status}）。`);
      const session = SessionSchema.parse(await sessionResponse.json());
      const response = await fetch('/api/runs', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Java-Algo-Session': session.token },
        body: JSON.stringify(request.data),
      });
      const body: unknown = await response.json();
      const execution = RunResultSchema.safeParse(body);
      if (execution.success) {
        if (execution.data.sourceHash !== submittedHash || execution.data.problemId !== lesson.id || execution.data.lessonVersion !== LESSON_VERSION || execution.data.mode !== mode) throw new Error('服务响应与本次提交不匹配，结果未采用。');
        if (mode === 'submit' && execution.data.testSuiteVersion !== TEST_SUITE_VERSION && execution.data.status !== 'RUNNER_UNAVAILABLE') {
          setResult(null);
          throw new Error('本地 API 的测试集版本与当前课程不匹配，结果未采用。请重新启动匹配当前项目版本的 API，再重新提交本站测试。');
        }
        setResult(execution.data);
        setResultSource(submittedSource);
        setResultInput(submittedInput);
        setResultLearningMode(submittedMode);
        if (draftsRef.current[submittedMode] === submittedSource && learningModeRef.current === submittedMode) {
          changeProgress(p => applyPassResult(p, execution.data, { submittedMode, currentMode: learningModeRef.current, currentSourceHash: p.drafts[submittedMode].sourceHash, submittedSourceHash: submittedHash, testSuiteVersion: TEST_SUITE_VERSION }));
        }
        if (execution.data.status === 'RUNNER_UNAVAILABLE') setHealth(`执行器不可用：${execution.data.reason ?? '未知原因'}。不会在宿主机执行 Java。`);
        else if (execution.data.phase !== 'infrastructure') setHealth('Java 21 · Docker 执行器就绪');
      } else {
        const apiError = ApiErrorSchema.safeParse(body);
        throw new Error(apiError.success ? `${apiError.data.message}（${apiError.data.reason}，HTTP ${response.status}）` : `本地 API 响应格式无效（HTTP ${response.status}）。`);
      }
    } catch (cause) {
      const message = executionErrorMessage(cause);
      setError(message);
      if (message.startsWith('无法连接本地 API')) setHealth('无法连接本地 API。请检查启动终端；尚未执行 Java。');
    }
    finally { busyRef.current = false; setBusy(false); }
  }

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#workbench"><span className="brand-mark">J</span><span>Java Algo Bridge<small>从理解，到亲手写出来</small></span></a><span className="local-badge">本机学习 · 十题课程</span></header>
    <div className="workspace">
      <aside className="route-panel"><p className="eyebrow">LEARNING PATH</p><h2>算法入门路线</h2><p className="muted">理解、预测、编写、验证。</p><div className="lesson-list">{orderedLessonRuntimes.map(r => <button className="lesson-active" aria-current={r.lesson.id === lesson.id ? 'page' : undefined} key={r.lesson.id} data-testid={r.lesson.id === lesson.id ? 'current-lesson' : 'lesson-' + r.lesson.id} disabled={busy || switching} onClick={() => { if (r.lesson.id === lesson.id) { setBridge(null); navigate('route'); focusWorkbench(); return; } setSwitching(true); void flush().then(p => onSelect(r.lesson.id, { ...initial, progress: p, legacy, note: '已恢复本次会话的草稿。' })).catch(() => { setError('无法保存当前草稿，尚未切换课程。'); setSwitching(false); }); }}><strong><span>{String(r.lesson.order).padStart(2, '0')}</span> · {r.lesson.id} · {r.lesson.title}<small>完整学习闭环 · 已开放</small></strong></button>)}</div><div className="route-note"><strong>一步一步来</strong><p>必要语法 → 理解问题 → 预测状态 → 参考演示 → 引导编写 → 独立编写 → 真实执行反馈</p><p>预测检查与参考演示不会产生真实执行通过记录。</p></div></aside>
      <main id="workbench" tabIndex={-1}>
        <section className="lesson-heading"><div><p className="eyebrow">{String(lesson.order).padStart(2, '0')} / 10 · JAVA 与算法的桥</p><h1>{lesson.id} · {lesson.title}</h1><p>{lesson.objectives[0]}</p></div><span className="language-chip">Java 21</span></section>
        <div className="runner-banner" data-testid="runner-status" role="status">{health}</div>
                <p className="muted small">{initial.note} {storageNote}</p>
        {legacy !== null && <div className="reset-confirm"><span>发现阶段 01 独立草稿。明确导入会替换当前独立草稿，旧记录保留。</span><button data-testid="import-legacy-draft" onClick={() => { changeSource('independent', legacy); setLegacy(null); }}>导入旧独立草稿</button><button onClick={() => setLegacy(null)}>暂不导入</button></div>}
        <nav className="learning-nav" aria-label="学习步骤">{sections.map(s => <button key={s.id} data-testid={`nav-${s.id}`} aria-current={section === s.id ? 'step' : undefined} onClick={() => { setBridge(null); navigate(s.id); }}>{s.title}</button>)}</nav>
        <div className="panel"><p>按需补知识（可直接返回本题）：</p>{bridgeUnits.map(u => <button key={u.id} data-testid={'bridge-' + u.id} onClick={() => setBridge(u)}>{u.id}{lesson.prerequisites.includes(u.id) ? ' · 本题前置' : ''}</button>)}</div>
        {bridge ? <BridgePanel key={bridge.id} unit={bridge} back={() => setBridge(null)} /> : <LearningPanels runtime={runtime} section={section} progress={progress} update={changeProgress} navigate={navigate} loadScaffold={value => changeSource('guided', value)} />}
        {!bridge && (section === 'guided' || section === 'independent') && <><div className="mobile-workbench-tabs" role="tablist" aria-label="窄屏工作台视图">{mobilePanels.map((panel, panelIndex) => <button type="button" role="tab" id={`mobile-tab-${panel.id}`} aria-controls={`mobile-panel-${panel.id}`} aria-selected={mobilePanel === panel.id} tabIndex={mobilePanel === panel.id ? 0 : -1} key={panel.id} onClick={() => setMobilePanel(panel.id)} onKeyDown={event => { const last = mobilePanels.length - 1; let next: number; if (event.key === 'ArrowRight') next = panelIndex === last ? 0 : panelIndex + 1; else if (event.key === 'ArrowLeft') next = panelIndex === 0 ? last : panelIndex - 1; else if (event.key === 'Home') next = 0; else if (event.key === 'End') next = last; else return; event.preventDefault(); const nextPanel = mobilePanels[next]!; setMobilePanel(nextPanel.id); requestAnimationFrame(() => document.getElementById(`mobile-tab-${nextPanel.id}`)?.focus()); }}>{panel.title}</button>)}</div><div className="workbench-grid">
          <section id="mobile-panel-problem" role={narrowScreen ? 'tabpanel' : undefined} aria-labelledby={narrowScreen ? 'mobile-tab-problem' : undefined} tabIndex={narrowScreen ? 0 : undefined} data-mobile-hidden={narrowScreen && mobilePanel !== 'problem'} className="problem-panel panel"><div className="panel-heading"><h2>理解任务</h2><span>{lesson.id}</span></div><code className="signature" data-testid="method-signature">{PROBLEM_META[lesson.id].methodSignature}</code><p>{lesson.taskSemantics}</p><p className="muted">{lesson.siteLimits.description}</p><a href={lesson.source.url} target="_blank" rel="noreferrer">原题来源：LeetCode {lesson.id} ↗</a><p className="muted small">本站题面自行编写，与原平台无合作关系。</p>{providedTypes[lesson.id] && <details data-testid={providedTypes[lesson.id]!.testId}><summary>查看平台 {providedTypes[lesson.id]!.title} 定义</summary><pre>{providedTypes[lesson.id]!.source}</pre><p>{providedTypes[lesson.id]!.note}</p></details>}<div className="reference-notice"><strong>{REFERENCE_LABEL}</strong><p>参考模型位于“预测与演示”步骤，与此处学生 Java 真实执行分开。</p></div></section>
          <section id="mobile-panel-editor" role={narrowScreen ? 'tabpanel' : undefined} aria-labelledby={narrowScreen ? 'mobile-tab-editor' : undefined} tabIndex={narrowScreen ? 0 : undefined} data-mobile-hidden={narrowScreen && mobilePanel !== 'editor'} className="editor-panel panel"><div className="panel-heading"><h2>{learningMode === 'guided' ? '引导编写' : '独立编写'}</h2><span>Solution.java</span></div><JavaEditor source={source} onChange={setSource} diagnostics={stale ? [] : result?.diagnostics ?? []} /><div className="editor-footer"><span className="muted small">{storageNote}</span><button className="text-button" onClick={() => setResetRequested(true)}>恢复骨架</button></div>{resetRequested && <div className="reset-confirm" role="alert"><span>恢复将替换当前草稿，是否继续？</span><button onClick={() => { setSource(learningMode === 'guided' ? lesson.guided.stages[0]!.scaffoldSource : STARTER_SOURCE); setResetRequested(false); }}>确认恢复</button><button onClick={() => setResetRequested(false)}>保留草稿</button></div>}<div className="input-area"><label htmlFor="input-json">运行输入 <span>JSON · {lesson.siteLimits.inputSchemaId}</span></label><p className="muted small" data-testid="input-description">{lesson.siteLimits.description}</p><textarea id="input-json" data-testid="input-json" value={input} onChange={e => setInput(e.target.value)} spellCheck={false} rows={3} /><div className="actions"><span className="muted small">运行检查此输入；提交检查本站用例集。</span><button data-testid="run-button" disabled={busy} onClick={() => void execute('run')}>运行输入</button><button className="primary" data-testid="submit-button" disabled={busy} onClick={() => void execute('submit')}>提交本站测试</button></div></div></section>
        </div>
        <section id="mobile-panel-result" role={narrowScreen ? 'tabpanel' : undefined} aria-labelledby={narrowScreen ? 'mobile-tab-result' : undefined} tabIndex={narrowScreen ? 0 : undefined} data-mobile-hidden={narrowScreen && mobilePanel !== 'result'} className="result-panel panel" aria-live="polite"><div className="panel-heading"><h2>真实执行反馈</h2><span>学生 Java · Docker / javac / java</span></div>{busy && <p role="status" className="busy">正在请求本地执行器，请等待编译与执行…</p>}{error && <p role="alert" className="error-message">{error}</p>}{!result && !busy && !error && <p className="empty-state">还没有执行结果。完成方法后运行一个输入，或提交本站测试。</p>}{result && <div data-testid="run-result" className={stale || inputChanged ? 'result-content stale' : 'result-content'}><div className="result-title"><h3>{resultTitle(result)}</h3><code>{result.status}</code></div>{stale && <p data-testid="source-stale" className="stale-notice">源码已变化：以下为旧源码结果，不代表当前代码通过。</p>}{inputChanged && <p className="stale-notice">输入已变化：以下结果属于上次提交的输入。</p>}{result.reason && <p>{result.reason}</p>}{result.status === 'RUNNER_UNAVAILABLE' && <p>尚未编译或执行学生 Java。请准备 Docker 与固定 JDK 镜像后重试；当前结果不是算法判定。</p>}{result.diagnostics.map((d, i) => <pre className="diagnostic" key={i}>{d.fileName}{d.line !== null ? `:${d.line}${d.column !== null ? `:${d.column}` : ''}` : ''} · {d.severity}{'\n'}{d.message}</pre>)}{result.cases.length > 0 && <div className="case-scroll"><table><thead><tr><th>用例</th><th>状态</th><th>实际结果</th><th>{lesson.id === '1' || lesson.id === '21' ? '合法结果示例' : '期望结果'}</th><th>说明</th></tr></thead><tbody>{result.cases.map(c => <tr key={c.caseId}><td>{c.caseId}</td><td>{c.status}</td><td><code>{formatOutput(c.actual)}</code></td><td><code>{formatOutput(c.expected)}</code></td><td>{c.message}</td></tr>)}</tbody></table></div>}{result.output.truncated && <p className="error-message">输出已达到限制并截断，不能据此判断通过。</p>}<details><summary>标准输出与标准错误（真实输出，不用于自报通过）</summary><h4>stdout</h4><pre>{result.stdout || '（空）'}</pre><h4>stderr</h4><pre>{result.stderr || '（空）'}</pre></details><p className="muted small">阶段：{result.phase} · 总耗时：{Math.round(result.timings.totalMs)} ms · 清理：{result.cleanup.status}{result.cleanup.message ? ` / ${result.cleanup.message}` : ''}</p><details className="result-metadata"><summary>本次请求与源码标识</summary><p>requestId：{result.requestId}</p><p>sourceHash：<code>{result.sourceHash}</code></p><p>以上耗时仅为本次观测，不证明算法复杂度；通过不等于通过 LeetCode 官方评测。</p></details></div>}</section>
        </>}
      </main>
    </div><footer className="page-footer">本机学习工具 · 不适用于公网多租户执行 · 草稿仅保存在当前浏览器</footer>
  </div>;
}
