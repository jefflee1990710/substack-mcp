import {z} from "zod";
import SubstackApi from "../api/substack/SubstackApi.js";
import {toImagePayload} from "../utils/image.js";

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
    .describe("Publication logo: a local image file path, a public http(s) image URL, or a base64 data URL. It is uploaded to Substack's media store first (a raw external URL would not render), then set as the logo."),
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
  const {logo_url, ...rest} = updatePublicationSchema.parse(args);

  const substack_api = new SubstackApi({
    publication_url: process.env.SUBSTACK_PUBLICATION_URL,
    auth_token: process.env.SUBSTACK_SESSION_TOKEN,
  });

  // Only send fields that were actually provided.
  const updateData = Object.fromEntries(
    Object.entries(rest).filter(([_, v]) => v !== undefined)
  );

  // Upload the logo to Substack first so it is served through Substack's CDN.
  // A raw external URL gets stored verbatim and does not render.
  if (logo_url !== undefined) {
    const uploaded = await substack_api.uploadImage(toImagePayload(logo_url));
    updateData.logo_url = uploaded.url;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("No fields provided to update.");
  }

  return await substack_api.updatePublication(updateData);
};
