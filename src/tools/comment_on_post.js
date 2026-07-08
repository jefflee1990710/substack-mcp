import { z } from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import { summarizeComment } from "../utils/feedItem.js";

export const commentOnPostSchema = z.object({
  post_id: z.union([z.string(), z.number()]).describe("Numeric post id on your publication."),
  body: z.string().min(1).describe("Comment text (plain text; Substack converts to ProseMirror server-side)."),
});

export const commentOnPostHandler = async (args) => {
  const { post_id, body } = commentOnPostSchema.parse(args);

  const api = new SubstackApi({
    publication_url: process.env.SUBSTACK_PUBLICATION_URL,
    auth_token: process.env.SUBSTACK_SESSION_TOKEN,
  });

  const comment = await api.commentOnPost(Number(post_id), body);
  return {
    status: "OK",
    comment: summarizeComment(comment),
  };
};
