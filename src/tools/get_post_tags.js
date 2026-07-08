import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";

export const getPostTagsSchema = z.object({}).describe("No arguments required");

export const getPostTagsHandler = async (args) => {
  const substack_api = new SubstackApi({
    publication_url: process.env.SUBSTACK_PUBLICATION_URL,
    auth_token: process.env.SUBSTACK_SESSION_TOKEN,
  });

  return await substack_api.getPublicationPostTags();
};
