import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";

chromium.use(stealth());

async function launchBrowser() {
  if (process.env.SUBSTACK_USE_CHROME === "1") {
    try {
      return await chromium.launch({ channel: "chrome", headless: true });
    } catch {
      return await chromium.launch({ headless: true });
    }
  }
  return await chromium.launch({ headless: true });
}

// Runs a same-origin fetch on substack.com after obtaining cf_clearance.
// Substack blocks scripted POSTs to /api/v1/comment/feed without it.
export async function fetchViaNotesBrowser(path, { method = "GET", body } = {}) {
  const token = process.env.SUBSTACK_SESSION_TOKEN;
  if (!token) throw new Error("Missing SUBSTACK_SESSION_TOKEN environment variable");

  const browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addCookies([
    { name: "substack.sid", value: token, domain: ".substack.com", path: "/", secure: true, httpOnly: true, sameSite: "Lax" },
    { name: "connect.sid", value: token, domain: ".substack.com", path: "/", secure: true, httpOnly: true, sameSite: "Lax" },
  ]);

  const page = await context.newPage();
  try {
    await page.goto("https://substack.com/notes", { timeout: 45000, waitUntil: "domcontentloaded" });

    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      const cookies = await context.cookies();
      if (cookies.some((c) => c.name === "cf_clearance")) break;
      await page.waitForTimeout(1000);
    }

    const result = await page.evaluate(async ({ path, method, body }) => {
      const res = await fetch(`https://substack.com/api/v1${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
      });
      let json = null;
      try { json = await res.json(); } catch { /* non-JSON */ }
      return { status: res.status, json };
    }, { path, method, body });

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Substack API ${method} ${path} failed (HTTP ${result.status})`);
    }
    return result.json;
  } finally {
    await browser.close();
  }
}
