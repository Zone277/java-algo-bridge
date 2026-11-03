import { createHash } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { PROBLEM_ORDER, ProgressSchema, RunResultSchema, type Answer } from '@jab/contracts';
import { lesson27 } from '@jab/curriculum/27';
import { lesson111 } from '@jab/curriculum/111';
import { lesson205 } from '@jab/curriculum/205';
import { lessonRuntimes } from '../../apps/web/src/registry.js';
import { progressKey } from '../../apps/web/src/progress.js';

async function paste(page: Page, source: string) {
  await page.getByRole('textbox', { name: /Java 源码/ }).focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(text => navigator.clipboard.writeText(text), source);
  await page.keyboard.press('ControlOrMeta+V');
}

async function readEditor(page: Page) {
  const editor = page.getByRole('textbox', { name: /Java 源码/ });
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('ControlOrMeta+C');
  return (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n');
}

async function execute(page: Page, button: 'run-button' | 'submit-button', source: string) {
  const pending = page.waitForResponse(response => response.url().endsWith('/api/runs') && response.request().method() === 'POST');
  await page.getByTestId(button).click();
  const response = await pending;
  expect(response.request().postDataJSON().source).toBe(source);
  expect(response.status()).toBe(200);
  const result = RunResultSchema.parse(await response.json());
  expect(result.origin).toBe('student-java');
  expect(result.sourceHash).toBe(createHash('sha256').update(source).digest('hex'));
  expect(result.cleanup.status).toBe('done');
  return result;
}

function answerText(answer: Answer) {
  if (answer.kind === 'int') return String(answer.value);
  if (answer.kind === 'text') return answer.value;
  return answer.optionId;
}

for (const lesson of [lesson27, lesson111, lesson205] as const) {
  test(`${lesson.id} completes the full learning flow with real Java and restored progress`, async ({ page }) => {
    test.setTimeout(240_000);
    const runtime = lessonRuntimes.find(item => item.lesson.id === lesson.id)!;
    const key = progressKey(lesson.id, lesson.lessonVersion);
    await page.goto('/');
    await page.getByTestId(`lesson-${lesson.id}`).click();
    await expect(page.getByText(`LESSON ${String(lesson.order).padStart(2, '0')} / ${PROBLEM_ORDER.length}`, { exact: true })).toBeVisible();
    await page.getByTestId(`lesson-${lesson.id}`).click();

    const syntaxInput = page.getByTestId('syntax-answer');
    if (runtime.syntaxCheck.answer.kind === 'choice') await syntaxInput.selectOption(runtime.syntaxCheck.answer.optionId);
    else await syntaxInput.fill(answerText(runtime.syntaxCheck.answer));
    await page.getByTestId('syntax-check').click();
    await expect(page.getByTestId('syntax-feedback')).toContainText('正确');
    await page.getByRole('button', { name: '继续读题与推导 →' }).click();
    await page.getByRole('button', { name: '我已完成手算，开始预测 →' }).click();

    const trace = await runtime.buildTrace(runtime.demoInputs[0]!.input, runtime.demoInputs[0]!.id);
    const predictions = trace.snapshots.flatMap((_, index) => runtime.predictionAt(trace, index) ?? []);
    expect(predictions.length).toBeGreaterThanOrEqual(2);
    for (const prediction of predictions.slice(0, 2)) {
      for (let step = 0; step <= trace.snapshots.length && !await page.getByTestId('prediction-check').isVisible(); step++) {
        await page.getByRole('button', { name: '下一步', exact: true }).click();
      }
      const input = page.getByLabel('预测值');
      if (prediction.answer.kind === 'choice') await input.selectOption(prediction.answer.optionId);
      else await input.fill(answerText(prediction.answer));
      await page.getByRole('button', { name: '提交预测并揭示' }).click();
      await expect(page.getByTestId('prediction-feedback')).toContainText('预测正确');
    }
    await page.getByRole('button', { name: '重置演示' }).click();

    const alternateDemo = runtime.demoInputs[1]!;
    const alternateTrace = await runtime.buildTrace(alternateDemo.input, alternateDemo.id);
    await page.getByTestId('demo-input').selectOption(alternateDemo.id);
    await expect(page.getByTestId('trace-explanation')).toHaveText(alternateTrace.initialState.explanation);
    await page.getByTestId('demo-input').selectOption(runtime.demoInputs[0]!.id);
    await expect(page.getByTestId('trace-explanation')).toHaveText(trace.initialState.explanation);

    await page.getByRole('button', { name: '下一步', exact: true }).click();
    await expect(page.getByTestId('trace-position')).not.toContainText('初始状态');
    await expect(page.getByRole('table', { name: '参考变量表' })).toBeVisible();
    await page.getByText('查看参考 Java 代码（记录答案使用）').click();
    await expect(page.getByLabel('参考代码步骤高亮').locator('[data-active="true"]')).not.toHaveCount(0);
    await page.getByRole('button', { name: '上一步', exact: true }).click();
    await expect(page.getByTestId('trace-position')).toContainText('初始状态');
    await page.getByLabel('播放速度').selectOption('350');
    await page.getByRole('button', { name: '播放', exact: true }).click();
    await expect(page.getByTestId('trace-position')).not.toContainText('初始状态');
    await page.getByRole('button', { name: '暂停', exact: true }).click();
    const pausedAt = await page.getByTestId('trace-position').textContent();
    await page.waitForTimeout(500);
    await expect(page.getByTestId('trace-position')).toHaveText(pausedAt!);
    await page.getByRole('button', { name: '重置演示' }).click();

    await page.getByTestId('nav-guided').click();
    const methodName = lesson.id === '27' ? 'removeElement' : lesson.id === '111' ? 'minDepth' : 'isIsomorphic';
    await expect(page.getByTestId('method-signature')).toContainText(methodName);
    if (lesson.id === '111') await expect(page.getByTestId('treenode-definition')).toBeVisible();
    for (let stage = 0; stage < lesson.guided.stages.length; stage++) {
      await page.getByTestId(`guided-stage-${stage}`).click();
      await page.getByTestId('guided-load-scaffold').click();
      await page.getByTestId('guided-confirm-scaffold').click();
      await expect.poll(async () => ProgressSchema.parse(await page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)!), key)).drafts.guided.source).toBe(lesson.guided.stages[stage]!.scaffoldSource);
      await page.getByRole('button', { name: '记录本阶段自检完成' }).click();
    }
    await paste(page, lesson.reference.source);
    const guided = await execute(page, 'submit-button', lesson.reference.source);
    expect(guided.status).toBe('PASSED_LOCAL_TESTS');
    await expect(page.getByTestId('run-result')).toContainText('通过本站测试');

    await page.getByTestId('nav-independent').click();
    await expect.poll(async () => ProgressSchema.parse(await page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)!), key)).drafts.independent.source).toBe(lesson.starter.source);
    const fixture = lesson.testSuite.wrongFixtures[0]!;
    const target = lesson.testSuite.cases.find(item => item.id === fixture.targetedCaseIds[0])!;
    await page.getByTestId('input-json').fill(JSON.stringify(target.input));
    await paste(page, fixture.source);
    const wrong = await execute(page, 'run-button', fixture.source);
    expect(wrong.status).toBe('WRONG_ANSWER');
    expect(wrong.diagnostics).toHaveLength(0);
    expect(wrong.cases).toHaveLength(1);
    expect(wrong.cases[0]!.status).toBe('WRONG_ANSWER');

    await paste(page, lesson.reference.source);
    const passed = await execute(page, 'submit-button', lesson.reference.source);
    expect(passed.status).toBe('PASSED_LOCAL_TESTS');
    expect(passed.cases).toHaveLength(lesson.testSuite.cases.length);
    await expect.poll(async () => ProgressSchema.parse(await page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)!), key)).independentLocalPassed?.requestId).toBe(passed.requestId);

    const before = ProgressSchema.parse(await page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)!), key));
    await page.reload();
    await expect(page.getByTestId('current-lesson')).toContainText(lesson.id);
    await page.getByTestId('nav-independent').click();
    await expect.poll(() => readEditor(page)).toBe(lesson.reference.source);
    await page.getByTestId('nav-summary').click();
    await expect(page.getByTestId('progress-summary')).toContainText('引导通过本站测试');
    await expect(page.getByTestId('progress-summary')).toContainText('独立模式通过本站测试');
    const restored = ProgressSchema.parse(await page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)!), key));
    expect(restored.drafts.independent.source).toBe(lesson.reference.source);
    expect(restored.guidedPassed?.requestId).toBe(guided.requestId);
    expect(restored.independentLocalPassed?.requestId).toBe(passed.requestId);
    expect(restored.predictionResults).toEqual(before.predictionResults);
  });
}
