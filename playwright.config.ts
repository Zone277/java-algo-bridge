import { defineConfig } from '@playwright/test';
import { webUrl } from './scripts/ports.js';
export default defineConfig({ testDir: './tests/e2e', timeout: 120000, workers: 1, use: { baseURL: webUrl, headless: true, trace: 'retain-on-failure' }, webServer: { command: 'npm run dev', url: webUrl, timeout: 60000, reuseExistingServer: false } });
