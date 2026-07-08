import { z } from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import { fetchViaNotesBrowser } from "../utils/notesBrowser.js";
import { proseMirrorToText } from "../utils/proseMirror.js";

function buildBodyJson(body) {
  const paragraphs = body.split(/\n{2,}/).map((chunk) => chunk.trim()).filter(Boolean);
  const content = (paragraphs.length ? paragraphs : [body]).map((text) => ({
    type: "paragraph",
    content: [{ type: "text", text }],
  }));
  return { type: "doc", attrs: { schemaVersion: "v1", title: null }, content };
}

export const replyToNoteSchema = z.object({
  parent_comment_id: z
    .union([z.string(), z.number()])
    .describe("Id of the Note or comment you are replying to."),
  body: z.string().min(1).describe("Reply text. Blank lines start new paragraphs."),
  tab_id: z.string().optional().describe('Feed tab context (default: "for-you").'),
});

export const replyToNoteHandler = async (args) => {
  const { parent_comment_id, body, tab_id = "for-you" } = replyToNoteSchema.parse(args);

  const json = await fetchViaNotesBrowser("/comment/feed", {
    method: "POST",
    body: {
      bodyJson: buildBodyJson(body),
      parent_id: Number(parent_comment_id),
      tabId: tab_id,
      surface: "feed",
      replyMinimumRole: "everyone",
    },
  });

  const comment = json?.id ? json : json?.comment;
  if (!comment?.id) {
    throw new Error("Substack did not return a comment id for the reply");
  }

  return {
    status: "OK",
    comment_id: comment.id,
    parent_comment_id: Number(parent_comment_id),
    body: comment.body ?? proseMirrorToText(comment.body_json) ?? body,
    date: comment.date ?? null,
    url: `https://substack.com/note/c-${comment.id}`,
  };
};
