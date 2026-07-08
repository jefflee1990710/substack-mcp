#!/usr/bin/env node
// Probe Substack endpoints for listing a user's notes.
import axios from 'axios';

const token = process.env.SUBSTACK_SESSION_TOKEN;
const userId = process.env.SUBSTACK_USER_ID;
const handle = process.argv[2] || 'technerdclub';
if (!token || !userId) { console.error('need SUBSTACK_SESSION_TOKEN and SUBSTACK_USER_ID'); process.exit(1); }

const session = axios.create({
  headers: {
    Cookie: `substack.sid=${token}; connect.sid=${token};`,
    Referer: 'https://substack.com/notes',
    Accept: 'application/json',
  },
});

async function probe(label, url, params) {
  try {
    const res = await session.get(url, { params });
    const d = res.data;
    let noteCount = 0;
    if (Array.isArray(d)) noteCount = d.length;
    else if (Array.isArray(d.items)) {
      noteCount = d.items.filter((i) =>
        i.type === 'comment' && (i.context?.typeBucket === 'notes' || i.context?.type === 'note')
      ).length;
    } else if (Array.isArray(d.notes)) noteCount = d.notes.length;
    console.log(`\n✅ ${label} (${res.status}) keys=${Object.keys(d).join(',')} notes=${noteCount}`);
    if (d.items?.[0]) console.log('  sample:', d.items[0].entity_key, d.items[0].context?.type, d.items[0].comment?.body?.slice(0, 60));
    return d;
  } catch (e) {
    const st = e.response?.status;
    const isHtml = typeof e.response?.data === 'string' && e.response.data.startsWith('<!');
    console.log(`\n❌ ${label} (${st ?? 'err'}) ${isHtml ? 'HTML' : JSON.stringify(e.response?.data ?? e.message).slice(0, 120)}`);
    return null;
  }
}

const base = 'https://substack.com/api/v1';
await probe('reader/feed/profile/{user_id}', `${base}/reader/feed/profile/${userId}`, { limit: 10 });
await probe('reader/feed/profile + type=notes', `${base}/reader/feed/profile/${userId}`, { limit: 10, type: 'notes' });
await probe('user public notes', `${base}/user/${userId}-${handle}/notes`, { limit: 10 });
await probe('user public profile notes', `${base}/user/${userId}-${handle}/public_profile/notes`, {});
await probe('notes', `${base}/notes`, { limit: 10 });
await probe('comment/user', `${base}/comment/user/${userId}`, { limit: 10 });
await probe('feed/drafts', `${base}/feed/drafts`, { limit: 5 });
