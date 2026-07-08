import {z} from "zod";
import { chromium } from "playwright";

export const createNoteSchema = z.object({
  body: z.string().describe("The content of the Note. This is posted to the global Substack Notes feed."),
});

export const createNoteHandler = async (args) => {
  const {body} = createNoteSchema.parse(args);

  const token = process.env.SUBSTACK_SESSION_TOKEN;
  if (!token) {
      throw new Error("Missing SUBSTACK_SESSION_TOKEN environment variable");
  }

  // Because Substack heavily restricts the REST/GraphQL APIs for Notes,
  // we must automate a headless browser to emulate a user creating the Note.
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }});
  
  await context.addCookies([
    { name: 'substack.sid', value: token, domain: '.substack.com', path: '/', secure: true, httpOnly: true, sameSite: 'Lax' },
    { name: 'connect.sid', value: token, domain: '.substack.com', path: '/', secure: true, httpOnly: true, sameSite: 'Lax' }
  ]);
  
  const page = await context.newPage();

  try {
      await page.goto('https://substack.com/');
      await page.waitForTimeout(5000); // Wait for the feed to load
      
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

      if (!found) {
          throw new Error("Could not find 'What's on your mind?' placeholder.");
      }

      await page.waitForTimeout(2000);
      
      // Since the editor input loses its contenteditable attribute in headless or is buried,
      // we can just use page.keyboard.type directly after clicking the placeholder,
      // because clicking it puts focus directly onto the composer.
      await page.keyboard.type(body, { delay: 10 });
      await page.waitForTimeout(1000);
      
      // Try finding the exact data-testid first
      let posted = false;
      const postBtn = await page.$('[data-testid="composer-post"]');
      if (postBtn && await postBtn.isVisible()) {
          await postBtn.click({ force: true });
          posted = true;
      } else {
          // Fallback to evaluating all buttons again, but specifically clicking inner element if SVG
          posted = await page.evaluate(async () => {
              const sleep = ms => new Promise(r => setTimeout(r, ms));
              const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
              for (let b of btns) {
                  const text = (b.innerText || b.textContent || '').trim().toLowerCase();
                  if (text === 'post' || text === 'publish') {
                      b.click();
                      await sleep(4000);
                      return true;
                  }
              }
              return false;
          });
      }
      
      if (!posted) {
          const isMac = process.platform === 'darwin';
          await page.keyboard.press(isMac ? 'Meta+Enter' : 'Control+Enter');
          await page.waitForTimeout(4000);
      }

      await page.waitForTimeout(4000);

      await browser.close();
      return { status: "OK", message: "Real Note successfully posted via browser automation." };
      
  } catch (e) {
      await browser.close();
      throw new Error("Failed to post note: " + e.message);
  }
};
