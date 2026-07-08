// Static MCP resources — capability docs clients can fetch via resources/list + resources/read.

const MIME = "text/markdown; charset=utf-8";

const CATALOG_EN = `# Substack MCP Server — Capability Catalog

This server exposes **23 tools** for automating a Substack publication via undocumented internal APIs.

## Posts & Drafts

| Tool | Description |
|------|-------------|
| \`create_draft_post\` | Create a new draft post (title, subtitle, ProseMirror body). |
| \`get_drafts\` | List unpublished drafts (paginated). |
| \`publish_draft\` | Publish a draft immediately; optional email send. |
| \`delete_draft\` | Delete a draft permanently. |
| \`get_published_posts\` | List published posts (paginated). |
| \`delete_post\` | Delete a published post permanently. |

## Notes & Short Posts

| Tool | Description |
|------|-------------|
| \`create_note\` | Publish a Note to the global Substack Notes feed (browser automation for Cloudflare). |
| \`get_user_notes\` | List Notes authored by a user via \`GET /reader/feed/profile/{user_id}\`. |
| \`get_reader_feed\` | Read your Notes home feed (for-you, subscribed, etc.). |
| \`get_profile_feed\` | Read a user's profile activity (notes, restacks, comments). |
| \`get_comment_thread\` | Read a Note/comment thread with parents and replies. |
| \`reply_to_note\` | Reply to a Note or comment on the global feed. |
| \`restack_item\` | Restack a Note/comment or post to your feed. |

## Post Comments

| Tool | Description |
|------|-------------|
| \`get_post_comments\` | Read reader comments on a published post. |
| \`comment_on_post\` | Leave a reader comment on a published post. |

## Tags

| Tool | Description |
|------|-------------|
| \`get_post_tags\` | List all custom tags in your publication. |
| \`add_tag_to_post\` | Add a tag to a post (creates tag if missing). |

## Publication Settings

| Tool | Description |
|------|-------------|
| \`get_publication\` | Get publication settings and details. |
| \`update_publication\` | Update name, hero_text, logo_url, etc. |
| \`update_payment_settings\` | Update subscription benefits, paywall, founding plan. |

## User Profile & Stats

| Tool | Description |
|------|-------------|
| \`get_user_profile\` | Get your Substack user profile. |
| \`update_user_profile\` | Update name, bio, photo_url. |
| \`get_stats\` | Subscriber count and 90-day growth attribution. |

## Related resources

- \`substack://setup\` — required environment variables
- \`substack://guides/prosemirror\` — how to format post bodies
`;

const CATALOG_ZH_TW = `# Substack MCP 伺服器 — 功能目錄

此伺服器提供 **23 個工具**，透過 Substack 內部 API 自動化管理您的 Publication。

## 內容管理 (Posts & Drafts)

| 工具 | 說明 |
|------|------|
| \`create_draft_post\` | 建立新的文章草稿。 |
| \`get_drafts\` | 獲取所有草稿列表。 |
| \`publish_draft\` | 將指定草稿發佈為正式文章。 |
| \`delete_draft\` | 刪除指定草稿。 |
| \`get_published_posts\` | 獲取已發佈文章列表。 |
| \`delete_post\` | 永久刪除已發佈文章。 |

## 短貼文與 Notes Feed

| 工具 | 說明 |
|------|------|
| \`create_note\` | 發佈 Note 到全球 Substack Notes feed。 |
| \`get_user_notes\` | 列出使用者發佈的 Notes。 |
| \`get_reader_feed\` | 讀取 Notes 首頁 feed（推薦、追蹤中等）。 |
| \`get_profile_feed\` | 讀取使用者個人動態（notes、restack、留言）。 |
| \`get_comment_thread\` | 讀取 Note/留言串與回覆分支。 |
| \`reply_to_note\` | 回覆 Note 或留言。 |
| \`restack_item\` | Restack 一篇 Note 或文章到您的 feed。 |

## 文章留言

| 工具 | 說明 |
|------|------|
| \`get_post_comments\` | 讀取已發佈文章下的讀者留言。 |
| \`comment_on_post\` | 在已發佈文章下留言。 |

## 標籤 (Tags)

| 工具 | 說明 |
|------|------|
| \`get_post_tags\` | 獲取 Publication 所有可用標籤。 |
| \`add_tag_to_post\` | 為文章加上標籤（不存在則自動建立）。 |

## Publication 設定

| 工具 | 說明 |
|------|------|
| \`get_publication\` | 獲取 Publication 詳細設定。 |
| \`update_publication\` | 修改名稱、Logo、描述等設定。 |
| \`update_payment_settings\` | 調整訂閱與付費會員相關設定。 |

## 使用者與數據

| 工具 | 說明 |
|------|------|
| \`get_user_profile\` | 獲取個人帳號資訊。 |
| \`update_user_profile\` | 修改名稱、大頭貼、簡介。 |
| \`get_stats\` | 獲取訂閱人數與來源分析等統計數據。 |

## 相關資源

- \`substack://setup\` — 必要環境變數
- \`substack://guides/prosemirror\` — 文章 body 格式說明
`;

