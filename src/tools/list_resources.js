import { z } from "zod";
import { listResources, readResource } from "../resources/catalog.js";

export const listResourcesSchema = z.object({
  uri: z
    .string()
    .optional()
    .describe(
      'Optional resource URI to read. If omitted, returns all available resource URIs. Examples: "substack://catalog", "substack://catalog/zh-TW", "substack://setup".'
    ),
});

export const listResourcesHandler = async (args) => {
  const { uri } = listResourcesSchema.parse(args);

  if (uri) {
    const content = readResource(uri);
    if (!content) {
      throw new Error(`Unknown resource: ${uri}. Available: ${listResources().map((r) => r.uri).join(", ")}`);
    }
    return { uri, mimeType: content.mimeType, text: content.text };
  }

  return {
    resources: listResources(),
    hint: "Pass uri to read full content, or use MCP resources/read with the same URI.",
  };
};
