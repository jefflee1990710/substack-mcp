import { z } from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import { summarizeComment } from "../utils/feedItem.js";

export const getUserNotesSchema = z.object({
  user_id: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Substack user id whose authored Notes to list. Defaults to SUBSTACK_USER_ID."),
  cursor: z.string().optional().describe("Pagination cursor from a previous response's next_cursor."),
  limit: z.number().int().min(1).max(50).optional().describe("Max notes to return (default: 20)."),
});

export const getUserNotesHandler = async (args) => {
  const { user_id, cursor, limit = 20 } = getUserNotesSchema.parse(args);
  const resolvedUserId = user_id ?? process.env.SUBSTACK_USER_ID;
  if (!resolvedUserId) {
    throw new Error("user_id is required when SUBSTACK_USER_ID is not set");
  }

  const api = new SubstackApi({
    publication_url: process.env.SUBSTACK_PUBLICATION_URL,
    auth_token: process.env.SUBSTACK_SESSION_TOKEN,
  });

  const { items, next_cursor } = await api.getUserNotes(resolvedUserId, { cursor, limit });

  return {
    user_id: Number(resolvedUserId),
    notes: items.map((item) => ({
      entity_key: item.entity_key,
      ...summarizeComment(item.comment),
      published_at: item.context?.timestamp ?? item.comment?.date ?? null,
    })),
    count: items.length,
    next_cursor,
  };
};
