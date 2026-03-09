#!/usr/bin/env node
/**
 * Auto-add Google account to Antigravity proxy.
 * Uses Chrome's existing session (user-data-dir) to skip login.
 *
 * Usage: node auto-add-account.js <email> <password>
 */
const { chromium } = require('playwright');

const PROXY_URL = 'http://127.0.0.1:8090';
const email = process.argv[2];
const password = process.argv[3] || '';

if (!email) {
  console.error('Usage: node auto-add-account.js <email> [password]');
  process.exit(1);
}

async function getOAuthUrl() {
  const resp = await fetch(`${PROXY_URL}/api/auth/url`);
  return resp.json();
}

async function checkAccount(targetEmail) {
  const resp = await fetch(`${PROXY_URL}/api/accounts`);
  const data = await resp.json();
  return data.accounts?.some(a => a.email === targetEmail);
}

async function main() {
  console.log(`[+] Adding: ${email}`);

  if (await checkAccount(email)) {
    console.log(`[✓] Already exists!`);
    return true;
  }

  // Get OAuth URL
  const { url: oauthUrl, state } = await getOAuthUrl();
  console.log(`[+] OAuth state: ${state}`);

  // Launch Chrome with user data dir (has Google sessions)
  console.log('[+] Launching Chrome with existing profile...');
  const browser = await chromium.launchPersistentContext(
    '/home/yedan/.config/google-chrome/Default', {
      headless: true,
      executablePath: '/usr/bin/google-chrome',
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-gpu',
        '--headless=new',
        '--no-first-run',
        '--disable-default-apps',
      ],
      ignoreDefaultArgs: ['--enable-automation'],
    }
  );

  const page = await browser.newPage();

  try {
    console.log('[+] Navigating to OAuth...');
    await page.goto(oauthUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    let currentUrl = page.url();
    console.log(`[+] Page: ${currentUrl.substring(0, 100)}...`);

    // If on account chooser, select the right account
    if (currentUrl.includes('accounts.google.com')) {
      // Try to find and click the target email in account chooser
      try {
        const emailDiv = page.locator(`[data-email="${email}"], div:has-text("${email}")`).first();
        if (await emailDiv.isVisible({ timeout: 5000 })) {
          console.log(`[+] Found ${email} in account chooser, clicking...`);
          await emailDiv.click();
          await page.waitForTimeout(3000);
        }
      } catch (_) {
        console.log('[+] No account chooser, trying login flow...');
      }

      currentUrl = page.url();

      // If we need to enter email
      try {
        const emailInput = page.locator('input[type="email"]');
        if (await emailInput.isVisible({ timeout: 3000 })) {
          console.log('[+] Entering email...');
          await emailInput.fill(email);
          await page.waitForTimeout(500);
          await page.locator('#identifierNext').click();
          await page.waitForTimeout(4000);
        }
      } catch (_) {}

      // If we need to enter password
      try {
        const pwInput = page.locator('input[type="password"]:visible');
        if (await pwInput.isVisible({ timeout: 3000 })) {
          console.log('[+] Entering password...');
          await pwInput.fill(password);
          await page.waitForTimeout(500);
          await page.locator('#passwordNext').click();
          await page.waitForTimeout(5000);
        }
      } catch (_) {}
    }

    // Handle consent screens — try up to 10 times
    for (let attempt = 0; attempt < 10; attempt++) {
      currentUrl = page.url();

      // Success: redirected to callback
      if (currentUrl.includes('localhost:51121') || currentUrl.includes('oauth-callback')) {
        console.log('[+] OAuth callback reached!');
        break;
      }

      // Check if account was auto-added
      if (await checkAccount(email)) {
        console.log(`[✓] Account auto-registered!`);
        await browser.close();
        return true;
      }

      // Try clicking consent buttons
      const buttons = [
        '#submit_approve_access',
        'button:has-text("Allow")',
        'button:has-text("允許")',
        'button:has-text("Continue")',
        'button:has-text("繼續")',
        'button:has-text("Agree")',
        'button:has-text("同意")',
      ];

      for (const sel of buttons) {
        try {
          const btn = page.locator(sel).first();
          if (await btn.isVisible({ timeout: 1000 })) {
            console.log(`[+] Clicking: ${sel}`);
            await btn.click();
            await page.waitForTimeout(2000);
            break;
          }
        } catch (_) {}
      }

      // Check for checkboxes (scope selection)
      try {
        const checkboxes = page.locator('input[type="checkbox"]');
        const count = await checkboxes.count();
        for (let i = 0; i < count; i++) {
          const cb = checkboxes.nth(i);
          if (await cb.isVisible() && !(await cb.isChecked())) {
            await cb.check();
            console.log(`[+] Checked checkbox ${i+1}`);
          }
        }
      } catch (_) {}

      await page.waitForTimeout(2000);
    }

    // Wait for proxy to register the account
    console.log('[+] Waiting for proxy to register...');
    for (let i = 0; i < 20; i++) {
      if (await checkAccount(email)) {
        console.log(`[✓] SUCCESS: ${email} added!`);
        await browser.close();
        return true;
      }
      await new Promise(r => setTimeout(r, 1500));
    }

    // Debug info
    console.log(`[!] Final URL: ${page.url().substring(0, 150)}`);
    await page.screenshot({ path: `/tmp/oauth-${email.split('@')[0]}.png` });
    console.log(`[!] Screenshot: /tmp/oauth-${email.split('@')[0]}.png`);

  } catch (err) {
    console.error(`[!] Error: ${err.message}`);
    await page.screenshot({ path: `/tmp/oauth-err-${email.split('@')[0]}.png` }).catch(() => {});
  } finally {
    await browser.close();
  }

  return await checkAccount(email);
}

main().then(ok => {
  if (ok) {
    console.log(`[✓] Done: ${email}`);
    process.exit(0);
  } else {
    console.error(`[✗] Failed: ${email}`);
    process.exit(1);
  }
}).catch(err => { console.error('Fatal:', err); process.exit(1); });
