import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";

export const addTagToPostSchema = z.object({
  postId: z.union([z.string(), z.number()]).describe("The ID of the post (can be draft or published)"),
  tagName: z.string().describe("The name of the tag to add. Will be created if it doesn't exist."),
});

export const addTagToPostHandler = async (args) => {
  const {postId, tagName} = addTagToPostSchema.parse(args);

  const substack_api = new SubstackApi({
    publication_url: process.env.SUBSTACK_PUBLICATION_URL,
    auth_token: process.env.SUBSTACK_SESSION_TOKEN,
  });

  // 1. Fetch existing tags
  let existingTags = [];
  try {
    existingTags = await substack_api.getPublicationPostTags();
  } catch (e) {
    // If it fails, assume no tags
  }

  // 2. Find if tag already exists
  let tagId;
  const existingTag = existingTags.find(t => t.name === tagName);
  
  if (existingTag) {
    tagId = existingTag.id;
  } else {
    // 3. Create tag if it doesn't exist
    const newTag = await substack_api.createPostTag(tagName);
    tagId = newTag.id;
  }

  // 4. Apply tag to post
  return await substack_api.addTagToPost(postId, tagId);
};
