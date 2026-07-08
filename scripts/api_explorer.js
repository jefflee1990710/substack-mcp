import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

// --- Session recording (JSONL) ---
// Every user action (click/change/submit), every /api/ request (GET included),
// every response and navigation is appended to exploration_logs/session-*.jsonl,
// so a full exploration session can be replayed/analyzed offline to build new tools.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, '..', 'exploration_logs');
fs.mkdirSync(LOG_DIR, { recursive: true });

const sessionStamp = new Date().toISOString().replace(/[:.]/g, '-');
const LOG_FILE = path.join(LOG_DIR, `session-${sessionStamp}.jsonl`);

const MAX_BODY_CHARS = 50_000;
const SENSITIVE_HEADERS = ['cookie', 'authorization', 'set-cookie'];

let seq = 0;
let lastAction = null;
const counters = { actions: 0, requests: 0, responses: 0, navigations: 0 };

function record(entry) {
  entry.seq = ++seq;
  entry.ts = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  return entry.seq;
}

function redactHeaders(headers) {
  const out = {};
  for (const [k, v] of Object.entries(headers || {})) {
    out[k] = SENSITIVE_HEADERS.includes(k.toLowerCase()) ? '<redacted>' : v;
  }
  return out;
}

function isSubstackApi(url) {
  try {
    const host = new URL(url).hostname;
    return url.includes('/api/') && (host.endsWith('substack.com') || host === new URL(PUB_URL).hostname);
  } catch {
    return false;
  }
}

function parseMaybeJson(str) {
  if (!str) return undefined;
  try { return JSON.parse(str); } catch { return str.slice(0, 2000); }
}

function summarizeAction(action) {
  if (!action) return null;
  const t = action.target || {};
  const label = t.testId ? `[data-testid=${t.testId}]` : (t.text ? `"${t.text}"` : (t.id ? `#${t.id}` : ''));
  return `${action.event} → ${t.tag || '?'} ${label}`.trim();
}

