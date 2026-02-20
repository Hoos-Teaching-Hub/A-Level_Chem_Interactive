#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const MAP_PATH = '/organic-map.html';
const ROOT_DIR = path.resolve(__dirname, '..');
const ARTIFACT_SUBDIR = 'artifacts/visual';
const ARTIFACT_DIR = path.join(ROOT_DIR, ...ARTIFACT_SUBDIR.split('/'));
const MAP_FILE_PATH = path.join(ROOT_DIR, 'public', 'organic-map.html');
const MAP_FILE_URL = pathToFileURL(MAP_FILE_PATH).toString();
const PUBLIC_FILE_PREFIX = pathToFileURL(path.join(ROOT_DIR, 'public')).toString();

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

async function run() {
  ensureDirectory(ARTIFACT_DIR);

  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch (error) {
    throw new Error(
      'Playwright is not installed. Run "npm install -D playwright" and "npx playwright install chromium" first.',
    );
  }

  let browser;
  const localRequestFailures = [];
  const pageWarnings = [];
  const consoleWarnings = [];

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1600, height: 1000 },
    });
    const page = await context.newPage();

    page.on('requestfailed', (request) => {
      const url = request.url();
      if (url.startsWith(PUBLIC_FILE_PREFIX)) {
        const reason = request.failure() ? request.failure().errorText : 'unknown request failure';
        localRequestFailures.push(`${reason}: ${url}`);
      }
    });
    page.on('pageerror', (error) => {
      pageWarnings.push(String(error));
    });
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleWarnings.push(message.text());
      }
    });

    await page.goto(MAP_FILE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('#mynetwork', { state: 'visible', timeout: 10000 });
    await page.waitForSelector('#infoPanel', { state: 'visible', timeout: 10000 });
    await page.waitForFunction(
      () => Boolean(document.querySelector('#mynetwork canvas') || document.querySelector('#staticMapPreview')),
      { timeout: 12000 },
    );

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'organic-map-overview.png'),
      fullPage: true,
    });

    const panel = page.locator('#infoPanel');
    await panel.screenshot({
      path: path.join(ARTIFACT_DIR, 'organic-map-sidebar.png'),
    });

    const viewModeButton = page.locator('#viewModeBtn');
    const captured = ['organic-map-overview.png', 'organic-map-sidebar.png'];
    if (await viewModeButton.count()) {
      const isButtonEnabled = await viewModeButton.first().isEnabled();
      if (isButtonEnabled) {
        await viewModeButton.first().click();
        await page.waitForFunction(
          () => {
            const button = document.getElementById('viewModeBtn');
            return Boolean(button && button.textContent && button.textContent.trim() === '3D') &&
              (Boolean(document.querySelector('#mynetwork canvas')) || Boolean(document.querySelector('#staticMapPreview')));
          },
          { timeout: 6000 },
        );
        await page.screenshot({
          path: path.join(ARTIFACT_DIR, 'organic-map-2d.png'),
          fullPage: true,
        });
        captured.push('organic-map-2d.png');
      } else {
        console.log('View mode toggle is disabled in this run; skipped 2D screenshot capture.');
      }
    }

    if (localRequestFailures.length) {
      throw new Error(`Local asset request failures:\n${localRequestFailures.join('\n')}`);
    }

    console.log(`Visual smoke screenshots written to ${ARTIFACT_DIR}`);
    console.log(`Captured files: ${captured.join(', ')}`);
    if (pageWarnings.length) {
      console.log('Runtime page errors were observed (non-fatal for smoke run):');
      pageWarnings.forEach((entry) => {
        console.log(`- ${entry}`);
      });
    }
    if (consoleWarnings.length) {
      console.log('Console error entries were observed (non-fatal for smoke run):');
      consoleWarnings.forEach((entry) => {
        console.log(`- ${entry}`);
      });
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

run().catch((error) => {
  console.error('Visual smoke test failed.');
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
