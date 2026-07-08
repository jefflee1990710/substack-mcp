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
    if (url.includes('/api/v1/') && !url.includes('sentry') && !url.includes('reader')) {
      console.log(`[RESPONSE] ${method} ${url} ${res.status()}`);
    }
  });

  console.log('Navigating to stats dashboard...');
  await page.goto(`https://technerdclub.substack.com/publish/subscribers`);
  await page.waitForTimeout(3000);
  
  await page.goto(`https://technerdclub.substack.com/publish/stats`);
  await page.waitForTimeout(3000);

  await browser.close();
})();
