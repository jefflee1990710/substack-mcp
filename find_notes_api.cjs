const { chromium } = require('playwright');
const fs = require('fs');

const TOKEN=fs.readFileSync('/Users/jefflee/.hermes/config.yaml', 'utf8').match(/SUBSTACK_SESSION_TOKEN:\s*(.+)/)[1].replace(/['"]/g, '');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }});
  await context.addCookies([
    { name: 'substack.sid', value: TOKEN, domain: '.substack.com', path: '/', secure: true, httpOnly: true, sameSite: 'Lax' },
    { name: 'connect.sid', value: TOKEN, domain: '.substack.com', path: '/', secure: true, httpOnly: true, sameSite: 'Lax' }
  ]);
  const page = await context.newPage();

  page.on('request', req => {
    const url = req.url();
    const method = req.method();
    if (method === 'POST' || method === 'PUT') {
      if (url.includes('/api/v1/')) {
        console.log(`[REQUEST] ${method} ${url}`);
        console.log(req.postData());
      }
    }
  });

  console.log('Navigating to home...');
  await page.goto(`https://substack.com/`);
  await page.waitForTimeout(5000);
  
  const composer = await page.$('div[contenteditable="true"]');
  if (composer) {
     await composer.click();
     await composer.type('Test note from Playwright automation.');
     await page.waitForTimeout(2000);
     
     const buttons = await page.$$('button');
     for (const b of buttons) {
       const t = await b.textContent();
       if (t && (t.toLowerCase() === 'post' || t.toLowerCase() === 'publish' || t.toLowerCase() === 'note')) {
          console.log('Clicking button:', t);
          await b.click();
          await page.waitForTimeout(5000);
          break;
       }
     }
  } else {
     console.log('No composer found, taking screenshot...');
     await page.screenshot({ path: 'substack_home.png' });
  }

  await browser.close();
})();
