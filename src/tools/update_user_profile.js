import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";

export const updateUserProfileSchema = z.object({
  name: z.string().optional().describe("The user's display name"),
  bio: z.string().optional().describe("The user's short bio"),
  photo_url: z.string().optional().describe("The URL of the user's profile photo"),
});

export const updateUserProfileHandler = async (args) => {
  const validatedArgs = updateUserProfileSchema.parse(args);

  const updateData = Object.fromEntries(
    Object.entries(validatedArgs).filter(([_, v]) => v !== undefined)
  );

  if (Object.keys(updateData).length === 0) {
    throw new Error("No fields provided to update.");
  }

  const substack_api = new SubstackApi({
    publication_url: process.env.SUBSTACK_PUBLICATION_URL,
    auth_token: process.env.SUBSTACK_SESSION_TOKEN,
  });

  return await substack_api.updateUserProfile(updateData);
};
