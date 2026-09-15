import { expect, test, type Page } from '@playwright/test';
import { ProgressSchema, RunResultSchema, type Answer } from '@jab/contracts';
import { lesson70 } from '@jab/curriculum/70';
import { lesson3 } from '@jab/curriculum/3';
import { lessonRuntimes } from '../../apps/web/src/registry.js';
import { progressKey } from '../../apps/web/src/progress.js';

async function paste(page: Page, source: string) {
  await page.getByRole('textbox', { name: /Java 源码/ }).focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(text => navigator.clipboard.writeText(text), source);
  await page.keyboard.press('ControlOrMeta+V');
}
async function execute(page: Page, button: 'run-button' | 'submit-button', source: string) {
  const pending = page.waitForResponse(response => response.url().endsWith('/api/runs') && response.request().method() === 'POST');
  await page.getByTestId(button).click();
  const response = await pending;
  expect(response.request().postDataJSON().source).toBe(source);
  expect(response.status()).toBe(200);
  return RunResultSchema.parse(await response.json());
}
function answerText(answer: Answer) { return answer.kind === 'int' ? String(answer.value) : answer.kind === 'text' ? answer.value : answer.optionId; }

for (const lesson of [lesson70, lesson3] as const) {
  test(`${lesson.id} complete browser learning flow reaches real failure/pass and restores progress`, async ({ page }) => {
    test.setTimeout(180_000);
    const runtime = lessonRuntimes.find(item => item.lesson.id === lesson.id)!;
    const key = progressKey(lesson.id, lesson.lessonVersion);
    await page.goto('/');
    await page.getByTestId(`lesson-${lesson.id}`).click();
    await page.getByTestId(`lesson-${lesson.id}`).click();
    const syntaxInput = page.getByTestId('syntax-answer');
    if (runtime.syntaxCheck.answer.kind === 'choice') await syntaxInput.selectOption(runtime.syntaxCheck.answer.optionId); else await syntaxInput.fill(answerText(runtime.syntaxCheck.answer));
    await page.getByTestId('syntax-check').click();
    await expect(page.getByTestId('syntax-feedback')).toContainText('正确');
    await page.getByRole('button', { name: '继续读题与推导 →' }).click();
    await page.getByRole('button', { name: '我已完成手算，开始预测 →' }).click();
    await expect(page.getByTestId('trace-position')).toContainText('初始状态');
    const trace = await runtime.buildTrace(runtime.demoInputs[0]!.input, runtime.demoInputs[0]!.id);
    const predictions = trace.snapshots.flatMap((_, index) => runtime.predictionAt(trace, index) ?? []);
    expect(predictions.length).toBeGreaterThanOrEqual(2);
    for (const prediction of predictions.slice(0, 2)) {
      for (let step = 0; step <= trace.snapshots.length && !await page.getByTestId('prediction-check').isVisible(); step++) await page.getByRole('button', { name: '下一步', exact: true }).click();
      const input = page.getByLabel('预测值');
      if (prediction.answer.kind === 'choice') await input.selectOption(prediction.answer.optionId); else await input.fill(answerText(prediction.answer));
      await page.getByRole('button', { name: '提交预测并揭示' }).click();
      await expect(page.getByTestId('prediction-feedback')).toContainText('预测正确');
    }
    await page.getByRole('button', { name: '上一步', exact: true }).click();
    await page.getByRole('button', { name: '下一步', exact: true }).click();
    await page.getByRole('button', { name: '重置演示' }).click();

    await page.getByTestId('nav-guided').click();
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

    await page.getByTestId('nav-independent').click();
    const fixture = lesson.testSuite.wrongFixtures[0]!;
    const target = lesson.testSuite.cases.find(item => item.id === fixture.targetedCaseIds[0])!;
    await page.getByTestId('input-json').fill(JSON.stringify(target.input));
    await paste(page, fixture.source);
    expect((await execute(page, 'run-button', fixture.source)).status).toBe('WRONG_ANSWER');
    await paste(page, lesson.reference.source);
    const passed = await execute(page, 'submit-button', lesson.reference.source);
    expect(passed.status).toBe('PASSED_LOCAL_TESTS');
    expect(passed.cases).toHaveLength(lesson.testSuite.cases.length);
    await expect.poll(async () => ProgressSchema.parse(await page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)!), key)).independentLocalPassed?.requestId).toBe(passed.requestId);
    const before = ProgressSchema.parse(await page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)!), key));
    await page.reload();
    await expect(page.getByTestId('current-lesson')).toContainText(lesson.id);
    const restored = ProgressSchema.parse(await page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey)!), key));
    expect(restored.drafts.independent.source).toBe(lesson.reference.source);
    expect(restored.guidedPassed?.requestId).toBe(guided.requestId);
    expect(restored.independentLocalPassed?.requestId).toBe(passed.requestId);
    expect(restored.predictionResults).toEqual(before.predictionResults);
    expect(restored.completedStepIds).toEqual(expect.arrayContaining(lesson.guided.stages.map(stage => stage.id)));
    await page.getByTestId('nav-summary').click();
    await expect(page.getByTestId('progress-summary')).toContainText('独立模式通过本站测试');
  });
}
