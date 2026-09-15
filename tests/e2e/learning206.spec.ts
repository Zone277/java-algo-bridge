import { test, expect, type Page } from '@playwright/test';
import { lesson206, REFERENCE_SOURCE } from '@jab/curriculum/206';
import { bridgeUnits } from '@jab/curriculum/bridge';
import { BridgeProgressSchema, expectedReversedList, LINKED_STARTER_SOURCE, ProgressSchema, RunResultSchema } from '@jab/contracts';
import { alternateReverse, cycleList, loseNext } from '../fixtures/linked-java.js';
import { wrong as wrong704 } from '../fixtures/java.js';

const key206 = 'java-algo-bridge:v1:progress:206:206-v1';
const key704 = 'java-algo-bridge:v1:progress:704:704-v1';
async function saved(page: Page, key = key206) { return ProgressSchema.parse(await page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key)); }
async function paste(page: Page, source: string) {
  await page.getByRole('textbox', { name: /Java 源码/ }).focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(text => navigator.clipboard.writeText(text), source);
  await page.keyboard.press('ControlOrMeta+V');
}
async function execute(page: Page, source: string, submit = false) {
  const pending = page.waitForResponse(r => r.url().endsWith('/api/runs') && r.request().method() === 'POST');
  await page.getByTestId(submit ? 'submit-button' : 'run-button').click();
  const response = await pending;
  expect(response.request().postDataJSON().source).toBe(source);
  const result = RunResultSchema.parse(await response.json());
  expect(result.origin).toBe('student-java'); expect(result.problemId).toBe('206'); expect(result.cleanup.status).toBe('done');
  return result;
}
test('all eight on-demand Java bridge units record static predictions and return to the lesson', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('lesson-704').click();
  for (const unit of bridgeUnits) {
    await page.getByTestId(`bridge-${unit.id}`).click();
    await expect(page.getByTestId('bridge-panel')).toContainText(unit.title);
    if (unit.prediction.answer.kind !== 'int') throw new Error('Update UI answer driver for new check kind');
    await page.getByTestId('bridge-answer').fill(String(unit.prediction.answer.value + 1));
    await page.getByTestId('bridge-check').click();
    await expect(page.getByTestId('bridge-feedback')).toContainText('预测不符');
    await page.getByTestId('bridge-answer').fill(String(unit.prediction.answer.value));
    await page.getByTestId('bridge-check').click();
    await expect(page.getByTestId('bridge-feedback')).toContainText('静态教学检查，未执行 Java');
    await page.getByTestId('bridge-return').click();
    await expect(page.getByTestId('syntax-answer')).toBeVisible();
  }
  const records = BridgeProgressSchema.parse(await page.evaluate(() => JSON.parse(localStorage.getItem('java-algo-bridge:v1:bridge:bridge-v1')!)));
  expect(records.results).toHaveLength(8);
  expect(records.results.every(r => r.correct && r.attempts === 2)).toBe(true);
  expect((await saved(page, key704)).independentLocalPassed).toBeNull();
  await page.reload();
  await page.getByTestId('bridge-J6').click();
  await expect(page.getByTestId('bridge-panel')).toContainText('8 / 8');
  await page.screenshot({ path: 'test-results/stage03-bridge.png', fullPage: true });
});

