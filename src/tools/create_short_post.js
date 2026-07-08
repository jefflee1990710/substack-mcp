import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";

export const createShortPostSchema = z.object({
  title: z.string().optional().describe("The title of the short post. Defaults to 'Solo Quant Quick Thought' if not provided."),
  body: z.string().describe("The content of your short post. This acts exactly like a Note in your publication feed."),
  hide_from_feed: z.boolean().optional().describe("Hide the short post from the main feed? (default: false)"),
});

export const createShortPostHandler = async (args) => {
  const {title, body, hide_from_feed = false} = createShortPostSchema.parse(args);

  const substack_api = new SubstackApi({
    publication_url: process.env.SUBSTACK_PUBLICATION_URL,
    auth_token: process.env.SUBSTACK_SESSION_TOKEN,
  });

  // A "short post" acts like a Substack Note but tied directly to the publication.
  // It bypasses the global "Substack.com/notes" GraphQL obfuscation but delivers
  // the exact same short-form content experience.
  
  // 1. Create a draft with title "." (Substack requires a title, but rendering ignores it if it's a short post format or we keep it minimal)
  const draftBody = {
    draft_title: title || 'Solo Quant Quick Thought', 
    draft_subtitle: '',
    draft_body: JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: body }] }]
    }),
    draft_bylines: [{id: Number(process.env.SUBSTACK_USER_ID), is_guest: false}],
    hide_from_feed: hide_from_feed,
  };
  
  const draftRes = await substack_api.postDraft(draftBody);
  const draftId = draftRes.id;
  
  // 2. Publish it immediately without sending email (like a Note)
  const pubRes = await substack_api.publishDraft(draftId, false, false);
  return { status: "OK", published_short_post_id: draftId, details: pubRes };
};
