import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {toImagePayload} from "../utils/image.js";

export const updateUserProfileSchema = z.object({
  name: z.string().optional().describe("The user's display name"),
  bio: z.string().optional().describe("The user's short bio"),
  photo_url: z
    .string()
    .optional()
    .describe("Profile photo: a local image file path, a public http(s) image URL, or a base64 data URL. It is uploaded to Substack's media store first, then set as the profile picture."),
});

export const updateUserProfileHandler = async (args) => {
  const {name, bio, photo_url} = updateUserProfileSchema.parse(args);

  const substack_api = new SubstackApi({
    publication_url: process.env.SUBSTACK_PUBLICATION_URL,
    auth_token: process.env.SUBSTACK_SESSION_TOKEN,
  });

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (bio !== undefined) updateData.bio = bio;

  // Upload the image to Substack first so photo_url points at a Substack-hosted asset.
  if (photo_url !== undefined) {
    const uploaded = await substack_api.uploadImage(toImagePayload(photo_url));
    updateData.photo_url = uploaded.url;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("No fields provided to update.");
  }

  return await substack_api.updateUserProfile(updateData);
};
