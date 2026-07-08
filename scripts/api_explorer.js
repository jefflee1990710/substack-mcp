import { chromium } from 'playwright';

const TOKEN = process.env.SUBSTACK_SESSION_TOKEN;
const PUB_URL = process.env.SUBSTACK_PUBLICATION_URL;

if (!TOKEN || !PUB_URL) {
  console.error("❌ Missing SUBSTACK_SESSION_TOKEN or SUBSTACK_PUBLICATION_URL in environment variables.");
  console.error("Please ensure they are set in your environment or execution context.");
  process.exit(1);
}

const args = process.argv.slice(2);
// Default to the settings page, but allow overriding via CLI args
const targetPath = args[0] && !args[0].startsWith('--') ? args[0] : '/publish/settings';
const isHeadless = args.includes('--headless');

(async () => {
  console.log(`🚀 Starting Substack API Explorer...`);
  console.log(`📡 Target URL: ${PUB_URL}${targetPath}`);
  console.log(`👀 Mode: ${isHeadless ? 'Headless (Automated)' : 'Interactive UI (Manual)'}`);
  console.log(`\nStarting Chromium...`);
  
  const browser = await chromium.launch({ headless: isHeadless });
  const context = await browser.newContext();

  // Setup authentication cookies for multiple possible Substack domains
  const pubDomain = new URL(PUB_URL).hostname;
  const domains = ['.substack.com', 'substack.com', pubDomain, `.${pubDomain}`];
  
  const cookies = domains.flatMap(d => [
    { name: 'substack.sid', value: TOKEN, domain: d, path: '/', secure: true, httpOnly: true, sameSite: 'Lax' },
    { name: 'connect.sid', value: TOKEN, domain: d, path: '/', secure: true, httpOnly: true, sameSite: 'Lax' }
  ]);
  
  await context.addCookies(cookies);
  const page = await context.newPage();

  // Listen and intercept network requests
  page.on('request', req => {
    const url = req.url();
    const method = req.method();
    
    // We want to capture state-changing API calls (POST/PUT/PATCH/DELETE) targeting the API
    if ((method !== 'OPTIONS' && method !== 'GET') && url.includes('/api/')) {
      console.log(`\n===================================================`);
      console.log(`🔵 [API REQUEST EXPORT]`);
      console.log(`Method : ${method}`);
      console.log(`URL    : ${url}`);
      
      const postData = req.postData();
      if (postData) {
        try {
          // Pretty-print JSON if possible
          console.log(`Payload:`, JSON.stringify(JSON.parse(postData), null, 2));
        } catch (e) {
          console.log(`Payload:`, postData);
        }
      }
      console.log(`===================================================`);
    }
  });

  page.on('response', async res => {
    const url = res.url();
    const method = res.request().method();
    
    if ((method !== 'OPTIONS' && method !== 'GET') && url.includes('/api/')) {
      console.log(`🟢 [API RESPONSE] ${method} ${url} -> Status: ${res.status()}`);
      try {
        const body = await res.json();
        const jsonStr = JSON.stringify(body, null, 2);
        // Truncate response to keep terminal clean
        console.log(`Response Data:`, jsonStr.length > 500 ? jsonStr.substring(0, 500) + '... (truncated)' : jsonStr);
      } catch (e) {
        // ignore non-json responses
      }
    }
  });

  await page.goto(`${PUB_URL}${targetPath}`);
  
  console.log(`\n✅ Navigation complete!`);
  
  if (!isHeadless) {
    console.log(`🖱️  Please interact with the browser window.`);
    console.log(`   Whenever you click a button or save a setting, the exact API call (URL, Method, Payload)`);
    console.log(`   will be printed to this console so you can add it to SubstackApi.js.`);
    console.log(`   Press Ctrl+C here to stop the explorer.\n`);
  } else {
    console.log(`Waiting for automated network events...`);
    await page.waitForTimeout(10000); // Give it 10 seconds in headless mode
    await browser.close();
  }
})();
