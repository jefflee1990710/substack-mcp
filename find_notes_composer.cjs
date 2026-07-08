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

  page.on('response', async res => {
    const url = res.url();
    const method = res.request().method();
    if (method === 'POST' || method === 'PUT') {
      if (url.includes('/api/v1/')) {
        console.log(`[RESPONSE] ${method} ${url} ${res.status()}`);
      }
    }
  });

  console.log('Navigating to home...');
  await page.goto(`https://substack.com/`);
  await page.waitForTimeout(5000);
  
  // Find placeholder
  const input = await page.$('div:has-text("What\'s on your mind?")');
  if (input) {
     console.log('Clicking composer placeholder');
     const bb = await input.boundingBox();
     if(bb) {
        await page.mouse.click(bb.x + 10, bb.y + 10);
        await page.waitForTimeout(2000);
        
        const ed = await page.$('div[contenteditable="true"]');
        if (ed) {
           console.log('Typing note...');
           await ed.type('This is a test note from API Explorer to find the Note endpoint.');
           await page.waitForTimeout(1000);
           
           const buttons = await page.$$('button');
           for (const b of buttons) {
             const t = await b.textContent();
             if (t && (t.toLowerCase() === 'post')) {
                console.log('Clicking post button');
                await b.click();
                await page.waitForTimeout(5000);
                break;
             }
           }
        }
     }
  }

  await browser.close();
})();
