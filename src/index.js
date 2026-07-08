#!/usr/bin/env node

import {Server} from "@modelcontextprotocol/sdk/server/index.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {z} from "zod";
import {zodToJsonSchema} from "zod-to-json-schema";
import {createDraftPostSchema, createDraftPostHandler} from "./tools/create_draft_post.js";
import {updatePublicationSchema, updatePublicationHandler} from "./tools/update_publication.js";
import {getPublicationSchema, getPublicationHandler} from "./tools/get_publication.js";
import {getUserProfileSchema, getUserProfileHandler} from "./tools/get_user_profile.js";
import {updateUserProfileSchema, updateUserProfileHandler} from "./tools/update_user_profile.js";
import {updatePaymentSettingsSchema, updatePaymentSettingsHandler} from "./tools/update_payment_settings.js";
import {getStatsSchema, getStatsHandler} from "./tools/get_stats.js";
import {createNoteSchema, createNoteHandler} from "./tools/create_note.js";
import {getUserNotesSchema, getUserNotesHandler} from "./tools/get_user_notes.js";
import {getPostTagsSchema, getPostTagsHandler} from "./tools/get_post_tags.js";
import {addTagToPostSchema, addTagToPostHandler} from "./tools/add_tag_to_post.js";


import {getDraftsSchema, getDraftsHandler} from "./tools/get_drafts.js";
import {getPublishedPostsSchema, getPublishedPostsHandler} from "./tools/get_published_posts.js";
import {deleteDraftSchema, deleteDraftHandler} from "./tools/delete_draft.js";
import {deletePostSchema, deletePostHandler} from "./tools/delete_post.js";
import {publishDraftSchema, publishDraftHandler} from "./tools/publish_draft.js";
import {getReaderFeedSchema, getReaderFeedHandler} from "./tools/get_reader_feed.js";
import {getProfileFeedSchema, getProfileFeedHandler} from "./tools/get_profile_feed.js";
import {getCommentThreadSchema, getCommentThreadHandler} from "./tools/get_comment_thread.js";
import {replyToNoteSchema, replyToNoteHandler} from "./tools/reply_to_note.js";
import {restackItemSchema, restackItemHandler} from "./tools/restack_item.js";
import {getPostCommentsSchema, getPostCommentsHandler} from "./tools/get_post_comments.js";
import {commentOnPostSchema, commentOnPostHandler} from "./tools/comment_on_post.js";
import {listResourcesSchema, listResourcesHandler} from "./tools/list_resources.js";
import {listResources, readResource} from "./resources/catalog.js";


// Create an MCP server
const server = new Server({
    name: "Substack MCP",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      logging: {}
    },
  });

