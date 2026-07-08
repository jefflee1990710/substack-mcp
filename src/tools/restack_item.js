import { z } from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import { summarizeComment } from "../utils/feedItem.js";

export const restackItemSchema = z.object({
  comment_id: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Restack a Note/comment by id. Provide comment_id OR post_id, not both."),
  post_id: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Restack a post by id. Provide comment_id OR post_id, not both."),
  tab_id: z.string().optional().describe('Feed tab context (default: "for-you").'),
}).refine((v) => Boolean(v.comment_id) !== Boolean(v.post_id), {
  message: "Provide exactly one of comment_id or post_id",
});

export const restackItemHandler = async (args) => {
  const { comment_id, post_id, tab_id = "for-you" } = restackItemSchema.parse(args);

  const api = new SubstackApi({
    publication_url: process.env.SUBSTACK_PUBLICATION_URL,
    auth_token: process.env.SUBSTACK_SESSION_TOKEN,
  });

  const data = await api.restackFeedItem({
    commentId: comment_id != null ? Number(comment_id) : null,
    postId: post_id != null ? Number(post_id) : null,
    tabId: tab_id,
  });

  return {
    status: "OK",
    restacked_comment: summarizeComment(data.comment),
    restacked_post: data.post
      ? { id: data.post.id, title: data.post.title ?? null, slug: data.post.slug ?? null }
      : null,
  };
};
