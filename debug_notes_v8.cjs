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
      if (url.includes('/api/v1/')) {
         if (res.request().method() === 'POST' || res.request().method() === 'PUT') {
             console.log(`[API RESPONSE] ${res.status()} ${url}`);
         }
      }
  });

  try {
      console.log('Navigating to home...');
      await page.goto('https://substack.com/');
      await page.waitForTimeout(5000);
      
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
          console.log('Clicked placeholder');
          await page.waitForTimeout(2000);
          
          await page.keyboard.type('Testing final post button logic #QuantTrading', { delay: 10 });
          await page.waitForTimeout(1000);
          
          const postBtn = await page.$('[data-testid="composer-post"]');
          if (postBtn) {
              console.log('Found composer-post testid, clicking...');
              await postBtn.click({force: true});
              await page.waitForTimeout(5000);
          } else {
              console.log('No data-testid composer-post found!');
          }
      }
      
  } catch (e) {
      console.log('❌ Error:', e.message);
  }

  await browser.close();
})();