// check envs
if (!process.env.SUBSTACK_PUBLICATION_URL || !process.env.SUBSTACK_SESSION_TOKEN || !process.env.SUBSTACK_USER_ID) {
  throw new Error("SUBSTACK_PUBLICATION_URL, SUBSTACK_SESSION_TOKEN and SUBSTACK_USER_ID must be set");
}

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: listResources(),
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  const content = readResource(uri);
  if (!content) {
    throw new Error(`Unknown resource: ${uri}`);
  }
  return {
    contents: [{ uri, mimeType: content.mimeType, text: content.text }],
  };
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_resources",
        description:
          "List MCP capability docs (tool catalog, setup guide, ProseMirror guide). Pass uri to read full content (e.g. substack://catalog/zh-TW).",
        inputSchema: zodToJsonSchema(listResourcesSchema),
      },
      {
        name: "create_draft_post",
        description:
          "create a draft post on your Substack account.",
        inputSchema: zodToJsonSchema(createDraftPostSchema),
      }
      ,
      {
        name: "update_publication",
        description:
          "Update the publication settings (like name, description/hero_text, logo_url).",
        inputSchema: zodToJsonSchema(updatePublicationSchema),
      }

      ,{
        name: "get_drafts",
        description: "Get a list of drafts in the publication.",
        inputSchema: zodToJsonSchema(getDraftsSchema),
      },
      {
        name: "get_published_posts",
        description: "Get a list of published posts in the publication.",
        inputSchema: zodToJsonSchema(getPublishedPostsSchema),
      },
      {
        name: "delete_draft",
        description: "Delete a specific draft by its ID.",
        inputSchema: zodToJsonSchema(deleteDraftSchema),
      },
      {
        name: "delete_post",
        description: "Delete a specific published post permanently by its ID.",
        inputSchema: zodToJsonSchema(deletePostSchema),
      },
      {
        name: "publish_draft",
        description: "Publish a draft to the publication and optionally send an email.",
        inputSchema: zodToJsonSchema(publishDraftSchema),
      }

      ,{
        name: "get_publication",
        description: "Get the current publication settings and details.",
        inputSchema: zodToJsonSchema(getPublicationSchema),
      },
      {
        name: "get_user_profile",
        description: "Get the current user's profile details.",
        inputSchema: zodToJsonSchema(getUserProfileSchema),
      },
      {
        name: "update_user_profile",
        description: "Update the user's profile settings (like name, bio, photo_url).",
        inputSchema: zodToJsonSchema(updateUserProfileSchema),
      },
      {
        name: "update_payment_settings",
        description: "Update the publication's payment and subscription settings (benefits, founding plan, etc).",
        inputSchema: zodToJsonSchema(updatePaymentSettingsSchema),
      },
      {
        name: "create_note",
        description: "Create and publish a genuine Substack Note to the global feed, optionally attaching up to 4 images (local path, URL, or data URL).",
        inputSchema: zodToJsonSchema(createNoteSchema),
      },
      {
        name: "get_user_notes",
        description: "List Notes authored by a user (from their profile activity feed).",
        inputSchema: zodToJsonSchema(getUserNotesSchema),
      },
      {
        name: "get_stats",
        description: "Get the latest statistics for your publication (subscriber count and growth attribution).",
        inputSchema: zodToJsonSchema(getStatsSchema),
      }

      ,{
        name: "get_post_tags",
        description: "Get all available tags for the publication.",
        inputSchema: zodToJsonSchema(getPostTagsSchema),
      },
      {
        name: "add_tag_to_post",
        description: "Add a tag to a specific post (creates the tag if it doesn't exist).",
        inputSchema: zodToJsonSchema(addTagToPostSchema),
      },
      {
        name: "get_reader_feed",
        description: "Read the authenticated user's Substack Notes home feed (for-you, subscribed, etc). Returns notes, posts, restacks with pagination.",
        inputSchema: zodToJsonSchema(getReaderFeedSchema),
      },
      {
        name: "get_profile_feed",
        description: "Read a user's profile activity feed (their notes, restacks, and comments). Defaults to your account.",
        inputSchema: zodToJsonSchema(getProfileFeedSchema),
      },
      {
        name: "get_comment_thread",
        description: "Read a Note/comment thread: the item, parent comments, and reply branches.",
        inputSchema: zodToJsonSchema(getCommentThreadSchema),
      },
      {
        name: "reply_to_note",
        description: "Reply to a Substack Note or comment on the global Notes feed.",
        inputSchema: zodToJsonSchema(replyToNoteSchema),
      },
      {
        name: "restack_item",
        description: "Restack a Note/comment or post to your feed.",
        inputSchema: zodToJsonSchema(restackItemSchema),
      },
      {
        name: "get_post_comments",
        description: "Read reader comments left on a published post in your publication.",
        inputSchema: zodToJsonSchema(getPostCommentsSchema),
      },
      {
        name: "comment_on_post",
        description: "Leave a reader comment on a published post in your publication.",
        inputSchema: zodToJsonSchema(commentOnPostSchema),
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const {name, arguments: args} = request.params;

  try {
    switch (name) {
      case "list_resources": {
        const result = await listResourcesHandler(args);
        return { content: [{type: "text", text: JSON.stringify(result, null, 2)}] };
      }
      case "create_draft_post": {
        const result = await createDraftPostHandler(args);
        return {
          content: [{type: "text", text: JSON.stringify(result, null, 2)}],
        };
      }
      case "update_publication": {
        const result = await updatePublicationHandler(args);
        return {
          content: [{type: "text", text: JSON.stringify(result, null, 2)}],
        };
      }
      
      case "get_drafts": {
        const result = await getDraftsHandler(args);
        return { content: [{type: "text", text: JSON.stringify(result, null, 2)}] };
      }
      case "get_published_posts": {
        const result = await getPublishedPostsHandler(args);
        return { content: [{type: "text", text: JSON.stringify(result, null, 2)}] };
      }
      case "delete_draft": {
        const result = await deleteDraftHandler(args);
        return { content: [{type: "text", text: JSON.stringify(result, null, 2)}] };
      }
      case "delete_post": {
        const result = await deletePostHandler(args);
        return { content: [{type: "text", text: JSON.stringify(result, null, 2)}] };
      }
      case "publish_draft": {
        const result = await publishDraftHandler(args);
        return { content: [{type: "text", text: JSON.stringify(result, null, 2)}] };
      }
      
      case "get_publication": {
        const result = await getPublicationHandler(args);
        return { content: [{type: "text", text: JSON.stringify(result, null, 2)}] };
      }
      case "get_user_profile": {
        const result = await getUserProfileHandler(args);
        return { content: [{type: "text", text: JSON.stringify(result, null, 2)}] };
      }
      case "update_user_profile": {
        const result = await updateUserProfileHandler(args);
        return { content: [{type: "text", text: JSON.stringify(result, null, 2)}] };
      }
      case "update_payment_settings": {
        const result = await updatePaymentSettingsHandler(args);
        return { content: [{type: "text", text: JSON.stringify(result, null, 2)}] };
      }
      case "get_user_notes": {
        const result = await getUserNotesHandler(args);
        return { content: [{type: "text", text: JSON.stringify(result, null, 2)}] };
      }
      case "get_stats": {
        const result = await getStatsHandler(args);
        return { content: [{type: "text", text: JSON.stringify(result, null, 2)}] };
      }
      case "create_note": {
        const result = await createNoteHandler(args);
        return { content: [{type: "text", text: JSON.stringify(result, null, 2)}] };
      }
      
      case "get_post_tags": {
        const result = await getPostTagsHandler(args);
        return { content: [{type: "text", text: JSON.stringify(result, null, 2)}] };
      }
      case "add_tag_to_post": {
        const result = await addTagToPostHandler(args);
        return { content: [{type: "text", text: JSON.stringify(result, null, 2)}] };
      }
      case "get_reader_feed": {
        const result = await getReaderFeedHandler(args);
        return { content: [{type: "text", text: JSON.stringify(result, null, 2)}] };
      }
      case "get_profile_feed": {
        const result = await getProfileFeedHandler(args);
        return { content: [{type: "text", text: JSON.stringify(result, null, 2)}] };
      }
      case "get_comment_thread": {
        const result = await getCommentThreadHandler(args);
        return { content: [{type: "text", text: JSON.stringify(result, null, 2)}] };
      }
      case "reply_to_note": {
        const result = await replyToNoteHandler(args);
        return { content: [{type: "text", text: JSON.stringify(result, null, 2)}] };
      }
      case "restack_item": {
        const result = await restackItemHandler(args);
        return { content: [{type: "text", text: JSON.stringify(result, null, 2)}] };
      }
      case "get_post_comments": {
        const result = await getPostCommentsHandler(args);
        return { content: [{type: "text", text: JSON.stringify(result, null, 2)}] };
      }
      case "comment_on_post": {
        const result = await commentOnPostHandler(args);
        return { content: [{type: "text", text: JSON.stringify(result, null, 2)}] };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid input: ${JSON.stringify(error.errors)}`);
    }
    throw error;
  }
});


const transport = new StdioServerTransport();
server.connect(transport).catch(() => {
  process.exit(1);
});