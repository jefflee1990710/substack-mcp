#!/usr/bin/env node

import {Server} from "@modelcontextprotocol/sdk/server/index.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {z} from "zod";
import {zodToJsonSchema} from "zod-to-json-schema";
import {createDraftPostSchema, createDraftPostHandler} from "./tools/create_draft_post.js";
import {updatePublicationSchema, updatePublicationHandler} from "./tools/update_publication.js";
import {getPublicationSchema, getPublicationHandler} from "./tools/get_publication.js";
import {getUserProfileSchema, getUserProfileHandler} from "./tools/get_user_profile.js";
import {updateUserProfileSchema, updateUserProfileHandler} from "./tools/update_user_profile.js";
import {updatePaymentSettingsSchema, updatePaymentSettingsHandler} from "./tools/update_payment_settings.js";
import {createShortPostSchema, createShortPostHandler} from "./tools/create_short_post.js";
import {getPostTagsSchema, getPostTagsHandler} from "./tools/get_post_tags.js";
import {addTagToPostSchema, addTagToPostHandler} from "./tools/add_tag_to_post.js";


import {getDraftsSchema, getDraftsHandler} from "./tools/get_drafts.js";
import {getPublishedPostsSchema, getPublishedPostsHandler} from "./tools/get_published_posts.js";
import {deleteDraftSchema, deleteDraftHandler} from "./tools/delete_draft.js";
import {publishDraftSchema, publishDraftHandler} from "./tools/publish_draft.js";


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

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
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
        name: "create_short_post",
        description: "Create and publish a short post (acts identically to a Note on your publication feed).",
        inputSchema: zodToJsonSchema(createShortPostSchema),
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
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const {name, arguments: args} = request.params;

  try {
    switch (name) {
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
      case "create_short_post": {
        const result = await createShortPostHandler(args);
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