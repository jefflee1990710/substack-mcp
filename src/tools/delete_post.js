import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";

export const deletePostSchema = z.object({
  postId: z.union([z.string(), z.number()]).describe("The ID of the published post (or draft) to delete permanently"),
});

export const deletePostHandler = async (args) => {
  const {postId} = deletePostSchema.parse(args);

  const substack_api = new SubstackApi({
    publication_url: process.env.SUBSTACK_PUBLICATION_URL,
    auth_token: process.env.SUBSTACK_SESSION_TOKEN,
  });

  // In Substack's backend, both drafts and published posts share the same underlying entity structure.
  // Deleting a published post uses the exact same endpoint as deleting a draft.
  return await substack_api.deleteDraft(postId);
};
