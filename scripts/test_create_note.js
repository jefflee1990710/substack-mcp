#!/usr/bin/env node
// Integration smoke test for the create_note tool.
//
// Exercises the real Cloudflare-guarded Notes endpoint end-to-end:
//   1. create a Note via createNoteHandler   (the shipped tool)
//   2. assert it returned an OK status + note_id
//   3. delete the Note so the run leaves nothing behind
//   4. assert the delete succeeded
//
// This hits the live Substack API, so it needs real credentials in the env:
//   SUBSTACK_SESSION_TOKEN, SUBSTACK_PUBLICATION_URL, SUBSTACK_USER_ID
//
// Run:  node scripts/test_create_note.js     (or: yarn test:note)
// Exit: 0 = pass, 1 = fail.

import assert from "node:assert/strict";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { createNoteHandler } from "../src/tools/create_note.js";

chromium.use(stealth());

const REQUIRED = ["SUBSTACK_SESSION_TOKEN", "SUBSTACK_PUBLICATION_URL", "SUBSTACK_USER_ID"];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`✗ Missing required env: ${missing.join(", ")}`);
  console.error("  This is a live integration test and needs real Substack credentials.");
  process.exit(1);
}

// Delete a Note by id, reusing the same stealth + cf_clearance path the tool relies on.
async function deleteNote(noteId) {
  const token = process.env.SUBSTACK_SESSION_TOKEN;
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addCookies([
      { name: "substack.sid", value: token, domain: ".substack.com", path: "/", secure: true, httpOnly: true, sameSite: "Lax" },
      { name: "connect.sid", value: token, domain: ".substack.com", path: "/", secure: true, httpOnly: true, sameSite: "Lax" },
    ]);
    const page = await context.newPage();
    await page.goto("https://substack.com/notes", { timeout: 45000, waitUntil: "domcontentloaded" });

    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      if ((await context.cookies()).some((c) => c.name === "cf_clearance")) break;
      await page.waitForTimeout(1000);
    }

    return await page.evaluate(
      async (id) => (await fetch(`https://substack.com/api/v1/comment/${id}`, { method: "DELETE", credentials: "include" })).status,
      noteId,
    );
  } finally {
    await browser.close();
  }
}

async function main() {
  const marker = `create_note smoke test ${new Date().toISOString()} — auto-deleted`;
  console.log("→ creating Note …");
  const t0 = Date.now();

  const result = await createNoteHandler({ body: marker });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`  tool returned in ${elapsed}s:`, JSON.stringify(result));

  // Assertions on the create result.
  assert.equal(result.status, "OK", "expected status OK");
  assert.ok(Number.isFinite(result.note_id), "expected a numeric note_id");
  assert.equal(String(result.user_id), String(process.env.SUBSTACK_USER_ID), "note_id should belong to the configured user");
  console.log(`✓ Note created (id ${result.note_id})`);

  // Clean up: delete the Note we just created.
  console.log("→ deleting the test Note …");
  const delStatus = await deleteNote(result.note_id);
  assert.ok(delStatus >= 200 && delStatus < 300, `expected 2xx from delete, got ${delStatus}`);
  console.log(`✓ Note deleted (HTTP ${delStatus})`);

  console.log("\nPASS — create_note works end-to-end and left nothing behind.");
}

main().catch((err) => {
  console.error("\nFAIL —", err.message);
  process.exit(1);
});
