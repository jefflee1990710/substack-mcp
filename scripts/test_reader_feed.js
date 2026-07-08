#!/usr/bin/env node
// Smoke test for reader feed MCP tools (read-only).
import { getReaderFeedHandler } from "../src/tools/get_reader_feed.js";
import { getProfileFeedHandler } from "../src/tools/get_profile_feed.js";
import { getUserNotesHandler } from "../src/tools/get_user_notes.js";
import { getCommentThreadHandler } from "../src/tools/get_comment_thread.js";

const REQUIRED = ["SUBSTACK_SESSION_TOKEN", "SUBSTACK_PUBLICATION_URL", "SUBSTACK_USER_ID"];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("Missing env:", missing.join(", "));
  process.exit(1);
}

const feed = await getReaderFeedHandler({ limit: 2, include_tabs: true });
console.log("get_reader_feed:", feed.count, "items, tabs:", feed.available_tabs?.length);

const profile = await getProfileFeedHandler({ limit: 2 });
console.log("get_profile_feed:", profile.count, "items");

const notes = await getUserNotesHandler({ limit: 3 });
console.log("get_user_notes:", notes.count, "notes");
if (notes.notes?.[0]) console.log("  latest:", notes.notes[0].body?.slice(0, 60));

const noteId = notes.notes?.[0]?.id ?? profile.items?.[0]?.comment?.id ?? feed.items?.[0]?.comment?.id;
if (noteId) {
  const thread = await getCommentThreadHandler({ comment_id: noteId, include_replies: true });
  console.log("get_comment_thread:", thread.entity_key, "replies:", thread.reply_branches?.length ?? 0);
}

console.log("PASS");
