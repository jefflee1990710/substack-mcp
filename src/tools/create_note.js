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
      
      // Click the "What's on your mind?" placeholder
      await page.click('text="What\'s on your mind?"', { timeout: 10000 });
      await page.waitForTimeout(2000);
      
      const editor = await page.$('[contenteditable="true"]');
      if (!editor) {
          throw new Error("Could not find the Note composer editor.");
      }
      
      // Type the note
      await editor.type(body, { delay: 50 }); // Add slight delay to mimic human typing
      await page.waitForTimeout(1000);
      
      // Find and click the Post button
      const buttons = await page.$$('button');
      let posted = false;
      for (const b of buttons) {
          const text = await b.innerText();
          if (text.toLowerCase() === 'post') {
              await b.click({force: true});
              posted = true;
              await page.waitForTimeout(4000); // Wait for submission to complete
              break;
          }
      }
      
      if (!posted) {
          throw new Error("Found the editor but could not find the Post button.");
      }
      
      await browser.close();
      return { status: "OK", message: "Real Note successfully posted via browser automation." };
      
  } catch (e) {
      await browser.close();
      throw new Error("Failed to post note: " + e.message);
  }
};
