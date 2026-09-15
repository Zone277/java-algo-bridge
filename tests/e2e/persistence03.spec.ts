import { test, expect, type Page } from '@playwright/test';
import { wrong } from '../fixtures/java.js';

async function paste(page: Page, source: string) {
  await page.getByRole('textbox', { name: /Java 源码/ }).focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(text => navigator.clipboard.writeText(text), source);
  await page.keyboard.press('ControlOrMeta+V');
}
test('typing while the switch flush awaits real SHA does not lose the final edit', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('lesson-704').click();
  await page.getByTestId('nav-independent').click();
  await paste(page, wrong);
  const savedSource = () => page.evaluate(() => JSON.parse(localStorage.getItem('java-algo-bridge:v1:progress:704:704-v1')!).drafts.independent.source as string);
  await expect.poll(savedSource).toBe(wrong);
  // Delay scheduling only: digest values remain real SHA-256 and no execution API is mocked.
  await page.evaluate(() => {
    const original = crypto.subtle.digest.bind(crypto.subtle);
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    crypto.subtle.digest = async (algorithm, data) => { await gate; return original(algorithm, data); };
    (window as unknown as { releaseHash: () => void }).releaseHash = () => { crypto.subtle.digest = original; release(); };
  });
  await page.getByTestId('lesson-206').click();
  await expect(page.getByTestId('lesson-206')).toBeDisabled();
  const latest = '// 最后一次编辑不能因异步切题丢失\n' + wrong;
  await paste(page, latest);
  await page.evaluate(() => (window as unknown as { releaseHash: () => void }).releaseHash());
  await expect(page.getByRole('button', { name: '进入 206 · 反转链表' })).toBeVisible();
  await expect.poll(savedSource).toBe(latest);
  await page.getByTestId('lesson-704').click();
  await page.getByTestId('nav-independent').click();
  await expect.poll(savedSource).toBe(latest);
});

test('unavailable storage preserves micro-lesson memory across unit and lesson navigation', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Storage disabled', 'SecurityError'); };
    Storage.prototype.setItem = () => { throw new DOMException('Storage disabled', 'SecurityError'); };
  });
  await page.goto('/');
  await page.getByTestId('lesson-704').click();
  await page.getByTestId('bridge-J1').click();
  await page.getByTestId('bridge-answer').fill('7');
  await page.getByTestId('bridge-check').click();
  await expect(page.getByTestId('bridge-panel')).toContainText('1 / 8');
  await page.getByTestId('bridge-J2').click();
  await expect(page.getByTestId('bridge-panel')).toContainText('1 / 8');
  await page.getByTestId('bridge-answer').fill('10');
  await page.getByTestId('bridge-check').click();
  await page.getByTestId('bridge-return').click();
  await page.getByTestId('lesson-206').click();
  await page.getByTestId('bridge-J1').click();
  await expect(page.getByTestId('bridge-panel')).toContainText('2 / 8');
  await expect(page.getByTestId('bridge-panel')).toContainText('内存');
});
