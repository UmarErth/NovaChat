// Optional integration checks: install Playwright and start `npm run dev` first.
// These tests only send messages to a local development server.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const baseURL = process.env.NOVA_BASE_URL || 'http://127.0.0.1:8787';
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname)) throw new Error('Use a local development server.');
const screenshotDir = process.env.NOVA_SCREENSHOT_DIR;

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.NOVA_BROWSER_CHANNEL ? { channel: process.env.NOVA_BROWSER_CHANNEL } : {}) });
  try {
    const errors = [];
    async function join(user) {
      const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
      const page = await context.newPage();
      const frames = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('websocket', socket => socket.on('framereceived', event => {
        try { frames.push(JSON.parse(String(event.payload))); } catch {}
      }));
      await page.goto(baseURL);
      await page.getByLabel('Your chat name').fill(user);
      await page.getByRole('button', { name: /Let.s chat/ }).click();
      await page.waitForFunction(() => !document.getElementById('message').disabled);
      return { context, page, frames };
    }
    async function openDM(page, user) {
      await page.getByRole('button', { name: /People & messages/ }).click();
      await page.locator('#people-list').getByRole('button', { name: new RegExp('^Message ' + user + ' ·') }).click();
      assert.equal(await page.locator('#conversation-title').textContent(), user);
    }
    async function send(page, text) {
      await page.getByLabel('Message', { exact: true }).fill(text);
      await page.getByRole('button', { name: 'Send', exact: true }).click();
    }
    async function screenshot(page, file) {
      if (!screenshotDir) return;
      fs.mkdirSync(screenshotDir, { recursive: true });
      await page.screenshot({ path: path.join(screenshotDir, file) });
    }
    const a = await join('Moonwalker'), b = await join('River'), observer = await join('Observer');
    const page = a.page;
    for (const [width, height] of [[1366, 900], [1920, 1080], [768, 1024], [375, 740]]) {
      await page.setViewportSize({ width, height });
      assert.deepEqual(await page.locator('#app').boundingBox(), { x: 0, y: 0, width, height });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await page.locator('#app').evaluate(node => getComputedStyle(node).borderRadius), '0px');
    }
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.getByLabel('Message', { exact: true }).fill('A public draft');
    await openDM(page, 'River');
    await send(page, 'Hey River! Want to chat here?');
    await page.locator('.bubble').filter({ hasText: 'Hey River! Want to chat here?' }).waitFor();
    await b.page.locator('#total-unread:not([hidden])').waitFor();
    assert.equal(await b.page.locator('#conversation-title').textContent(), 'Global lounge');
    assert.equal(await b.page.locator('.bubble').count(), 0);
    assert.equal(observer.frames.some(frame => frame.type === 'dm'), false);
    await openDM(b.page, 'Moonwalker');
    await b.page.locator('.bubble').filter({ hasText: 'Hey River! Want to chat here?' }).waitFor();
    assert.equal(await b.page.locator('#total-unread').isVisible(), false);
    await send(b.page, 'Absolutely. This is our own conversation.');
    await page.locator('.bubble').filter({ hasText: 'Absolutely.' }).waitFor();
    await page.getByLabel('Message', { exact: true }).fill('A private draft');
    await page.getByRole('button', { name: '# Global lounge', exact: true }).click();
    assert.equal(await page.getByLabel('Message', { exact: true }).inputValue(), 'A public draft');
    assert.equal(await page.locator('.bubble').count(), 0);
    await send(page, 'Hello to everyone in the lounge!');
    await observer.page.locator('.bubble').filter({ hasText: 'Hello to everyone' }).waitFor();
    await openDM(page, 'River');
    assert.equal(await page.getByLabel('Message', { exact: true }).inputValue(), 'A private draft');
    assert.equal(await page.locator('.bubble').count(), 2);
    await page.getByLabel('Message', { exact: true }).fill('');
    await screenshot(page, 'nova-chat-fullscreen-dm.png');
    await page.setViewportSize({ width: 375, height: 740 });
    await screenshot(page, 'nova-chat-dm-mobile.png');
    // Rename the recipient without changing the private conversation identity.
    await b.page.getByRole('button', { name: 'Settings', exact: true }).click();
    await b.page.getByLabel('Your chat name').fill('River Moon');
    await b.page.getByRole('button', { name: 'Save name' }).click();
    await page.waitForFunction(() => document.getElementById('conversation-title').textContent === 'River Moon');
    await send(page, 'Your new name looks good.');
    await b.page.locator('.bubble').filter({ hasText: 'Your new name looks good.' }).waitFor();
    // Closing the recipient disables sending while keeping the conversation draft.
    await page.getByLabel('Message', { exact: true }).fill('See you when you return.');
    await b.page.close();
    await page.getByText('River Moon is offline. Your draft will stay here until they return.').waitFor();
    assert.equal(await page.getByLabel('Message', { exact: true }).isDisabled(), true);
    const returning = await b.context.newPage();
    await returning.goto(baseURL);
    await page.waitForFunction(() => !document.getElementById('message').disabled);
    assert.equal(await page.getByLabel('Message', { exact: true }).inputValue(), 'See you when you return.');
    assert.equal(await page.locator('#conversation-title').textContent(), 'River Moon');
    assert.equal(observer.frames.some(frame => frame.type === 'dm'), false);
    // A fresh sender hits the same seven-message limit while using only DMs.
    const spam = await join('Speedy');
    await openDM(spam.page, 'Observer');
    for (let i = 1; i <= 7; i++) await send(spam.page, 'Private burst ' + i);
    await spam.page.locator('.message-row').nth(6).waitFor();
    assert.equal(await spam.page.getByLabel('Message', { exact: true }).isDisabled(), true);
    await spam.page.getByRole('button', { name: '# Global lounge', exact: true }).click();
    assert.equal(await spam.page.getByLabel('Message', { exact: true }).isDisabled(), true);
    assert.equal(a.frames.some(frame => frame.type === 'dm' && frame.text.startsWith('Private burst')), false);
    assert.deepEqual(errors, []);
    console.log('PASS: edge-to-edge desktop/tablet/mobile layout; private delivery and replies; no DM frames to outsiders; unread indicators; isolated drafts/history; rename and reconnect continuity; offline state; shared DM/public cooldown; no browser errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
