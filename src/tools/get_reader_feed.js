import { z } from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import { summarizeFeedResponse } from "../utils/feedItem.js";

export const getReaderFeedSchema = z.object({
  tab: z
    .string()
    .optional()
    .describe('Feed tab id. Common values: "for-you" (default), "subscribed". Use get_reader_feed_tabs to list all.'),
  cursor: z.string().optional().describe("Pagination cursor from a previous response's next_cursor."),
  limit: z.number().int().min(1).max(50).optional().describe("Max items to return after summarizing (default: 20)."),
  include_tabs: z.boolean().optional().describe("If true, also return available feed tabs (default: false)."),
});

export const getReaderFeedHandler = async (args) => {
  const { tab, cursor, limit = 20, include_tabs = false } = getReaderFeedSchema.parse(args);

  const api = new SubstackApi({
    publication_url: process.env.SUBSTACK_PUBLICATION_URL,
    auth_token: process.env.SUBSTACK_SESSION_TOKEN,
  });

  const feed = await api.getReaderFeed({ tab, cursor, limit });
  const result = {
    tab: tab ?? "for-you",
    ...summarizeFeedResponse(feed, { limit }),
  };

  if (include_tabs) {
    const tabsData = await api.getReaderFeedTabs();
    result.available_tabs = (tabsData.tabs ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      slug: t.slug ?? null,
    }));
  }

  return result;
};