test('206 complete journey preserves identities, reference history, real feedback and per-problem drafts', async ({ page }) => {
  test.setTimeout(180000);
  await page.goto('/');
  await page.getByTestId('lesson-704').click();
  await page.getByTestId('nav-independent').click();
  await paste(page, wrong704);
  await page.getByTestId('lesson-206').click();
  await page.getByRole('button', { name: '进入 206 · 反转链表' }).click();
  await page.getByTestId('bridge-J6').click();
  await expect(page.getByTestId('bridge-panel')).toContainText('不同对象');
  await page.getByTestId('bridge-answer').fill('5');
  await page.getByTestId('bridge-check').click();
  await page.getByTestId('bridge-return').click();
  await page.getByTestId('syntax-answer').fill('h0');
  await page.getByTestId('syntax-check').click();
  await expect(page.getByTestId('syntax-feedback')).toContainText('正确');
  await page.getByRole('button', { name: '继续读题与推导 →' }).click();
  await page.getByRole('button', { name: '我已完成手算，开始预测 →' }).click();
  await expect(page.getByTestId('list-object-graph')).toBeVisible();
  await expect(page.locator('[data-node-id]')).toHaveCount(3);
  await expect(page.locator('[data-node-id="h0"]')).toContainText('val = 5');
  await expect(page.locator('[data-node-id="h1"]')).toContainText('val = 5');
  const next = page.getByRole('button', { name: '下一步', exact: true });
  for (const answer of ['h1', 'h0']) {
    for (let i = 0; i < 15 && !await page.getByTestId('prediction-check').isVisible(); i++) await next.click();
    const before = await page.getByTestId('trace-position').innerText();
    await expect(next).toBeDisabled();
    await page.getByLabel('预测值', { exact: true }).fill(answer);
    await expect(page.getByTestId('trace-position')).toHaveText(before);
    await page.getByRole('button', { name: '提交预测并揭示' }).click();
    await expect(page.getByTestId('prediction-feedback')).toContainText(answer === 'h1' ? '预测正确' : '预测不符，正确值为 null');
  }
  await expect(page.getByTestId('trace-position')).toContainText('reverse-next');
  await expect(page.locator('[data-node-id="h0"]')).toContainText('next = null');
  await expect(page.getByTestId('reference-bindings')).toContainText('next → h1');
  const fields = await page.getByTestId('reference-node-fields').innerText();
  const bindings = await page.getByTestId('reference-bindings').innerText();
  await page.getByRole('button', { name: '上一步', exact: true }).click();
  await expect(page.locator('[data-node-id="h0"]')).toContainText('next = h1');
  await next.click();
  await expect(page.getByTestId('reference-node-fields')).toHaveText(fields, { useInnerText: true });
  await expect(page.getByTestId('reference-bindings')).toHaveText(bindings, { useInnerText: true });
  await next.click();
  await expect(page.getByTestId('trace-position')).toContainText('move-prev');
  await expect(page.getByTestId('reference-bindings')).toContainText('prev → h0');
  await expect(page.getByTestId('reference-node-fields')).toHaveText(fields, { useInnerText: true });
  await next.click();
  await expect(page.getByTestId('trace-position')).toContainText('move-curr');
  await expect(page.getByTestId('reference-bindings')).toContainText('curr → h1');
  await expect(page.locator('[data-node-id]')).toHaveCount(3);
  await page.getByText('查看参考 Java 代码（记录答案使用）', { exact: true }).click();
  await expect(page.locator('[data-active="true"]')).toContainText('curr = next');
  await page.screenshot({ path: 'test-results/stage03-reference.png', fullPage: true });
  await page.getByRole('button', { name: '播放', exact: true }).click();
  await expect(page.getByTestId('trace-position')).toContainText('check-loop');
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await page.getByRole('button', { name: '重置演示' }).click();
  await expect(page.getByTestId('trace-position')).toContainText('初始状态');
  await page.getByTestId('demo-input').selectOption('empty');
  await expect(page.getByTestId('empty-list')).toBeVisible();
  await expect(page.getByRole('table', { name: '参考变量表' })).toContainText('null（未引用对象）');
  await expect(page.getByRole('table', { name: '参考变量表' })).not.toContainText('对象 null');
  await expect(page.locator('[data-node-id]')).toHaveCount(0);
  await page.getByTestId('demo-input').selectOption('singleton');
  await expect(page.locator('[data-node-id]')).toHaveCount(1);
  await page.getByTestId('nav-guided').click();
  for (let stage = 0; stage < 3; stage++) {
    await page.getByTestId(`guided-stage-${stage}`).click();
    await page.getByTestId('guided-load-scaffold').click();
    await page.getByTestId('guided-confirm-scaffold').click();
    await expect.poll(async () => (await saved(page)).drafts.guided.source).toBe(lesson206.guided.stages[stage]!.scaffoldSource);
    await paste(page, REFERENCE_SOURCE);
    await page.getByRole('button', { name: '记录本阶段自检完成' }).click();
  }
  expect((await saved(page)).guidedPassed).toBeNull();
  expect((await saved(page)).drafts.independent.source).toBe(LINKED_STARTER_SOURCE);
  await paste(page, alternateReverse);
  const guided = await execute(page, alternateReverse, true);
  expect(guided.status).toBe('PASSED_LOCAL_TESTS');
  await expect.poll(async () => (await saved(page)).guidedPassed?.requestId).toBe(guided.requestId);
  await page.getByTestId('nav-independent').click();
  await expect(page.getByTestId('listnode-definition')).toBeVisible();
  for (const source of [cycleList, loseNext]) {
    await paste(page, source);
    expect((await execute(page, source)).status).toBe('WRONG_ANSWER');
    await expect(page.getByTestId('run-result')).toContainText('答案不正确');
  }
  await page.getByTestId('hint-1').click();
  await paste(page, REFERENCE_SOURCE);
  const passed = await execute(page, REFERENCE_SOURCE, true);
  expect(passed.status).toBe('PASSED_LOCAL_TESTS');
  expect(passed.cases).toHaveLength(9);
  expect(passed.cases.every(c => c.status === 'PASSED')).toBe(true);
  await expect.poll(async () => (await saved(page)).independentLocalPassed?.requestId).toBe(passed.requestId);
  const before = await saved(page);
  await page.getByTestId('nav-summary').click();
  await expect(page.getByTestId('progress-summary')).toContainText('独立模式通过本站测试（已查看答案）');
  await page.screenshot({ path: 'test-results/stage03-summary.png', fullPage: true });
  await page.reload();
  await page.getByRole('button', { name: '进入 206 · 反转链表' }).click();
  expect((await saved(page)).drafts).toEqual(before.drafts);
  expect((await saved(page)).independentLocalPassed).toEqual(before.independentLocalPassed);
  await page.getByTestId('nav-independent').click();
  const custom = await execute(page, REFERENCE_SOURCE);
  expect(custom.cases[0]!.actual).toEqual(expectedReversedList({ head: [5,5,8] }));
  await page.getByTestId('lesson-704').click();
  await page.getByRole('button', { name: '进入 704 · 二分查找' }).click();
  expect((await saved(page, key704)).drafts.independent.source).toBe(wrong704);
  expect((await saved(page, key704)).independentLocalPassed).toBeNull();
});
