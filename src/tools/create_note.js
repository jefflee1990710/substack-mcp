import {z} from "zod";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";

// Substack Notes sit behind Cloudflare bot management. A plain axios call — or even a
// normal (automation-flagged) Chromium — gets a 403 Cloudflare JS challenge on
// POST /api/v1/comment/feed, regardless of a valid session cookie. The working recipe:
//   1. playwright-extra + stealth to strip the automation fingerprint (navigator.webdriver, etc.)
//   2. navigate a real page first so Cloudflare issues a cf_clearance cookie
//   3. create the Note with an in-page fetch (inherits cf_clearance + session cookies)
chromium.use(stealth());

export const createNoteSchema = z.object({
  body: z.string().min(1).describe("The content of the Note. This is posted to the global Substack Notes feed. Blank lines start new paragraphs."),
});

// Build the ProseMirror doc Substack's Notes composer sends. Blank lines split paragraphs.
function buildBodyJson(body) {
  const paragraphs = body.split(/\n{2,}/).map((chunk) => chunk.trim()).filter(Boolean);
  const content = (paragraphs.length ? paragraphs : [body]).map((text) => ({
    type: "paragraph",
    content: [{ type: "text", text }],
  }));
  return { type: "doc", attrs: { schemaVersion: "v1", title: null }, content };
}

export const createNoteHandler = async (args) => {
  const { body } = createNoteSchema.parse(args);

  const token = process.env.SUBSTACK_SESSION_TOKEN;
  if (!token) {
    throw new Error("Missing SUBSTACK_SESSION_TOKEN environment variable");
  }

  // Bundled Chromium passes Cloudflare once stealth + cf_clearance are in place, and it
  // starts much faster than a real-Chrome cold launch — so it is the default. Set
  // SUBSTACK_USE_CHROME=1 to use the installed Google Chrome instead (falls back to bundled).
  let browser;
  if (process.env.SUBSTACK_USE_CHROME === "1") {
    try {
      browser = await chromium.launch({ channel: "chrome", headless: true });
    } catch {
      browser = await chromium.launch({ headless: true });
    }
  } else {
    browser = await chromium.launch({ headless: true });
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addCookies([
    { name: "substack.sid", value: token, domain: ".substack.com", path: "/", secure: true, httpOnly: true, sameSite: "Lax" },
    { name: "connect.sid", value: token, domain: ".substack.com", path: "/", secure: true, httpOnly: true, sameSite: "Lax" },
  ]);

  const page = await context.newPage();

  try {
    // Load a real Substack page so Cloudflare's JS challenge runs and issues cf_clearance.
    await page.goto("https://substack.com/notes", { timeout: 45000, waitUntil: "domcontentloaded" });

    // Wait (up to ~20s) for the cf_clearance cookie the Notes endpoint requires.
    const deadline = Date.now() + 20000;
    let cleared = false;
    while (Date.now() < deadline) {
      const cookies = await context.cookies();
      if (cookies.some((c) => c.name === "cf_clearance")) { cleared = true; break; }
      await page.waitForTimeout(1000);
    }
    if (!cleared) {
      // Occasionally cf_clearance is not set but the request still passes; continue and let the POST decide.
      await page.waitForTimeout(2000);
    }

    // Create the Note via an in-page fetch so it inherits cf_clearance + session cookies.
    const result = await page.evaluate(async (bodyJson) => {
      const res = await fetch("https://substack.com/api/v1/comment/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          bodyJson,
          tabId: "for-you",
          surface: "feed",
          replyMinimumRole: "everyone",
        }),
      });
      let json = null;
      try { json = await res.json(); } catch { /* non-JSON (e.g. Cloudflare challenge HTML) */ }
      return { status: res.status, json };
    }, buildBodyJson(body));

    if (result.status < 200 || result.status >= 300 || !result.json?.id) {
      throw new Error(
        `Substack rejected the Note (HTTP ${result.status}). This usually means Cloudflare blocked the request ` +
        `(no valid cf_clearance) or the session token is invalid/expired.`
      );
    }

    const note = result.json;
    await browser.close();
    return {
      status: "OK",
      message: "Note published to the Substack Notes feed.",
      note_id: note.id,
      user_id: note.user_id,
      date: note.date,
      url: note.id ? `https://substack.com/@me/note/c-${note.id}` : undefined,
    };
  } catch (e) {
    await browser.close();
    throw new Error("Failed to post note: " + e.message);
  }
};
