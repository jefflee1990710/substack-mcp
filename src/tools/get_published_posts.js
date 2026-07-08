import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";

export const getPublishedPostsSchema = z.object({
  offset: z.number().optional().describe("Number of items to skip"),
  limit: z.number().optional().describe("Max number of items to return"),
});

export const getPublishedPostsHandler = async (args) => {
  const {offset = 0, limit = 20} = getPublishedPostsSchema.parse(args);

  const substack_api = new SubstackApi({
    publication_url: process.env.SUBSTACK_PUBLICATION_URL,
    auth_token: process.env.SUBSTACK_SESSION_TOKEN,
  });

  return await substack_api.getPublishedPosts(offset, limit);
};
