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

  console.log('Navigating to home...');
  await page.goto(`https://substack.com/`);
  await page.waitForTimeout(5000);
  
  try {
      console.log('Clicking placeholder...');
      await page.click('text="What\'s on your mind?"');
      await page.waitForTimeout(2000);
      
      const ed2 = await page.$('[contenteditable="true"]');
      if (ed2) {
          console.log('Typing note...');
          await ed2.type('Hello Substack Notes from proper Playwright integration!');
          await page.waitForTimeout(1000);
          
          const buttons = await page.$$('button');
          for (const b of buttons) {
              const text = await b.innerText();
              if(text.toLowerCase() === 'post') {
                  await b.click({force:true});
                  console.log('Clicked Post!');
                  await page.waitForTimeout(4000);
                  break;
              }
          }
      } else {
          console.log('No contenteditable found');
      }
  } catch(e) {
      console.log('Error:', e.message);
  }

  await browser.close();
})();
