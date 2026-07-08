import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";

export const updatePublicationSchema = z.object({
  name: z
    .string()
    .optional()
    .describe("The name of the publication."),
  hero_text: z
    .string()
    .optional()
    .describe("The description or hero text of the publication."),
  logo_url: z
    .string()
    .optional()
    .describe("The URL of the publication's logo image."),
  copyright: z
    .string()
    .optional()
    .describe("The copyright text usually displayed in footers."),
  email_from_name: z
    .string()
    .optional()
    .describe("The 'From' name used when sending emails to subscribers."),
});

export const updatePublicationHandler = async (args) => {
  const validatedArgs = updatePublicationSchema.parse(args);

  // Filter out undefined properties so we only send what needs to be updated
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

  const response = await substack_api.updatePublication(updateData);
  return response;
};
