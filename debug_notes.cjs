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

  try {
      console.log('Navigating to home...');
      await page.goto('https://substack.com/');
      await page.waitForTimeout(5000);
      
      const ed = await page.$('[contenteditable="true"]');
      if (ed) {
          console.log('Typing note explicitly...');
          await ed.click();
          await ed.fill('Moving averages lag. They tell you what *happened*, not what *will happen*. If your entire system is built on crossing lines, you are trading the past. Build predictive models based on statistical edges instead. #QuantTrading');
          await page.waitForTimeout(1000);
          
          const postBtns = await page.$$('button');
          for (const b of postBtns) {
              const text = await b.innerText();
              if(text.toLowerCase() === 'post') {
                  console.log('Clicking post...');
                  await b.click({force:true});
                  await page.waitForTimeout(5000);
                  console.log('✅ Clicked Post button via debug script');
                  break;
              }
          }
      } else {
          console.log('Could not find contenteditable');
      }
      
  } catch (e) {
      console.log('❌ Error:', e.message);
  }

  await browser.close();
})();
