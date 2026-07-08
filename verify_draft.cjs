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

  console.log('Navigating to draft...');
  await page.goto(`https://technerdclub.substack.com/publish/post/199968775`);
  await page.waitForTimeout(5000);
  
  await page.screenshot({ path: '/Users/jefflee/Projects/substack-mcp/draft_199968775.png' });
  console.log('Screenshot saved to draft_199968775.png');

  await browser.close();
})();
