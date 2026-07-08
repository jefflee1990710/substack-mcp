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
      if (url.includes('/api/v1/') && !url.includes('reader/feed')) {
        console.log(`[REQUEST] ${method} ${url}`);
        console.log(req.postData());
      }
    }
  });

  await page.goto(`https://substack.com/`);
  await page.waitForTimeout(5000);
  
  // Directly force click on the exact input coordinates to open the modal
  await page.mouse.click(640, 200); // Guessing around the middle top
  await page.waitForTimeout(2000);
  
  const ed = await page.$('div[contenteditable="true"]');
  if (ed) {
      await ed.type('API test');
      await page.waitForTimeout(1000);
      
      const postBtns = await page.$$('button');
      for (const b of postBtns) {
          const text = await b.innerText();
          if(text.toLowerCase() === 'post') {
              console.log('Found post button, clicking...');
              await b.click({force:true});
              await page.waitForTimeout(5000);
          }
      }
  } else {
     // If clicking arbitrary spot fails, let's inject a script to find and click the exact text
     const found = await page.evaluate(() => {
         const elements = Array.from(document.querySelectorAll('div, span, p'));
         for (let el of elements) {
             if (el.textContent === "What's on your mind?") {
                 el.click();
                 return true;
             }
         }
         return false;
     });
     
     if (found) {
         console.log('Clicked via JS evaluation');
         await page.waitForTimeout(2000);
         const ed2 = await page.$('div[contenteditable="true"]');
         if (ed2) {
             await ed2.type('Testing via JS click');
             await page.waitForTimeout(1000);
             const buttons = await page.$$('button');
             for (const b of buttons) {
                 const text = await b.innerText();
                 if(text.toLowerCase() === 'post') {
                     await b.click({force:true});
                     console.log('Clicked Post!');
                     await page.waitForTimeout(5000);
                 }
             }
         }
     }
  }

  await browser.close();
})();
