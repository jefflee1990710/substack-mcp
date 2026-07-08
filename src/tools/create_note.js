import {z} from "zod";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { toImagePayload } from "../utils/image.js";

// Substack Notes sit behind Cloudflare bot management. A plain axios call — or even a
// normal (automation-flagged) Chromium — gets a 403 Cloudflare JS challenge on
// POST /api/v1/comment/feed, regardless of a valid session cookie. The working recipe:
//   1. playwright-extra + stealth to strip the automation fingerprint (navigator.webdriver, etc.)
//   2. navigate a real page first so Cloudflare issues a cf_clearance cookie
//   3. create the Note with an in-page fetch (inherits cf_clearance + session cookies)
chromium.use(stealth());

export const createNoteSchema = z.object({
  body: z.string().min(1).describe("The content of the Note. This is posted to the global Substack Notes feed. Blank lines start new paragraphs."),
  images: z.array(z.string()).max(4).optional().describe("Optional images to attach (max 4). Each item may be a local file path, an http(s) URL, or a data URL."),
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
  const { body, images } = createNoteSchema.parse(args);

  const token = process.env.SUBSTACK_SESSION_TOKEN;
  if (!token) {
    throw new Error("Missing SUBSTACK_SESSION_TOKEN environment variable");
  }

  // Normalize image sources up front (reads local files, validates extensions)
  // so bad input fails before we pay for a browser launch.
  const imagePayloads = (images ?? []).map(toImagePayload);

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

    // Attach images, if any: upload each to Substack's media store, then register
    // it as a comment attachment. Both run as in-page fetches so they inherit the
    // same cf_clearance + session cookies as the Note creation itself.
    const attachmentIds = [];
    for (const image of imagePayloads) {
      const attachment = await page.evaluate(async (img) => {
        const uploadRes = await fetch("https://substack.com/api/v1/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ image: img }),
        });
        let upload = null;
        try { upload = await uploadRes.json(); } catch { /* non-JSON */ }
        if (!uploadRes.ok || !upload?.url) {
          return { error: `image upload failed (HTTP ${uploadRes.status})` };
        }
        const attachRes = await fetch("https://substack.com/api/v1/comment/attachment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ type: "image", url: upload.url }),
        });
        let attach = null;
        try { attach = await attachRes.json(); } catch { /* non-JSON */ }
        if (!attachRes.ok || !attach?.id) {
          return { error: `attachment creation failed (HTTP ${attachRes.status})` };
        }
        return { id: attach.id, imageUrl: attach.imageUrl };
      }, image);
      if (attachment.error) {
        throw new Error(attachment.error);
      }
      attachmentIds.push(attachment.id);
    }

    // Create the Note via an in-page fetch so it inherits cf_clearance + session cookies.
    const result = await page.evaluate(async ({ bodyJson, attachmentIds }) => {
      const payload = {
        bodyJson,
        tabId: "for-you",
        surface: "feed",
        replyMinimumRole: "everyone",
      };
      if (attachmentIds.length) payload.attachmentIds = attachmentIds;
      const res = await fetch("https://substack.com/api/v1/comment/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      let json = null;
      try { json = await res.json(); } catch { /* non-JSON (e.g. Cloudflare challenge HTML) */ }
      return { status: res.status, json };
    }, { bodyJson: buildBodyJson(body), attachmentIds });

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
      attachment_count: attachmentIds.length || undefined,
    };
  } catch (e) {
    await browser.close();
    throw new Error("Failed to post note: " + e.message);
  }
};
