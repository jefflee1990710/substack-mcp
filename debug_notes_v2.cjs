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
              await ed2.fill('Moving averages lag. They tell you what *happened*, not what *will happen*. If your entire system is built on crossing lines, you are trading the past. Build predictive models based on statistical edges instead. #QuantTrading');
              await page.waitForTimeout(1000);
              const buttons = await page.$$('button');
              let posted = false;
              for (const b of buttons) {
                  const text = await b.innerText();
                  if(text.toLowerCase() === 'post') {
                      await b.click({force:true});
                      console.log('✅ Clicked Post!');
                      posted = true;
                      await page.waitForTimeout(4000);
                      break;
                  }
              }
              if (!posted) console.log('❌ Could not find Post button');
          }
      }
      
  } catch (e) {
      console.log('❌ Error:', e.message);
  }

  await browser.close();
})();