(async () => {
  console.log(`🚀 Starting Substack API Explorer...`);
  console.log(`📡 Target URL: ${PUB_URL}${targetPath}`);
  console.log(`👀 Mode: ${isHeadless ? 'Headless (Automated)' : 'Interactive UI (Manual)'}`);
  console.log(`📼 Recording session to: ${LOG_FILE}`);
  console.log(`\nStarting Chromium...`);

  record({ type: 'session_start', target: `${PUB_URL}${targetPath}`, headless: isHeadless });

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

  // --- User action capture ---
  // Clicks, field changes and form submits inside the page are reported back here,
  // so each recorded API call can be correlated with the UI action that triggered it.

  await context.exposeBinding('__recordUserAction', (source, action) => {
    counters.actions++;
    const actionSeq = record({ type: 'action', page: source.page.url(), ...action });
    lastAction = { ...action, seq: actionSeq };
    console.log(`🖱️  [ACTION] ${summarizeAction(action)}`);
  });

  await context.addInitScript(() => {
    const describe = (el) => {
      if (!el || !el.tagName) return null;
      const d = { tag: el.tagName.toLowerCase() };
      if (el.id) d.id = el.id;
      const testId = el.getAttribute && el.getAttribute('data-testid');
      if (testId) d.testId = testId;
      if (typeof el.className === 'string' && el.className) d.classes = el.className.split(/\s+/).slice(0, 5).join(' ');
      const text = (el.innerText || el.value || '').trim().slice(0, 80);
      if (text) d.text = text;
      if (el.href) d.href = el.href;
      if (el.name) d.name = el.name;
      if (el.type) d.inputType = el.type;
      return d;
    };

    document.addEventListener('click', (e) => {
      const el = (e.target.closest && e.target.closest('button, a, [role="button"], input, select, [data-testid]')) || e.target;
      window.__recordUserAction({ event: 'click', target: describe(el) });
    }, true);

    document.addEventListener('change', (e) => {
      const el = e.target;
      window.__recordUserAction({
        event: 'change',
        target: describe(el),
        value: String(el.value ?? '').slice(0, 120),
      });
    }, true);

    document.addEventListener('submit', (e) => {
      window.__recordUserAction({ event: 'submit', target: describe(e.target) });
    }, true);
  });

  // --- Network capture: ALL /api/ traffic, every method (GET included) ---
  // Listening at the context level also covers popups / new tabs.

  context.on('request', (req) => {
    const url = req.url();
    const method = req.method();
    if (method === 'OPTIONS' || !isSubstackApi(url)) return;

    counters.requests++;
    const entry = {
      type: 'request',
      method,
      url,
      resourceType: req.resourceType(),
      headers: redactHeaders(req.headers()),
      triggeredBy: lastAction ? { seq: lastAction.seq, summary: summarizeAction(lastAction) } : null,
    };

    const postData = req.postData();
    if (postData) entry.payload = parseMaybeJson(postData);

    record(entry);

    if (method === 'GET') {
      console.log(`⚪ [GET] ${url}`);
    } else {
      console.log(`\n===================================================`);
      console.log(`🔵 [API REQUEST]`);
      console.log(`Method : ${method}`);
      console.log(`URL    : ${url}`);
      if (lastAction) console.log(`Action : ${summarizeAction(lastAction)}`);
      if (postData) {
        try {
          console.log(`Payload:`, JSON.stringify(JSON.parse(postData), null, 2));
        } catch {
          console.log(`Payload:`, postData);
        }
      }
      console.log(`===================================================`);
    }
  });

  context.on('response', async (res) => {
    const url = res.url();
    const method = res.request().method();
    if (method === 'OPTIONS' || !isSubstackApi(url)) return;

    counters.responses++;
    const entry = { type: 'response', method, url, status: res.status() };

    try {
      const raw = JSON.stringify(await res.json());
      entry.body = raw.length > MAX_BODY_CHARS
        ? { _truncated: true, _totalChars: raw.length, preview: raw.slice(0, MAX_BODY_CHARS) }
        : JSON.parse(raw);
    } catch {
      // non-JSON response body: record content-type only
      const contentType = await res.headerValue('content-type').catch(() => null);
      if (contentType) entry.contentType = contentType;
    }

    record(entry);

    if (method !== 'GET') {
      console.log(`🟢 [API RESPONSE] ${method} ${url} -> Status: ${res.status()}`);
      if (entry.body !== undefined) {
        const jsonStr = JSON.stringify(entry.body, null, 2);
        console.log(`Response Data:`, jsonStr.length > 500 ? jsonStr.substring(0, 500) + '... (truncated)' : jsonStr);
      }
    }
  });

  context.on('page', (page) => {
    page.on('framenavigated', (frame) => {
      if (frame !== page.mainFrame()) return;
      counters.navigations++;
      console.log(`🧭 [NAVIGATE] ${frame.url()}`);
      record({ type: 'navigation', url: frame.url() });
    });
  });

  const printSummary = () => {
    console.log(`\n📊 Session summary`);
    console.log(`   Actions recorded : ${counters.actions}`);
    console.log(`   API requests     : ${counters.requests}`);
    console.log(`   API responses    : ${counters.responses}`);
    console.log(`   Navigations      : ${counters.navigations}`);
    console.log(`📼 Full recording: ${LOG_FILE}`);
  };

  process.on('SIGINT', async () => {
    record({ type: 'session_end', counters });
    printSummary();
    await browser.close().catch(() => {});
    process.exit(0);
  });

  const page = await context.newPage();
  await page.goto(`${PUB_URL}${targetPath}`);

  console.log(`\n✅ Navigation complete!`);

  if (!isHeadless) {
    console.log(`🖱️  Please interact with the browser window.`);
    console.log(`   Every click/change/submit and EVERY /api/ call (GET included) is being recorded`);
    console.log(`   to the JSONL session file, with each request tagged by the action that triggered it.`);
    console.log(`   Non-GET calls are also printed here so you can add them to SubstackApi.js.`);
    console.log(`   Press Ctrl+C here to stop the explorer.\n`);
  } else {
    console.log(`Waiting for automated network events...`);
    await page.waitForTimeout(10000); // Give it 10 seconds in headless mode
    record({ type: 'session_end', counters });
    printSummary();
    await browser.close();
  }
})();
