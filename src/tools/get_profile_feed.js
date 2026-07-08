import { z } from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import { summarizeFeedResponse } from "../utils/feedItem.js";

export const getProfileFeedSchema = z.object({
  user_id: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Substack user id. Defaults to SUBSTACK_USER_ID from env (your account)."),
  cursor: z.string().optional().describe("Pagination cursor from a previous response's next_cursor."),
  limit: z.number().int().min(1).max(50).optional().describe("Max items to return (default: 20)."),
});

export const getProfileFeedHandler = async (args) => {
  const { user_id, cursor, limit = 20 } = getProfileFeedSchema.parse(args);
  const resolvedUserId = user_id ?? process.env.SUBSTACK_USER_ID;
  if (!resolvedUserId) {
    throw new Error("user_id is required when SUBSTACK_USER_ID is not set");
  }

  const api = new SubstackApi({
    publication_url: process.env.SUBSTACK_PUBLICATION_URL,
    auth_token: process.env.SUBSTACK_SESSION_TOKEN,
  });

  const feed = await api.getProfileFeed(resolvedUserId, { cursor, limit });
  return {
    user_id: Number(resolvedUserId),
    ...summarizeFeedResponse(feed, { limit }),
  };
};
