const { chromium } = require('playwright');
const fs = require('fs');
const token = fs.readFileSync('/Users/jefflee/.hermes/config.yaml', 'utf8').match(/SUBSTACK_SESSION_TOKEN:\s*(.+)/)[1].replace(/['"]/g, '');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }});
  await context.addCookies([
    { name: 'substack.sid', value: token, domain: '.substack.com', path: '/', secure: true, httpOnly: true, sameSite: 'Lax' },
    { name: 'connect.sid', value: token, domain: '.substack.com', path: '/', secure: true, httpOnly: true, sameSite: 'Lax' }
  ]);
  const page = await context.newPage();

  page.on('response', async res => {
    const url = res.url();
    const method = res.request().method();
    if (method === 'POST' || method === 'PUT') {
      if (url.includes('/api/v1/drafts')) {
        console.log(`[RESPONSE] ${method} ${url} ${res.status()}`);
        console.log(await res.text());
      }
    }
  });

  console.log('Navigating to composer...');
  await page.goto('https://technerdclub.substack.com/publish/post?type=note');
  await page.waitForTimeout(5000);

  const ed = await page.$('div[contenteditable="true"]');
  if (ed) {
      console.log('Typing note...');
      await ed.type('Testing Substack Note creation via internal API simulation.');
      await page.waitForTimeout(1000);
      const post = await page.$('button:has-text("Post")');
      if (post) {
         console.log('Clicking post button');
         await post.click();
         await page.waitForTimeout(3000);
      }
  }

  await browser.close();
})();
