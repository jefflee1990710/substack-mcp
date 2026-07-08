# Substack MCP Server

A Model Context Protocol (MCP) Server for [Substack](https://substack.com) enabling LLM clients to interact with Substack's API for automations like creating posts, managing drafts, updating profiles, and more.

[![Docker Pulls](https://img.shields.io/docker/pulls/marcomoauro/substack-mcp.svg)](https://hub.docker.com/r/marcomoauro/substack-mcp)
[![npm downloads](https://img.shields.io/npm/dm/substack-mcp.svg)](https://www.npmjs.com/package/substack-mcp)

## 🛠 Available Tools (24 Tools)

Use **`list_resources`** (tool) or **`resources/list`** (MCP protocol) to discover capability docs:

| URI | Description |
|-----|-------------|
| `substack://catalog` | Full tool catalog (English) |
| `substack://catalog/zh-TW` | 完整功能目錄（繁體中文） |
| `substack://setup` | Environment variables and auth |
| `substack://guides/prosemirror` | Post body format guide |

Fetch content with **`list_resources`** `{ "uri": "substack://catalog/zh-TW" }` or **`resources/read`**.

### Discovery

| Tool Name | Description | Inputs |
|-----------|-------------|--------|
| **`list_resources`** | List capability docs or read one by URI (tool wrapper for clients without resources support). | `uri` (string, opt) |

This server exposes undocumented Substack internal APIs to allow full automation of your publication.

### Posts & Drafts Management

| Tool Name | Description | Inputs |
|-----------|-------------|--------|
| **`create_draft_post`** | Creates a new draft post in your publication. | `title` (string)<br>`subtitle` (string)<br>`body` (string, ProseMirror JSON)<br>*(Markdown must be converted to ProseMirror AST)* |
| **`get_drafts`** | Retrieves a paginated list of all unpublished drafts. | `offset` (number, opt)<br>`limit` (number, opt) |
| **`create_note`** | Creates and publishes a Note to the global Substack Notes feed, optionally with image attachments. | `body` (string)<br>`images` (string[], opt, max 4 — local path, http(s) URL, or data URL) |
| **`get_user_notes`** | Lists Notes authored by a user (from profile activity). | `user_id` (number, opt)<br>`cursor` (string, opt)<br>`limit` (number, opt) |
| **`get_published_posts`** | Retrieves a paginated list of all currently published posts. | `offset` (number, opt)<br>`limit` (number, opt) |
| **`publish_draft`** | Publishes a specific draft immediately to your audience. | `draftId` (string/number)<br>`send` (boolean, def: true)<br>`share_automatically` (boolean, def: false) |
| **`delete_draft`** | Deletes a specific draft permanently. | `draftId` (string/number) |
| **`delete_post`** | Deletes a published post permanently. | `postId` (string/number) |

### Tags Management

| Tool Name | Description | Inputs |
|-----------|-------------|--------|
| **`get_post_tags`** | Retrieves all available custom tags created in your publication. | *None* |
| **`add_tag_to_post`** | Applies a tag to a post. Automatically creates the tag first if it does not exist. | `postId` (string/number)<br>`tagName` (string) |

### Profile & Publication Settings

| Tool Name | Description | Inputs |
|-----------|-------------|--------|
| **`get_publication`** | Gets detailed settings and statistics of your publication (name, bio, features, etc). | *None* |
| **`update_publication`** | Updates your publication's public profile and metadata. | `name` (string, opt)<br>`hero_text` (string, opt)<br>`logo_url` (string, opt) |
| **`get_user_profile`** | Retrieves the author's personal user profile details. | *None* |
| **`update_user_profile`** | Updates the author's user profile details (display name, bio, profile picture). | `name` (string, opt)<br>`bio` (string, opt)<br>`photo_url` (string, opt) |
| **`update_payment_settings`** | Updates publication payment/subscription settings (benefits, paywall, founding plan). | `paid_subscription_benefits` (string[])<br>`free_subscription_benefits` (string[])<br>`founding_plan_enabled` (boolean)... |
| **`get_stats`** | Retrieves the latest statistics for your publication including total subscribers and 90-day growth network attribution. | *None* |

### Notes Feed & Threads

| Tool Name | Description | Inputs |
|-----------|-------------|--------|
| **`get_reader_feed`** | Read your Substack Notes home feed (notes, posts, restacks). | `tab` (string, opt)<br>`cursor` (string, opt)<br>`limit` (number, opt)<br>`include_tabs` (boolean, opt) |
| **`get_profile_feed`** | Read a user's profile activity (notes, restacks, comments). | `user_id` (number, opt)<br>`cursor` (string, opt)<br>`limit` (number, opt) |
| **`get_comment_thread`** | Read a Note/comment and its parent chain + reply branches. | `comment_id` (string/number)<br>`include_replies` (boolean, opt) |
| **`reply_to_note`** | Reply to a Note or comment on the global Notes feed. | `parent_comment_id` (string/number)<br>`body` (string) |
| **`restack_item`** | Restack a Note/comment or post to your feed. | `comment_id` OR `post_id` (one required)<br>`tab_id` (string, opt) |
| **`get_post_comments`** | Read comments left on a published post. | `post_id` (string/number)<br>`limit` (number, opt) |
| **`comment_on_post`** | Leave a reader comment on a published post. | `post_id` (string/number)<br>`body` (string) |


## 🧠 Guideline for LLMs: Converting Markdown to ProseMirror JSON
Substack's API strictly requires the `body` to be a serialized ProseMirror JSON object. **Do not send raw Markdown.** When using `create_draft_post`, the AI must construct the JSON AST.

**Example AST Construction:**
```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "This is " },
        { "type": "text", "text": "bold", "marks": [{ "type": "strong" }] },
        { "type": "text", "text": " and " },
        { "type": "text", "text": "inline code", "marks": [{ "type": "code" }] }
      ]
    },
    {
      "type": "code_block",
      "content": [{ "type": "text", "text": "print('Hello World')" }]
    }
  ]
}
```
*(Marks supported: `strong`, `em`, `code`, `link` (requires `attrs.href`))*

**Warning on Marks**: Do not wrap inline code elements with `type: "code"` at the top level. Inline marks are ALWAYS applied to a `type: "text"` element. e.g. `{"type": "text", "text": "print", "marks": [{"type": "code"}]}`. Doing this incorrectly will crash the Substack editor.

## 📋 Requirements


To use this server, you need three credentials from your Substack account. Here is how to obtain them:

1. **`SUBSTACK_PUBLICATION_URL`**
   - The URL of your publication (e.g., `https://your-pub.substack.com`).

2. **`SUBSTACK_SESSION_TOKEN`**
   - Log into Substack in your browser (Chrome, Edge, or Firefox).
   - Open Developer Tools (Press `F12` or `Right-Click` -> `Inspect`).
   - Go to the **Application** tab (Chrome/Edge) or **Storage** tab (Firefox).
   - In the left sidebar, expand **Cookies** and click on `https://substack.com` (or your publication URL).
   - Find the cookie named **`substack.sid`**.
   - Copy its Value (it usually starts with `s:`). This is your Session Token.

3. **`SUBSTACK_USER_ID`**
   - While still logged in, open Developer Tools and go to the **Network** tab.
   - Refresh the page and filter the requests by typing `self` in the search box.
   - Look for a request to `https://substack.com/api/v1/user/profile/self`.
   - Click on it, go to the **Response** (or Preview) tab, and find the `"id"` field. That numeric value is your User ID.

## 🔌 Installation (Client Configuration)

### 1. Claude Desktop
Add this to your `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "substack-mcp": {
      "command": "node",
      "args": ["/path/to/substack-mcp/src/index.js"],
      "env": {
        "SUBSTACK_PUBLICATION_URL": "https://your.substack.com",
        "SUBSTACK_SESSION_TOKEN": "your-session-token",
        "SUBSTACK_USER_ID": "your-user-id"
      }
    }
  }
}
```

### 2. Cursor
Open Settings -> Features -> MCP Servers.
- **Type**: `command`
- **Name**: `substack-mcp`
- **Command**: `node /path/to/substack-mcp/src/index.js`
Alternatively, edit `.cursor/mcp.json` in your workspace. Ensure you set the 3 environment variables in your system or pass them directly.

### 3. Hermes Agent
Add this to your `~/.hermes/config.yaml`:
```yaml
mcp_servers:
  substack:
    command: node
    args:
    - /path/to/substack-mcp/src/index.js
    env:
      SUBSTACK_PUBLICATION_URL: https://your.substack.com
      SUBSTACK_SESSION_TOKEN: your-session-token
      SUBSTACK_USER_ID: 'your-user-id'
    enabled: true
```

### 4. Running via NPX / Docker
If you prefer not to use the local source files, you can use NPX or Docker:

**NPX:**
```json
{
  "command": "npx",
  "args": ["-y", "substack-mcp@latest"]
}
```

**Docker:**
```json
{
  "command": "docker",
  "args": ["run", "-i", "--rm", "-e", "SUBSTACK_PUBLICATION_URL", "-e", "SUBSTACK_SESSION_TOKEN", "-e", "SUBSTACK_USER_ID", "marcomoauro/substack-mcp:latest"]
}
```

## 🛠 Advanced: API Explorer
This project contains an interactive tool to reverse-engineer new Substack API endpoints:
```bash
yarn explore /publish/settings
yarn explore /notes
```
It launches a Chromium browser with your injected tokens. Any configuration change you make will log the exact API payload and URL to your terminal, allowing you to easily build new MCP tools.

## 🆘 Support
For issues with this MCP Server: Open an issue on [GitHub](https://github.com/marcomoauro/substack-mcp/issues).
