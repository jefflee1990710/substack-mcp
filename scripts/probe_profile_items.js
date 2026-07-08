#!/usr/bin/env node
import axios from 'axios';

const token = process.env.SUBSTACK_SESSION_TOKEN;
const userId = process.env.SUBSTACK_USER_ID;
const session = axios.create({
  headers: { Cookie: `substack.sid=${token}; connect.sid=${token};`, Referer: 'https://substack.com/', Accept: 'application/json' },
});

const data = await session.get(`https://substack.com/api/v1/reader/feed/profile/${userId}`, { params: { limit: 20 } });
const items = data.data.items ?? [];
const byType = {};
for (const i of items) {
  const key = `${i.type}:${i.context?.type ?? 'none'}:${i.context?.typeBucket ?? 'none'}`;
  byType[key] = (byType[key] ?? 0) + 1;
}
console.log('types:', byType);
for (const i of items) {
  const c = i.comment;
  if (!c) continue;
  console.log(i.entity_key, i.context?.type, i.context?.typeBucket, 'user', c.user_id, (c.body || '').slice(0, 50));
}
