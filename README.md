# Substack MCP Server

A Model Context Protocol (MCP) Server for [Substack](https://substack.com) enabling LLM clients to interact with Substack's API for automations like creating posts, managing drafts, updating profiles, and more.

[![Docker Pulls](https://img.shields.io/docker/pulls/marcomoauro/substack-mcp.svg)](https://hub.docker.com/r/marcomoauro/substack-mcp)
[![npm downloads](https://img.shields.io/npm/dm/substack-mcp.svg)](https://www.npmjs.com/package/substack-mcp)

## 🛠 Available Tools (16 Tools)

This server exposes undocumented Substack internal APIs to allow full automation of your publication.

### Posts & Drafts Management

| Tool Name | Description | Inputs |
|-----------|-------------|--------|
| **`create_draft_post`** | Creates a new draft post in your publication. | `title` (string)<br>`subtitle` (string)<br>`body` (string, ProseMirror JSON)<br>*(Markdown must be converted to ProseMirror AST)* |
| **`get_drafts`** | Retrieves a paginated list of all unpublished drafts. | `offset` (number, opt)<br>`limit` (number, opt) |
| **`create_short_post`** | Creates and instantly publishes a short-form post (acting exactly like a Substack Note). | `body` (string)<br>`hide_from_feed` (boolean) |
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


## 🧠 Guideline for LLMs: Converting Markdown to ProseMirror JSON
Substack's API strictly requires the `body` to be a serialized ProseMirror JSON object. **Do not send raw Markdown.** When using `create_draft_post` or `create_short_post`, the AI must construct the JSON AST.

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
```
It launches a Chromium browser with your injected tokens. Any configuration change you make will log the exact API payload and URL to your terminal, allowing you to easily build new MCP tools.

## 🆘 Support
For issues with this MCP Server: Open an issue on [GitHub](https://github.com/marcomoauro/substack-mcp/issues).
