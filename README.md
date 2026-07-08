# Substack MCP Server

A Model Context Protocol (MCP) Server for [Substack](https://substack.com) enabling LLM clients to interact with Substack's API for automations like creating posts, managing drafts, updating profiles, and more.

[![Docker Pulls](https://img.shields.io/docker/pulls/marcomoauro/substack-mcp.svg)](https://hub.docker.com/r/marcomoauro/substack-mcp)
[![npm downloads](https://img.shields.io/npm/dm/substack-mcp.svg)](https://www.npmjs.com/package/substack-mcp)

## 🛠 Available Tools (11 Tools)

This server exposes undocumented Substack internal APIs to allow full automation of your publication.

### Posts & Drafts Management
<details>
<summary><strong>create_draft_post</strong> - Create a new draft post</summary>

**Inputs**:
- `title` (string): Title of the post
- `subtitle` (string): Subtitle of the post
- `body` (string): Body of the post (ProseMirror JSON string format)
</details>

<details>
<summary><strong>get_drafts</strong> - Get a list of drafts</summary>

**Inputs**:
- `offset` (number, optional): Skip items
- `limit` (number, optional): Max items to return
</details>

<details>
<summary><strong>get_published_posts</strong> - Get a list of published posts</summary>

**Inputs**:
- `offset` (number, optional): Skip items
- `limit` (number, optional): Max items to return
</details>

<details>
<summary><strong>publish_draft</strong> - Publish a draft immediately</summary>

**Inputs**:
- `draftId` (string | number): The ID of the draft
- `send` (boolean, optional): Send email to subscribers (default: true)
- `share_automatically` (boolean, optional): Share to Substack Note / Twitter (default: false)
</details>

<details>
<summary><strong>delete_draft</strong> - Delete a specific draft</summary>

**Inputs**:
- `draftId` (string | number): The ID of the draft to delete
</details>

### Tags Management
<details>
<summary><strong>get_post_tags</strong> - Get all tags</summary>

**Inputs**: None
</details>

<details>
<summary><strong>add_tag_to_post</strong> - Apply a tag to a post (auto-creates if missing)</summary>

**Inputs**:
- `postId` (string | number): Post ID (draft or published)
- `tagName` (string): The name of the tag
</details>

### Profile & Publication Settings
<details>
<summary><strong>get_publication</strong> - Get detailed publication settings</summary>

**Inputs**: None (Retrieves info for the publication in ENV)
</details>

<details>
<summary><strong>update_publication</strong> - Update publication profile</summary>

**Inputs**:
- `name` (string, optional): Publication name
- `hero_text` (string, optional): Publication description
- `logo_url` (string, optional): Logo image URL
</details>

<details>
<summary><strong>get_user_profile</strong> - Get user profile details</summary>

**Inputs**: None
</details>

<details>
<summary><strong>update_user_profile</strong> - Update author user profile</summary>

**Inputs**:
- `name` (string, optional): Author's display name
- `bio` (string, optional): Author's short bio
- `photo_url` (string, optional): Profile picture URL
</details>

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
