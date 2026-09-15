import { createHash } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { correct, wrong, syntaxError, infinite } from '../fixtures/java.js';

async function replaceSource(page: Page, source: string) {
  const editor = page.getByRole('textbox', { name: /Java 源码/ });
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+A');
  // Paste a complete file through Monaco's real paste handler; insertText is a
  // typing event and intentionally activates Java auto-indentation/bracket edits.
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(text => navigator.clipboard.writeText(text), source);
  await page.keyboard.press('ControlOrMeta+V');
}
test('browser edits compile and execute through the real local API and Docker', async ({ page }) => {
  const externalRequests: string[] = [];
  page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).hostname !== '127.0.0.1') externalRequests.push(request.url()); });
  await page.goto('/');
  await page.getByTestId('lesson-704').click();
  await page.getByTestId('nav-independent').click();
  await expect(page.getByTestId('run-button')).toBeVisible();
  await replaceSource(page, correct);
  await page.getByTestId('input-json').fill(JSON.stringify({ nums: [-17, -2, 9, 32], target: 9 }));
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/runs') && response.request().method() === 'POST');
  await page.getByTestId('run-button').click();
  const response = await responsePromise;
  const result = await response.json();
  expect(response.status()).toBe(200);
  expect(result.status).toBe('PASSED_LOCAL_TESTS');
  expect(result.origin).toBe('student-java');
  expect(result.sourceHash).toBe(createHash('sha256').update(correct).digest('hex'));
  expect(result.cases[0].actual).toEqual({ kind: 'int', value: 2 });
  expect(result.cleanup.status).toBe('done');
  await expect(page.getByTestId('run-result')).toContainText('通过');
  await page.screenshot({ path: 'test-results/stage01-workbench.png', fullPage: true });
  await replaceSource(page, wrong);
  await expect(page.getByTestId('source-stale')).toBeVisible();
  const wrongResponse = page.waitForResponse(response => response.url().endsWith('/api/runs') && response.request().method() === 'POST');
  await page.getByTestId('run-button').click();
  expect((await (await wrongResponse).json()).status).toBe('WRONG_ANSWER');
  await expect(page.getByTestId('run-result')).toContainText('答案不正确');
  expect(externalRequests).toEqual([]);
});

test('compiler diagnostics and infinite loop timeout reach the browser', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('lesson-704').click();
  await page.getByTestId('nav-independent').click();
  await expect(page.getByTestId('run-button')).toBeVisible();
  for (const [source, status] of [[syntaxError, 'COMPILE_ERROR'], [infinite, 'TIME_LIMIT']] as const) {
    await replaceSource(page, source);
    const pending = page.waitForResponse(response => response.url().endsWith('/api/runs') && response.request().method() === 'POST');
    await page.getByTestId('run-button').click();
    const result = await (await pending).json();
    expect(result.status).toBe(status);
    if (status === 'COMPILE_ERROR') {
      expect(result.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ fileName: 'Solution.java', line: 3, belongsToStudentSource: true })]));
      await expect(page.getByTestId('run-result')).toContainText('Solution.java');
    } else await expect(page.getByTestId('run-result')).toContainText('超过时间限制');
  }
});

test('editing during real execution marks the old successful result stale and restores new draft', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('lesson-704').click();
  await page.getByTestId('nav-independent').click();
  const slow = correct.replace('int left =', 'try { Thread.sleep(800); } catch (InterruptedException e) { throw new RuntimeException(e); }\n        int left =');
  await replaceSource(page, slow);
  const requestStarted = page.waitForRequest(request => request.url().endsWith('/api/runs') && request.method() === 'POST');
  const pending = page.waitForResponse(response => response.url().endsWith('/api/runs') && response.request().method() === 'POST');
  await page.getByTestId('run-button').click();
  await requestStarted;
  await expect(page.getByTestId('run-button')).toBeDisabled();
  await replaceSource(page, wrong);
  const result = await (await pending).json();
  expect(result.status).toBe('PASSED_LOCAL_TESTS');
  expect(result.sourceHash).toBe(createHash('sha256').update(slow).digest('hex'));
  await expect(page.getByTestId('source-stale')).toBeVisible();
  await page.reload();
  await page.getByTestId('lesson-704').click();
  await page.getByTestId('nav-independent').click();
  await expect(page.getByRole('textbox', { name: /Java 源码/ })).toBeVisible();
  const next = page.waitForRequest(request => request.url().endsWith('/api/runs') && request.method() === 'POST');
  const feedback = page.waitForResponse(response => response.url().endsWith('/api/runs') && response.request().method() === 'POST');
  await page.getByTestId('run-button').click();
  expect((await next).postDataJSON().source).toBe(wrong);
  expect((await (await feedback).json()).status).toBe('WRONG_ANSWER');
});
