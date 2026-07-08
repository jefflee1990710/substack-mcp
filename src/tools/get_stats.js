import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";

export const getStatsSchema = z.object({}).describe("No arguments required");

export const getStatsHandler = async (args) => {
  const substack_api = new SubstackApi({
    publication_url: process.env.SUBSTACK_PUBLICATION_URL,
    auth_token: process.env.SUBSTACK_SESSION_TOKEN,
  });

  // The actual Substack backend splits stats across endpoints.
  // We aggregate them here to give a unified view of the publication's health.
  
  // 1. Subscriber stats (total count)
  let subscriberCount = 0;
  try {
    const hostname = substack_api.hostname.replace('https://', '').replace('http://', '').replace('/api/v1', '');
    const subRes = await substack_api.session.post(`https://${hostname}/api/v1/subscriber-stats`, {});
    subscriberCount = subRes.data.count || 0;
  } catch (e) {
    console.error("Failed to fetch subscriber stats:", e.message);
  }

  // 2. Network attribution (last 90 days growth sources)
  let networkAttribution = [];
  try {
    const hostname = substack_api.hostname.replace('https://', '').replace('http://', '').replace('/api/v1', '');
    const netRes = await substack_api.session.get(`https://${hostname}/api/v1/publication/stats/network_attribution?time_window=90+days&is_subscribed=false`);
    networkAttribution = netRes.data.rows || [];
  } catch (e) {
    console.error("Failed to fetch network attribution stats:", e.message);
  }

  return {
    total_subscribers: subscriberCount,
    network_attribution_90_days: networkAttribution.map(row => ({
      source: row.label,
      subscribers_gained: row.subs_count,
      percentage: Math.round(row.pct_time_window_total * 100) + '%'
    }))
  };
};
