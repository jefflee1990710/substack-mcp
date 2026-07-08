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

  page.on('request', req => {
    const url = req.url();
    const method = req.method();
    if (method === 'PUT' && url.includes('/api/v1/drafts/197378210')) {
      console.log(`[REQUEST] ${method} ${url}`);
      console.log(req.postData());
    }
  });

  console.log('Navigating to draft...');
  await page.goto(`https://technerdclub.substack.com/publish/post/197378210`);
  await page.waitForTimeout(5000);
  
  const ed = await page.$('div.ProseMirror');
  if (ed) {
      console.log('Found editor, typing to trigger autosave...');
      await ed.type(' Trigger autosave ');
      await page.waitForTimeout(5000);
  } else {
      console.log('Editor not found');
  }

  await browser.close();
})();
