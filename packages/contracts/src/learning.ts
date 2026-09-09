import { z } from 'zod';
import { LinkedListInputSchema, ListGraphSchema, expectedReversedList } from './linked-list.js';

const id = z.string().min(1);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const integer = z.number().int();
const stamp = z.iso.datetime();
const problemId = z.enum(['704', '283', '977', '1', '20', '206', '21', '104', '70', '3']);
export const ValueSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('int'), value: integer }),
  z.strictObject({ kind: z.literal('boolean'), value: z.boolean() }),
  z.strictObject({ kind: z.literal('char'), value: z.string().length(1) }),
  z.strictObject({ kind: z.literal('string'), value: z.string() }),
  z.strictObject({ kind: z.literal('reference'), objectId: id.nullable() }),
]);
const variable = z.strictObject({ name: id, value: ValueSchema });
export const StructureSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('array'), id, values: z.array(integer), indices: z.array(z.strictObject({ name: id, index: integer })) }),
  z.strictObject({ kind: z.literal('map'), id, entries: z.array(z.strictObject({ key: ValueSchema, value: ValueSchema })) }),
  z.strictObject({ kind: z.literal('stack'), id, items: z.array(ValueSchema), topIndex: integer.nullable() }),
  z.strictObject({ kind: z.literal('list'), id, nodes: z.array(z.strictObject({ id, value: integer, nextId: id.nullable() })), bindings: z.array(z.strictObject({ name: id, objectId: id.nullable() })) }),
  z.strictObject({ kind: z.literal('tree'), id, nodes: z.array(z.strictObject({ id, value: integer, leftId: id.nullable(), rightId: id.nullable() })), rootId: id.nullable(), frames: z.array(z.strictObject({ frameId: id, nodeId: id.nullable(), phase: z.enum(['enter', 'await-left', 'await-right', 'return']), leftDepth: integer.nullable(), rightDepth: integer.nullable(), returnValue: integer.nullable() })) }),
  z.strictObject({ kind: z.literal('dp'), id, values: z.array(integer.nullable()), activeIndex: integer.nullable() }),
  z.strictObject({ kind: z.literal('window'), id, text: z.string(), left: integer.nonnegative(), rightExclusive: integer.nonnegative(), members: z.array(ValueSchema) }),
]).superRefine((structure, ctx) => {
  if (structure.kind !== 'list') return;
  const ids = new Set(structure.nodes.map(node => node.id));
  if (ids.size !== structure.nodes.length) ctx.addIssue({ code: 'custom', message: 'List object IDs must be unique, even when values repeat' });
  if (structure.nodes.some(node => node.nextId !== null && !ids.has(node.nextId)) || structure.bindings.some(binding => binding.objectId !== null && !ids.has(binding.objectId))) ctx.addIssue({ code: 'custom', message: 'Reference snapshot points to an unknown object' });
  if (new Set(structure.bindings.map(binding => binding.name)).size !== structure.bindings.length) ctx.addIssue({ code: 'custom', message: 'Variable bindings must be unique' });
});
const state = { variables: z.array(variable), structures: z.array(StructureSchema), explanation: z.string() };
export const SnapshotSchema = z.strictObject({ snapshotId: id, stepId: id, codeRange: z.strictObject({ startLine: integer.positive(), endLine: integer.positive() }), ...state, checkpointId: id.optional() }).refine(s => s.codeRange.endLine >= s.codeRange.startLine);
export const ReferenceTraceSchema = z.strictObject({ schemaVersion: z.literal(1), mode: z.literal('reference-model'), problemId, algorithmVersion: id, referenceSourceHash: hash, inputId: id, inputHash: hash, initialState: z.strictObject({ snapshotId: z.literal('initial'), ...state }), snapshots: z.array(SnapshotSchema).max(2000), finalOutput: z.union([z.strictObject({ kind: z.literal('int'), value: integer }), ListGraphSchema]) }).refine(t => new Set(t.snapshots.map(s => s.snapshotId)).size === t.snapshots.length, 'snapshotId 必须唯一');
export const AnswerSchema = z.discriminatedUnion('kind', [z.strictObject({ kind: z.literal('choice'), optionId: id }), z.strictObject({ kind: z.literal('int'), value: integer }), z.strictObject({ kind: z.literal('text'), value: z.string() })]);
const draft = z.strictObject({ source: z.string(), sourceHash: hash, updatedAt: stamp });
const pass = z.strictObject({ requestId: id, sourceHash: hash, lessonVersion: id, testSuiteVersion: id, passedAt: stamp, viewedSolutionBeforePass: z.boolean(), hintIdsBeforePass: z.array(id) });
export const ProgressSchema = z.strictObject({ schemaVersion: z.literal(1), problemId, lessonVersion: id, startedAt: stamp.nullable(), completedStepIds: z.array(id), predictionResults: z.array(z.strictObject({ checkpointId: id, answer: AnswerSchema, correct: z.boolean(), attempts: integer.positive(), lastAttemptAt: stamp })), drafts: z.strictObject({ guided: draft, independent: draft }), hintsUsed: z.array(z.strictObject({ hintId: id, firstUsedAt: stamp })), viewedSolution: z.boolean(), viewedSolutionAt: stamp.nullable(), guidedPassed: pass.nullable(), independentLocalPassed: pass.nullable(), updatedAt: stamp }).refine(p => p.viewedSolution === (p.viewedSolutionAt !== null), '答案查看时间与标记必须一致');
type DeepReadonly<T> = T extends readonly (infer U)[] ? readonly DeepReadonly<U>[] : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
export type ReferenceTrace = DeepReadonly<z.infer<typeof ReferenceTraceSchema>>;
export type Progress = z.infer<typeof ProgressSchema>;
export type Structure = DeepReadonly<z.infer<typeof StructureSchema>>;
export type Answer = z.infer<typeof AnswerSchema>;
export type ReferencePrediction = { checkpointId: string; prompt: string; answer: number | string; explanation: string };
const javaSource = z.string().min(1).refine(s => new TextEncoder().encode(s).length <= 65536, 'Java source exceeds 64 KiB');
const lessonInput = z.strictObject({ nums: z.array(integer.min(-9999).max(9999)).min(1).max(10000), target: integer.min(-9999).max(9999) }).refine(input => input.nums.every((n, i) => i === 0 || n > input.nums[i - 1]!));
const prediction = z.strictObject({ id, prompt: id, answer: AnswerSchema, options: z.array(z.strictObject({ id, label: id })).min(2).optional(), explanation: id, checkpointId: id }).superRefine((p, ctx) => {
  if (p.answer.kind === 'choice') {
    const option = p.answer.optionId;
    if (!p.options || !p.options.some(o => o.id === option) || new Set(p.options.map(o => o.id)).size !== p.options.length) ctx.addIssue({ code: 'custom', message: 'Choice options must be unique and contain the answer' });
  } else if (p.options) ctx.addIssue({ code: 'custom', message: 'Only choice checks have options' });
});
const lessonBase = z.strictObject({
  schemaVersion: z.literal(1), slug: id, title: id, lessonVersion: id,
  prerequisites: z.array(z.enum(['J1','J2','J3','J4','J5','J6','J7','J8'])).min(1), objectives: z.array(id).min(1),
  taskSemantics: id, siteLimits: z.strictObject({ description: id, inputSchemaId: id }),
  steps: z.array(z.strictObject({ id, kind: z.enum(['syntax','understanding','derivation','prediction','reference-demo','guided-code','independent-code','summary']), title: id, body: id, relatedIds: z.array(id) })).min(8),
  starter: z.strictObject({ source: javaSource, fileName: z.literal('Solution.java') }),
  reference: z.strictObject({ source: javaSource, fileName: z.literal('Solution.java'), sourceHash: hash, algorithmVersion: id, stepMap: z.array(z.strictObject({ stepId: id, startLine: integer.positive(), endLine: integer.positive() })).min(1) }),
  hints: z.tuple([z.strictObject({ id, level: z.literal(1), body: id }),z.strictObject({ id, level: z.literal(2), body: id }),z.strictObject({ id, level: z.literal(3), body: id })]),
  predictionChecks: z.array(prediction).min(2),
  guided: z.strictObject({ id, stages: z.array(z.strictObject({ id, instruction: id, scaffoldSource: javaSource, checkKind: z.literal('static-practice') })).min(3), finalCheck: z.literal('real-java-submit') }),
  independent: z.strictObject({ initialSource: javaSource }),
  commonErrors: z.array(z.strictObject({ id, description: id, counterexampleInputId: id, explanation: id })).min(3),
  visualization: z.strictObject({ modelId: id, modelVersion: id, inputIds: z.array(id).min(2), maxItems: z.literal(30), maxSnapshots: z.literal(2000), maxTreeDepth: z.literal(8) }),
});
const wrongFixtures = z.array(z.strictObject({ id, source: javaSource, targetedCaseIds: z.array(id).min(1) })).min(2);
export const LessonSchema = z.discriminatedUnion('id', [
  lessonBase.extend({ id: z.literal('704'), order: z.literal(1), source: z.strictObject({ platform: z.literal('LeetCode'), number: z.literal(704), url: z.url() }), testSuite: z.strictObject({ version: id, cases: z.array(z.strictObject({ id, input: lessonInput, expected: z.strictObject({ kind: z.literal('int'), value: integer }), coverage: id })).min(8).max(16), wrongFixtures }) }),
  lessonBase.extend({ id: z.literal('206'), order: z.literal(6), source: z.strictObject({ platform: z.literal('LeetCode'), number: z.literal(206), url: z.url() }), testSuite: z.strictObject({ version: id, cases: z.array(z.strictObject({ id, input: LinkedListInputSchema, expected: ListGraphSchema, coverage: id })).min(8).max(16), wrongFixtures }) }),
]).superRefine((lesson, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  const ids = [...lesson.steps.map(s => s.id), ...lesson.predictionChecks.map(p => p.id), ...lesson.hints.map(h => h.id), ...lesson.guided.stages.map(s => s.id), lesson.guided.id, ...lesson.commonErrors.map(e => e.id), ...lesson.testSuite.cases.map(c => c.id), ...lesson.testSuite.wrongFixtures.map(f => f.id)];
  if (new Set(ids).size !== ids.length) issue('Lesson item ids must be globally unique');
  const known = new Set([...ids, ...lesson.visualization.inputIds, ...lesson.prerequisites, ...lesson.reference.stepMap.map(s => s.stepId), ...lesson.predictionChecks.map(p => p.checkpointId)]);
  for (const step of lesson.steps) if (step.relatedIds.some(ref => !known.has(ref))) issue(`Unknown relatedId in ${step.id}`);
  const kinds = new Set<string>(lesson.steps.map(s => s.kind));
  for (const kind of ['syntax','understanding','derivation','prediction','reference-demo','guided-code','independent-code','summary']) if (!kinds.has(kind)) issue(`Missing lesson step kind: ${kind}`);
  const lines = lesson.reference.source.split('\n').length;
  if (new Set(lesson.reference.stepMap.map(s => s.stepId)).size !== lesson.reference.stepMap.length) issue('Reference step ids must be unique');
  for (const step of lesson.reference.stepMap) if (step.endLine < step.startLine || step.endLine > lines) issue(`Invalid reference range: ${step.stepId}`);
  const cases = new Set(lesson.testSuite.cases.map(c => c.id));
  for (const fixture of lesson.testSuite.wrongFixtures) if (fixture.targetedCaseIds.some(c => !cases.has(c))) issue('Unknown fixture case');
  for (const error of lesson.commonErrors) if (!cases.has(error.counterexampleInputId)) issue('Unknown error counterexample');
  if (lesson.id === '704') {
    for (const item of lesson.testSuite.cases) if (item.expected.value !== item.input.nums.indexOf(item.input.target)) issue(`Wrong expected result: ${item.id}`);
  } else {
    for (const item of lesson.testSuite.cases) if (JSON.stringify(item.expected) !== JSON.stringify(expectedReversedList(item.input))) issue(`Wrong expected identity graph: ${item.id}`);
  }
  if (lesson.visualization.modelVersion !== lesson.reference.algorithmVersion) issue('Reference/model version mismatch');
});
export type Lesson = z.infer<typeof LessonSchema>;
export type LessonInput = z.infer<typeof lessonInput> | z.infer<typeof LinkedListInputSchema>;
export const BridgeIdSchema = z.enum(['J1','J2','J3','J4','J5','J6','J7','J8']);
export type BridgeId = z.infer<typeof BridgeIdSchema>;
export const BridgeUnitSchema = z.strictObject({ id: BridgeIdSchema, version: z.literal('bridge-v1'), title: id, objectives: z.array(id).min(1), cComparison: id, javaSource, explanation: id, prediction, relatedProblems: z.array(problemId).min(1) });
export type BridgeUnit = z.infer<typeof BridgeUnitSchema>;
export const BridgeProgressSchema = z.strictObject({ schemaVersion: z.literal(1), version: z.literal('bridge-v1'), results: z.array(z.strictObject({ unitId: BridgeIdSchema, answer: AnswerSchema, correct: z.boolean(), attempts: integer.positive(), lastAttemptAt: stamp })) });
