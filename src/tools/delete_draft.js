import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";

export const deleteDraftSchema = z.object({
  draftId: z.union([z.string(), z.number()]).describe("The ID of the draft to delete"),
});

export const deleteDraftHandler = async (args) => {
  const {draftId} = deleteDraftSchema.parse(args);

  const substack_api = new SubstackApi({
    publication_url: process.env.SUBSTACK_PUBLICATION_URL,
    auth_token: process.env.SUBSTACK_SESSION_TOKEN,
  });

  return await substack_api.deleteDraft(draftId);
};
