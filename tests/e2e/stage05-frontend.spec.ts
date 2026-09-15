import { expect, test, type Page } from '@playwright/test';
import { RunResultSchema } from '@jab/contracts';
import { correct } from '../fixtures/java.js';

async function replaceSource(page: Page, source: string) {
  const editor = page.getByRole('textbox', { name: /Java 源码/ });
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(text => navigator.clipboard.writeText(text), source);
  await page.keyboard.press('ControlOrMeta+V');
}

function contrastRatio(foreground: string, background: string) {
  const channel = (value: number) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  const luminance = (color: string) => {
    const match = color.match(/\d+(?:\.\d+)?/g);
    if (!match || match.length < 3) throw new Error(`Unexpected computed color: ${color}`);
    const [red, green, blue] = match.slice(0, 3).map(value => channel(Number(value) / 255));
    return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;
  };
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

test('narrow workbench uses keyboard tabs, readable text and focuses the selected lesson', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await page.getByTestId('lesson-283').click();
  await expect(page.getByTestId('current-lesson')).toContainText('283');
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('workbench');
  await expect.poll(() => page.evaluate(() => Math.abs(document.getElementById('workbench')!.getBoundingClientRect().top))).toBeLessThanOrEqual(1);

  await page.getByTestId('nav-independent').click();
  const tabs = page.getByRole('tablist', { name: '窄屏工作台视图' });
  await expect(tabs).toBeVisible();
  const editorTab = page.getByRole('tab', { name: '编辑' });
  const resultTab = page.getByRole('tab', { name: '结果' });
  const problemTab = page.getByRole('tab', { name: '题面' });
  await expect(editorTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#mobile-panel-editor')).toBeVisible();
  await expect(page.locator('#mobile-panel-problem')).toBeHidden();
  await expect(page.locator('#mobile-panel-result')).toBeHidden();

  await editorTab.focus();
  await editorTab.press('ArrowRight');
  await expect(resultTab).toBeFocused();
  await expect(resultTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#mobile-panel-result')).toBeVisible();
  await resultTab.press('ArrowRight');
  await expect(problemTab).toBeFocused();
  await expect(page.locator('#mobile-panel-problem')).toBeVisible();

  const samples = await page.locator('.panel-heading span, .muted.small, .empty-state').evaluateAll(elements => elements.filter(element => {
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }).map(element => {
    const style = getComputedStyle(element);
    let background = style.backgroundColor;
    let ancestor = element.parentElement;
    while (background === 'rgba(0, 0, 0, 0)' && ancestor) {
      background = getComputedStyle(ancestor).backgroundColor;
      ancestor = ancestor.parentElement;
    }
    return { color: style.color, background, fontSize: Number.parseFloat(style.fontSize) };
  }));
  expect(samples.length).toBeGreaterThan(0);
  for (const sample of samples) {
    expect(sample.fontSize).toBeGreaterThanOrEqual(12);
    expect(contrastRatio(sample.color, sample.background)).toBeGreaterThanOrEqual(4.5);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
});

test('a real single-input run restores health and a failed retry cannot retain the old result', async ({ page }) => {
  test.setTimeout(120_000);
  // Only the read-only health probe is made unavailable. /api/runs is never mocked.
  await page.route('**/api/health', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ status: 'ok', runner: { available: false, reason: '阶段 05 恢复路径检查' } }),
  }));
  await page.goto('/');
  await expect(page.getByTestId('runner-status')).toContainText('执行器不可用');
  await page.unroute('**/api/health');

  await page.getByTestId('lesson-704').click();
  await page.getByTestId('nav-independent').click();
  await expect(page.getByRole('tablist', { name: '窄屏工作台视图' })).toBeHidden();
  await expect(page.locator('#mobile-panel-problem')).toBeVisible();
  await expect(page.locator('#mobile-panel-editor')).toBeVisible();
  await replaceSource(page, correct);

  const pending = page.waitForResponse(response => response.url().endsWith('/api/runs') && response.request().method() === 'POST');
  await page.getByTestId('run-button').click();
  const response = await pending;
  const result = RunResultSchema.parse(await response.json());
  expect(result.origin).toBe('student-java');
  expect(result.mode).toBe('run');
  expect(result.status).toBe('PASSED_LOCAL_TESTS');
  expect(result.cleanup.status).toBe('done');
  await expect(page.getByTestId('run-result').getByRole('heading')).toHaveText('本次输入通过');
  await expect(page.getByTestId('runner-status')).toContainText('Docker 执行器就绪');

  // Abort only the session acquisition for the next attempt. No success response is fabricated.
  await page.route('**/api/session', route => route.abort('connectionfailed'));
  await page.getByTestId('run-button').click();
  const executionError = page.locator('.error-message[role="alert"]');
  await expect(executionError).toContainText('无法连接本地 API');
  await expect(executionError).toContainText('检查启动终端');
  await expect(page.getByTestId('run-result')).toHaveCount(0);
  await expect(page.getByText('还没有执行结果')).toHaveCount(0);
});
