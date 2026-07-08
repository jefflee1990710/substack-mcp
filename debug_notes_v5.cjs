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
          console.log('Clicked placeholder');
          await page.waitForTimeout(2000);
          
          await page.keyboard.type('Another test note using event dispatch API', { delay: 10 });
          await page.waitForTimeout(1000);
          
          await page.screenshot({ path: '/Users/jefflee/Projects/substack-mcp/typing_v5.png' });
          
          const posted = await page.evaluate(async () => {
              const sleep = ms => new Promise(r => setTimeout(r, ms));
              const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
              for (let b of btns) {
                  const text = (b.innerText || b.textContent || '').trim().toLowerCase();
                  if (text === 'post' || text === 'publish') {
                      b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                      b.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                      b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                      await sleep(4000);
                      return true;
                  }
              }
              return false;
          });
          
          await page.screenshot({ path: '/Users/jefflee/Projects/substack-mcp/after_post_v5.png' });
          console.log('Posted status via evaluate:', posted);
      }
      
  } catch (e) {
      console.log('❌ Error:', e.message);
  }

  await browser.close();
})();