const SETUP = `# Substack MCP — Setup

## Required environment variables

| Variable | Description |
|----------|-------------|
| \`SUBSTACK_PUBLICATION_URL\` | Your publication URL, e.g. \`https://your-pub.substack.com\` |
| \`SUBSTACK_SESSION_TOKEN\` | Session cookie value from \`substack.sid\` or \`connect.sid\` |
| \`SUBSTACK_USER_ID\` | Your numeric Substack user ID |

## Optional

| Variable | Description |
|----------|-------------|
| \`SUBSTACK_USE_CHROME\` | Set to \`1\` to use installed Chrome for \`create_note\` / \`reply_to_note\` (default: bundled Chromium) |

## Auth cookie format

The server sends: \`substack.sid=<token>; connect.sid=<token>;\`

Obtain the token by logging into Substack in a browser and copying the cookie value from DevTools → Application → Cookies.

## Commands

- \`yarn start\` — run MCP server (stdio)
- \`yarn explore [/path]\` — reverse-engineer API endpoints via Playwright
- \`yarn test:note\` — integration test for \`create_note\`
- \`yarn test:reader\` — smoke test for reader feed tools
`;

const PROSEMIRROR_GUIDE = `# ProseMirror Body Format

Substack draft/post \`body\` must be a **ProseMirror JSON document**, not Markdown.

## Minimal example

\`\`\`json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Hello " },
        { "type": "text", "text": "world", "marks": [{ "type": "strong" }] }
      ]
    }
  ]
}
\`\`\`

## Inline marks

Apply formatting as \`marks\` on \`type: "text"\` nodes — never as top-level node types.

Supported marks: \`strong\`, \`em\`, \`code\`, \`link\` (requires \`attrs.href\`).

Wrong (crashes editor): \`{ "type": "code", "text": "..." }\`
Right: \`{ "type": "text", "text": "...", "marks": [{ "type": "code" }] }\`

## Tools using ProseMirror bodies

- \`create_draft_post\` — pass serialized JSON string as \`body\`
- \`create_note\` / \`reply_to_note\` — accept plain text; converted server-side
`;

/** @type {{ uri: string, name: string, description: string, mimeType: string, text: string }[]} */
export const RESOURCES = [
  {
    uri: "substack://catalog",
    name: "Capability Catalog",
    description: "Complete list of all 23 MCP tools grouped by category (English).",
    mimeType: MIME,
    text: CATALOG_EN,
  },
  {
    uri: "substack://catalog/zh-TW",
    name: "功能目錄",
    description: "完整工具列表（繁體中文）。",
    mimeType: MIME,
    text: CATALOG_ZH_TW,
  },
  {
    uri: "substack://setup",
    name: "Setup Guide",
    description: "Required environment variables and authentication.",
    mimeType: MIME,
    text: SETUP,
  },
  {
    uri: "substack://guides/prosemirror",
    name: "ProseMirror Guide",
    description: "How to format post bodies for Substack drafts.",
    mimeType: MIME,
    text: PROSEMIRROR_GUIDE,
  },
];

const byUri = new Map(RESOURCES.map((r) => [r.uri, r]));

export function listResources() {
  return RESOURCES.map(({ uri, name, description, mimeType }) => ({
    uri,
    name,
    description,
    mimeType,
  }));
}

export function readResource(uri) {
  const resource = byUri.get(uri);
  if (!resource) return null;
  return { mimeType: resource.mimeType, text: resource.text };
}
