import { defineConfig } from '@playwright/test';

const databaseUrl = process.env.QUALY_TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error('Set QUALY_TEST_DATABASE_URL to a migrated test database before running browser tests.');
}

const port = '44321';
const baseURL = 'http://127.0.0.1:' + port;

export default defineConfig({
  testDir: './test/e2e',
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.GITHUB_ACTIONS ? 'github' : 'list',
  use: {
    baseURL,
    browserName: 'chromium',
    launchOptions: { executablePath: process.env.QUALY_TEST_CHROMIUM },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm start',
    url: baseURL + '/api/state',
    reuseExistingServer: false,
    env: {
      DATABASE_URL: databaseUrl,
      QUALY_ORIGIN: '',
      QUALY_HOST: '127.0.0.1',
      QUALY_LOCAL_PG_DATA: '',
      VERCEL: '0',
      PORT: port,
    },
  },
});
