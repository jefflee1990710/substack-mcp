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
    if (method === 'POST' || method === 'PUT') {
      if (url.includes('/api/v1/')) {
        console.log(`[REQUEST] ${method} ${url}`);
        console.log(req.postData());
      }
    }
  });

  await page.goto(`https://substack.com/`);
  await page.waitForTimeout(5000);
  
  const ed = await page.$('div[contenteditable="true"]');
  if (ed) {
    console.log('Typing...');
    await ed.type('API test');
    await page.waitForTimeout(2000);
    
    // Find button containing "Post"
    const postBtns = await page.$$('button:has-text("Post")');
    for (const b of postBtns) {
        console.log('Found post button, clicking...');
        await b.click({force:true});
        await page.waitForTimeout(3000);
    }
  } else {
    console.log('No contenteditable found on substack.com');
  }

  await browser.close();
})();
