import { z } from 'zod';
import {
  BinarySearchInputSchema, BooleanOutputSchema, ClimbStairsInputSchema, IntArrayOutputSchema, IntOutputSchema,
  LongestSubstringInputSchema, MergeListsInputSchema, MoveZeroesInputSchema, OutputSchema, PROBLEM_META, ProblemIdSchema,
  SortedSquaresInputSchema, TreeInputSchema, TwoSumInputSchema, ValidParenthesesInputSchema,
  judgeProblemOutput, type ProblemInput,
} from './problems.js';
import { LinkedListInputSchema, ListGraphSchema } from './linked-list.js';

const id = z.string().min(1);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const integer = z.number().int();
const stamp = z.iso.datetime();
const problemId = ProblemIdSchema;
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
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (structure.kind === 'array') {
    if (new Set(structure.indices.map(item => item.name)).size !== structure.indices.length) issue('Array pointer names must be unique');
    if (structure.indices.some(item => item.index < -1 || item.index > structure.values.length)) issue('Array pointer must be an item index or an explicit -1/length sentinel');
  }
  if (structure.kind === 'map') {
    const keys = structure.entries.map(item => JSON.stringify(item.key));
    if (new Set(keys).size !== keys.length) issue('Map keys must be unique');
  }
  if (structure.kind === 'stack' && (structure.items.length === 0 ? structure.topIndex !== null : structure.topIndex !== structure.items.length - 1)) issue('Stack topIndex must be null for an empty stack or items.length - 1');
  if (structure.kind === 'list') {
    const ids = new Set(structure.nodes.map(node => node.id));
    if (ids.size !== structure.nodes.length) issue('List object IDs must be unique, even when values repeat');
    if (structure.nodes.some(node => node.nextId !== null && !ids.has(node.nextId)) || structure.bindings.some(binding => binding.objectId !== null && !ids.has(binding.objectId))) issue('Reference snapshot points to an unknown object');
    if (new Set(structure.bindings.map(binding => binding.name)).size !== structure.bindings.length) issue('Variable bindings must be unique');
  }
  if (structure.kind === 'tree') {
    const nodeIds = new Set(structure.nodes.map(node => node.id));
    const frameIds = new Set(structure.frames.map(frame => frame.frameId));
    if (nodeIds.size !== structure.nodes.length || frameIds.size !== structure.frames.length) issue('Tree node IDs and frame IDs must each be unique');
    if (structure.rootId !== null && !nodeIds.has(structure.rootId)) issue('Tree root points to an unknown node');
    if (structure.nodes.some(node => [node.leftId, node.rightId].some(target => target !== null && !nodeIds.has(target))) || structure.frames.some(frame => frame.nodeId !== null && !nodeIds.has(frame.nodeId))) issue('Tree snapshot points to an unknown node');
    const parentCount = new Map<string, number>();
    for (const node of structure.nodes) for (const child of [node.leftId, node.rightId]) if (child !== null) parentCount.set(child, (parentCount.get(child) ?? 0) + 1);
    if ([...parentCount.values()].some(count => count > 1)) issue('Tree nodes cannot have multiple parents');
    const visiting = new Set<string>(); const visited = new Set<string>(); const byId = new Map(structure.nodes.map(node => [node.id, node]));
    const visit = (nodeId: string): boolean => { if (visiting.has(nodeId)) return false; if (visited.has(nodeId)) return true; visiting.add(nodeId); const node = byId.get(nodeId)!; const ok = [node.leftId, node.rightId].every(child => child === null || visit(child)); visiting.delete(nodeId); visited.add(nodeId); return ok; };
    if (structure.rootId !== null && !visit(structure.rootId)) issue('Tree snapshot must be acyclic');
  }
  if (structure.kind === 'dp' && structure.activeIndex !== null && (structure.activeIndex < 0 || structure.activeIndex >= structure.values.length)) issue('DP activeIndex must identify an existing state');
  if (structure.kind === 'window') {
    if (structure.rightExclusive > structure.text.length || structure.left > structure.rightExclusive) issue('Window must satisfy 0 <= left <= rightExclusive <= text.length');
    const members = structure.members.map(value => JSON.stringify(value));
    if (new Set(members).size !== members.length) issue('Window members must not contain duplicates');
  }
});
const state = { variables: z.array(variable), structures: z.array(StructureSchema), explanation: z.string() };
export const SnapshotSchema = z.strictObject({ snapshotId: id, stepId: id, codeRange: z.strictObject({ startLine: integer.positive(), endLine: integer.positive() }), ...state, checkpointId: id.optional() }).refine(s => s.codeRange.endLine >= s.codeRange.startLine);
export const ReferenceTraceSchema = z.strictObject({ schemaVersion: z.literal(1), mode: z.literal('reference-model'), problemId, algorithmVersion: id, referenceSourceHash: hash, inputId: id, inputHash: hash, initialState: z.strictObject({ snapshotId: z.literal('initial'), ...state }), snapshots: z.array(SnapshotSchema).max(2000), finalOutput: OutputSchema }).superRefine((trace, ctx) => {
  if (new Set(trace.snapshots.map(snapshot => snapshot.snapshotId)).size !== trace.snapshots.length) ctx.addIssue({ code: 'custom', message: 'snapshotId 必须唯一' });
  const checkpoints = trace.snapshots.flatMap(snapshot => snapshot.checkpointId ? [snapshot.checkpointId] : []);
  if (new Set(checkpoints).size !== checkpoints.length) ctx.addIssue({ code: 'custom', message: 'checkpointId 必须唯一' });
  for (const snapshot of [trace.initialState, ...trace.snapshots]) {
    if (new Set(snapshot.variables.map(variable => variable.name)).size !== snapshot.variables.length) ctx.addIssue({ code: 'custom', message: `Variable names must be unique in ${snapshot.snapshotId}` });
    if (new Set(snapshot.structures.map(structure => structure.id)).size !== snapshot.structures.length) ctx.addIssue({ code: 'custom', message: `Structure IDs must be unique in ${snapshot.snapshotId}` });
  }
});
export const AnswerSchema = z.discriminatedUnion('kind', [z.strictObject({ kind: z.literal('choice'), optionId: id }), z.strictObject({ kind: z.literal('int'), value: integer }), z.strictObject({ kind: z.literal('text'), value: z.string() })]);
const draft = z.strictObject({ source: z.string(), sourceHash: hash, updatedAt: stamp });
const pass = z.strictObject({ requestId: id, sourceHash: hash, lessonVersion: id, testSuiteVersion: id, passedAt: stamp, viewedSolutionBeforePass: z.boolean(), hintIdsBeforePass: z.array(id) });
export const ProgressSchema = z.strictObject({ schemaVersion: z.literal(1), problemId, lessonVersion: id, startedAt: stamp.nullable(), completedStepIds: z.array(id), predictionResults: z.array(z.strictObject({ checkpointId: id, answer: AnswerSchema, correct: z.boolean(), attempts: integer.positive(), lastAttemptAt: stamp })), drafts: z.strictObject({ guided: draft, independent: draft }), hintsUsed: z.array(z.strictObject({ hintId: id, firstUsedAt: stamp })), viewedSolution: z.boolean(), viewedSolutionAt: stamp.nullable(), guidedPassed: pass.nullable(), independentLocalPassed: pass.nullable(), updatedAt: stamp }).refine(p => p.viewedSolution === (p.viewedSolutionAt !== null), '答案查看时间与标记必须一致');
type DeepReadonly<T> = T extends readonly (infer U)[] ? readonly DeepReadonly<U>[] : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
export type ReferenceTrace = DeepReadonly<z.infer<typeof ReferenceTraceSchema>>;
export type Progress = z.infer<typeof ProgressSchema>;
export type Structure = DeepReadonly<z.infer<typeof StructureSchema>>;
export type Answer = z.infer<typeof AnswerSchema>;
export type ReferencePrediction = { checkpointId: string; prompt: string; answer: Answer; explanation: string; options?: readonly { id: string; label: string }[] };
const javaSource = z.string().min(1).refine(s => new TextEncoder().encode(s).length <= 65536, 'Java source exceeds 64 KiB');
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
const variant = <I extends string, O extends number, Input extends z.ZodType, Expected extends z.ZodType>(problem: I, order: O, input: Input, expected: Expected) => lessonBase.extend({ id: z.literal(problem), order: z.literal(order), source: z.strictObject({ platform: z.literal('LeetCode'), number: z.literal(Number(problem)), url: z.url() }), testSuite: z.strictObject({ version: id, cases: z.array(z.strictObject({ id, input, expected, coverage: id })).min(8).max(16), wrongFixtures }) });
export const LessonSchema = z.discriminatedUnion('id', [
  variant('704', 1, BinarySearchInputSchema, IntOutputSchema),
  variant('283', 2, MoveZeroesInputSchema, IntArrayOutputSchema),
  variant('977', 3, SortedSquaresInputSchema, IntArrayOutputSchema),
  variant('1', 4, TwoSumInputSchema, IntArrayOutputSchema),
  variant('20', 5, ValidParenthesesInputSchema, BooleanOutputSchema),
  variant('206', 6, LinkedListInputSchema, ListGraphSchema),
  variant('21', 7, MergeListsInputSchema, ListGraphSchema),
  variant('104', 8, TreeInputSchema, IntOutputSchema),
  variant('70', 9, ClimbStairsInputSchema, IntOutputSchema),
  variant('3', 10, LongestSubstringInputSchema, IntOutputSchema),
]).superRefine((lesson, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  const meta = PROBLEM_META[lesson.id];
  if (lesson.lessonVersion !== meta.lessonVersion || lesson.testSuite.version !== meta.testSuiteVersion || lesson.source.number !== meta.number || lesson.order !== meta.order) issue('Lesson metadata/version does not match the fixed problem registry');
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
  for (const item of lesson.testSuite.cases) {
    const judged = judgeProblemOutput(lesson.id, item.input as never, item.expected);
    if (!judged.passed) issue(`Wrong expected result: ${item.id}`);
  }
  if (lesson.visualization.modelVersion !== lesson.reference.algorithmVersion) issue('Reference/model version mismatch');
});
export type Lesson = z.infer<typeof LessonSchema>;
export type LessonInput = ProblemInput;
export const BridgeIdSchema = z.enum(['J1','J2','J3','J4','J5','J6','J7','J8']);
export type BridgeId = z.infer<typeof BridgeIdSchema>;
export const BridgeUnitSchema = z.strictObject({ id: BridgeIdSchema, version: z.literal('bridge-v1'), title: id, objectives: z.array(id).min(1), cComparison: id, javaSource, explanation: id, prediction, relatedProblems: z.array(problemId).min(1) });
export type BridgeUnit = z.infer<typeof BridgeUnitSchema>;
export const BridgeProgressSchema = z.strictObject({ schemaVersion: z.literal(1), version: z.literal('bridge-v1'), results: z.array(z.strictObject({ unitId: BridgeIdSchema, answer: AnswerSchema, correct: z.boolean(), attempts: integer.positive(), lastAttemptAt: stamp })) });
