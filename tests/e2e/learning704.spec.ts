import { test, expect, type Page } from '@playwright/test';
import { lesson704, REFERENCE_SOURCE } from '@jab/curriculum/704';
import { ProgressSchema, RunResultSchema, STARTER_SOURCE } from '@jab/contracts';
import { PROGRESS_KEY, LEGACY_DRAFT_KEY } from '../../apps/web/src/progress.js';
import { wrong } from '../fixtures/java.js';

async function paste(page: Page, source: string) {
  await page.getByRole('textbox', { name: /Java 源码/ }).focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(text => navigator.clipboard.writeText(text), source);
  await page.keyboard.press('ControlOrMeta+V');
}
async function saved(page: Page) {
  return ProgressSchema.parse(await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), PROGRESS_KEY));
}
async function execute(page: Page, button: 'run-button' | 'submit-button', source: string) {
  const pending = page.waitForResponse(r => r.url().endsWith('/api/runs') && r.request().method() === 'POST');
  await page.getByTestId(button).click();
  const response = await pending;
  expect(response.request().postDataJSON().source).toBe(source);
  expect(response.status()).toBe(200);
  const result = RunResultSchema.parse(await response.json());
  expect(result.origin).toBe('student-java');
  expect(result.cleanup.status).toBe('done');
  return result;
}

