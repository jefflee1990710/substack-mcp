import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";

export const publishDraftSchema = z.object({
  draftId: z.union([z.string(), z.number()]).describe("The ID of the draft to publish"),
  send: z.boolean().optional().describe("Whether to send an email notification to subscribers (default: true)"),
  share_automatically: z.boolean().optional().describe("Whether to share on Substack notes/Twitter automatically (default: false)"),
});

export const publishDraftHandler = async (args) => {
  const {draftId, send = true, share_automatically = false} = publishDraftSchema.parse(args);

  const substack_api = new SubstackApi({
    publication_url: process.env.SUBSTACK_PUBLICATION_URL,
    auth_token: process.env.SUBSTACK_SESSION_TOKEN,
  });

  return await substack_api.publishDraft(draftId, send, share_automatically);
};
