import { z } from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import { summarizeComment } from "../utils/feedItem.js";

export const getPostCommentsSchema = z.object({
  post_id: z.union([z.string(), z.number()]).describe("Numeric post id from your publication."),
  limit: z.number().int().min(1).max(100).optional().describe("Max comments to return (default: 50)."),
});

export const getPostCommentsHandler = async (args) => {
  const { post_id, limit = 50 } = getPostCommentsSchema.parse(args);

  const api = new SubstackApi({
    publication_url: process.env.SUBSTACK_PUBLICATION_URL,
    auth_token: process.env.SUBSTACK_SESSION_TOKEN,
  });

  const data = await api.getPostComments(Number(post_id), { limit });
  return {
    post_id: Number(post_id),
    comments: (data.comments ?? []).map(summarizeComment).filter(Boolean),
    automod_hidden_count: (data.automod_hidden_comments ?? []).length,
  };
};
