import { z } from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import { summarizeComment, summarizeFeedItem } from "../utils/feedItem.js";

function summarizeBranch(branch) {
  if (!branch) return null;
  return {
    comment: summarizeComment(branch.comment),
    descendants: (branch.descendantComments ?? []).map(summarizeComment).filter(Boolean),
  };
}

export const getCommentThreadSchema = z.object({
  comment_id: z.union([z.string(), z.number()]).describe("Numeric Note/comment id (without the c- prefix)."),
  include_replies: z
    .boolean()
    .optional()
    .describe("Also fetch reply branches for this thread (default: true)."),
});

export const getCommentThreadHandler = async (args) => {
  const { comment_id, include_replies = true } = getCommentThreadSchema.parse(args);
  const id = Number(comment_id);

  const api = new SubstackApi({
    publication_url: process.env.SUBSTACK_PUBLICATION_URL,
    auth_token: process.env.SUBSTACK_SESSION_TOKEN,
  });

  const thread = await api.getComment(id);
  const item = thread.item;
  if (!item?.comment) {
    throw new Error(`Comment ${id} not found or inaccessible`);
  }

  const result = {
    entity_key: item.entity_key ?? `c-${id}`,
    item: summarizeFeedItem(item),
    parent_comments: (item.parentComments ?? []).map(summarizeComment).filter(Boolean),
  };

  if (include_replies) {
    const replies = await api.getCommentReplies(id);
    result.root_comment = summarizeComment(replies.rootComment);
    result.reply_branches = (replies.commentBranches ?? []).map(summarizeBranch).filter(Boolean);
    result.more_branches = replies.moreBranches ?? 0;
    result.replies_next_cursor = replies.nextCursor ?? null;
  }

  return result;
};