test('704 complete learning journey uses real Java submissions and restores separate drafts', async ({ page }) => {
  test.setTimeout(180000);
  await page.goto('/');
  await page.getByTestId('lesson-704').click();
  await expect(page.getByText('写算法前，先补齐这几句 Java')).toBeVisible();
  await page.getByTestId('syntax-answer').fill('5');
  await page.getByTestId('syntax-check').click();
  await expect(page.getByTestId('syntax-feedback')).toContainText('再想一想');
  await page.getByTestId('syntax-answer').fill('4');
  await page.getByTestId('syntax-check').click();
  await expect(page.getByTestId('syntax-feedback')).toContainText('正确');
  await page.getByRole('button', { name: '继续读题与推导 →' }).click();
  await expect(page.getByText('从逐个寻找，到排除一半')).toBeVisible();
  await page.getByRole('button', { name: '我已完成手算，开始预测 →' }).click();
  await expect(page.getByTestId('trace-position')).toContainText('初始状态');
  const next = page.getByRole('button', { name: '下一步', exact: true });
  for (const answer of ['99', '3']) {
    for (let step = 0; step < 20 && !await page.getByTestId('prediction-check').isVisible(); step++) await next.click();
    await expect(page.getByTestId('prediction-check')).toBeVisible();
    const before = await page.getByTestId('trace-position').innerText();
    await expect(next).toBeDisabled();
    await page.getByRole('spinbutton', { name: '预测值' }).fill(answer);
    await expect(page.getByTestId('trace-position')).toHaveText(before);
    await page.getByRole('button', { name: '提交预测并揭示' }).click();
    await expect(page.getByTestId('prediction-feedback')).toContainText(answer === '99' ? '预测不符，正确值为 2' : '预测正确');
  }
  await expect(page.getByTestId('search-interval')).toContainText('[3, 4]');
  const position = await page.getByTestId('trace-position').innerText();
  const variables = await page.getByRole('table', { name: '参考变量表' }).innerText();
  await page.getByRole('button', { name: '上一步', exact: true }).click();
  await next.click();
  await expect(page.getByTestId('trace-position')).toHaveText(position);
  await expect(page.getByRole('table', { name: '参考变量表' })).toHaveText(variables, { useInnerText: true });
  await page.getByText('查看参考 Java 代码（记录答案使用）', { exact: true }).click();
  await expect(page.locator('[data-active="true"]')).toContainText('left = mid + 1');
  await page.screenshot({ path: 'test-results/stage02-reference.png', fullPage: true });
  await page.getByRole('button', { name: '播放', exact: true }).click();
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await expect(page.getByRole('button', { name: '播放', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '重置演示' }).click();
  await expect(page.getByTestId('trace-position')).toContainText('初始状态');
  await page.getByRole('combobox', { name: '播放速度' }).selectOption('350');
  await page.getByRole('button', { name: '播放', exact: true }).click();
  // Assert automatic advancement, not a transient 350 ms frame that polling may miss.
  await expect(page.getByTestId('trace-position')).toContainText(/步骤 \d+ \/ 11/);
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  const paused = await page.getByTestId('trace-position').innerText();
  await page.waitForTimeout(500); // Longer than one playback tick: pause must cancel advancement.
  await expect(page.getByTestId('trace-position')).toHaveText(paused);
  await page.getByTestId('demo-input').selectOption('missing');
  await expect(page.getByRole('table', { name: '参考变量表' })).toContainText('6');
  await expect(page.getByTestId('trace-position')).toContainText('初始状态');
  await page.getByTestId('nav-guided').click();
  for (let stage = 0; stage < 3; stage++) {
    await page.getByTestId(`guided-stage-${stage}`).click();
    await page.getByTestId('guided-load-scaffold').click();
    await page.getByTestId('guided-confirm-scaffold').click();
    await expect.poll(async () => (await saved(page)).drafts.guided.source).toBe(lesson704.guided.stages[stage]!.scaffoldSource);
    await paste(page, REFERENCE_SOURCE);
    await page.getByRole('button', { name: '记录本阶段自检完成' }).click();
  }
  expect((await saved(page)).guidedPassed).toBeNull();
  expect((await saved(page)).drafts.independent.source).toBe(STARTER_SOURCE);
  // Different, functionally correct Java proves the guided check is not string equality.
  const alternate = REFERENCE_SOURCE.replace('int mid = left + (right - left) / 2;', 'int mid = (left + right) >>> 1;');
  await paste(page, alternate);
  const guided = await execute(page, 'submit-button', alternate);
  expect(guided.status).toBe('PASSED_LOCAL_TESTS');
  expect(guided.cases).toHaveLength(13);
  await expect.poll(async () => (await saved(page)).guidedPassed?.requestId).toBe(guided.requestId);
  expect((await saved(page)).independentLocalPassed).toBeNull();
  await page.getByTestId('nav-independent').click();
  for (const level of [1, 2, 3]) await page.getByTestId(`hint-${level}`).click();
  await paste(page, wrong);
  expect((await execute(page, 'run-button', wrong)).status).toBe('WRONG_ANSWER');
  await expect(page.getByTestId('run-result')).toContainText('答案不正确');
  expect((await saved(page)).independentLocalPassed).toBeNull();
  await page.screenshot({ path: 'test-results/stage02-failure.png', fullPage: true });
  await paste(page, REFERENCE_SOURCE);
  const independent = await execute(page, 'submit-button', REFERENCE_SOURCE);
  expect(independent.status).toBe('PASSED_LOCAL_TESTS');
  expect(independent.cases).toHaveLength(13);
  expect(independent.cases.every(c => c.status === 'PASSED')).toBe(true);
  await expect.poll(async () => (await saved(page)).independentLocalPassed?.requestId).toBe(independent.requestId);
  const beforeRefresh = await saved(page);
  expect(beforeRefresh.viewedSolution).toBe(true);
  expect(beforeRefresh.hintsUsed).toHaveLength(3);
  expect(beforeRefresh.predictionResults).toHaveLength(3);
  expect(beforeRefresh.predictionResults.find(p => p.checkpointId.includes('syntax'))?.attempts).toBe(2);
  await page.getByTestId('nav-summary').click();
  await expect(page.getByTestId('progress-summary')).toContainText('独立模式通过本站测试（已查看答案）');
  await page.screenshot({ path: 'test-results/stage02-summary.png', fullPage: true });
  await page.reload();
  await page.getByTestId('lesson-704').click();
  const restored = await saved(page);
  expect(restored.drafts).toEqual(beforeRefresh.drafts);
  expect(restored.predictionResults).toEqual(beforeRefresh.predictionResults);
  expect(restored.independentLocalPassed).toEqual(beforeRefresh.independentLocalPassed);
  expect(restored.guidedPassed).toEqual(beforeRefresh.guidedPassed);
  await page.getByTestId('nav-independent').click();
  expect((await execute(page, 'run-button', REFERENCE_SOURCE)).status).toBe('PASSED_LOCAL_TESTS');
  await page.getByTestId('nav-guided').click();
  expect((await execute(page, 'run-button', alternate)).status).toBe('PASSED_LOCAL_TESTS');
  // Storage compatibility probe using the actual earned records, not fabricated API success.
  await page.evaluate(key => {
    const data = JSON.parse(localStorage.getItem(key)!);
    data.guidedPassed.lessonVersion = '704-old';
    data.independentLocalPassed.testSuiteVersion = '704-tests-v1';
    localStorage.setItem(key, JSON.stringify(data));
  }, PROGRESS_KEY);
  await page.reload();
  await page.getByTestId('nav-summary').click();
  await expect(page.getByTestId('progress-summary')).toContainText('旧课程记录');
  await expect(page.getByTestId('progress-summary')).toContainText('旧测试集记录');
});

test('legacy and damaged local records are preserved without claiming a pass', async ({ page }) => {
  const legacy = JSON.stringify({ source: wrong });
  await page.addInitScript(({ key, value }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, value); }, { key: LEGACY_DRAFT_KEY, value: legacy });
  await page.goto('/');
  await page.getByTestId('import-legacy-draft').click();
  await expect.poll(async () => (await saved(page)).drafts.independent.source).toBe(wrong);
  expect(await page.evaluate(key => localStorage.getItem(key), LEGACY_DRAFT_KEY)).toBe(legacy);
  expect((await saved(page)).independentLocalPassed).toBeNull();
  await page.evaluate(key => localStorage.setItem(key, '{damaged'), PROGRESS_KEY);
  await page.reload();
  await expect(page.getByText(/存储不可用或记录损坏/)).toBeVisible();
  await page.getByTestId('lesson-704').click();
  await page.getByTestId('nav-independent').click();
  await paste(page, REFERENCE_SOURCE);
  expect(await page.evaluate(key => localStorage.getItem(key), PROGRESS_KEY)).toBe('{damaged');
});
