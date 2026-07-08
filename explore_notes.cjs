const { chromium } = require('playwright');
const fs = require('fs');

const TOKEN = fs.readFileSync('/Users/jefflee/.hermes/config.yaml', 'utf8').match(/SUBSTACK_SESSION_TOKEN:\s*(.+)/)[1].replace(/['"]/g, '');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const domains = ['.substack.com', 'substack.com'];
  const cookies = [];
  for (const d of domains) {
    cookies.push({ name: 'substack.sid', value: TOKEN, domain: d, path: '/', secure: true, httpOnly: true, sameSite: 'Lax' });
    cookies.push({ name: 'connect.sid', value: TOKEN, domain: d, path: '/', secure: true, httpOnly: true, sameSite: 'Lax' });
  }

  await context.addCookies(cookies);
  const page = await context.newPage();

  page.on('request', req => {
    const url = req.url();
    const method = req.method();
    if ((method === 'POST' || method === 'PUT') && url.includes('/api/v1/')) {
      console.log(`[REQUEST] ${method} ${url}`);
      console.log(req.postData());
    }
  });

  page.on('response', async res => {
    const url = res.url();
    const method = res.request().method();
    if ((method === 'POST' || method === 'PUT') && url.includes('/api/v1/')) {
      console.log(`[RESPONSE] ${res.status()} ${url}`);
    }
  });

  console.log('Navigating to notes...');
  await page.goto(`https://substack.com/notes`);
  await page.waitForTimeout(5000);
  
  console.log('Looking for note editor...');
  // Find the contenteditable div for the note
  const editor = await page.$('div.ProseMirror[contenteditable="true"]');
  if (editor) {
    await editor.click();
    await editor.type('This is a test note from API Explorer.');
    await page.waitForTimeout(1000);
    // Find the post button
    const buttons = await page.$$('button');
    for (const b of buttons) {
      const text = await b.textContent();
      if (text && text.toLowerCase().includes('post') && await b.isVisible()) {
        console.log('Clicking Post button...');
        await b.click();
        await page.waitForTimeout(3000);
        break;
      }
    }
  } else {
    console.log('Editor not found. Saving screenshot.');
    await page.screenshot({ path: 'notes_failed.png' });
  }

  await browser.close();
})();
