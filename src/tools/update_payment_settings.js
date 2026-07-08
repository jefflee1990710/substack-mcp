import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";

export const updatePaymentSettingsSchema = z.object({
  free_subscription_benefits: z.array(z.string()).optional().describe("List of benefits for free subscribers"),
  paid_subscription_benefits: z.array(z.string()).optional().describe("List of benefits for paid subscribers"),
  founding_subscription_benefits: z.array(z.string()).optional().describe("List of benefits for founding members"),
  founding_plan_enabled: z.boolean().optional().describe("Enable or disable the founding member plan"),
  founding_plan_name: z.string().optional().describe("Name of the founding plan"),
  founding_plan_amount: z.number().optional().describe("Amount for the founding plan"),
  paywall_free_trial_enabled: z.boolean().optional().describe("Enable or disable free trial on the paywall"),
});

export const updatePaymentSettingsHandler = async (args) => {
  const validatedArgs = updatePaymentSettingsSchema.parse(args);

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

  // Payment settings are just properties on the publication object, so we use updatePublication
  return await substack_api.updatePublication(updateData);
};
