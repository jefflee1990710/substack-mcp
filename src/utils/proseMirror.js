// Extract plain text from a Substack ProseMirror doc (body_json).
export function proseMirrorToText(bodyJson) {
  if (!bodyJson) return "";
  if (typeof bodyJson === "string") return bodyJson;

  const chunks = [];
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "text" && node.text) chunks.push(node.text);
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  walk(bodyJson);
  return chunks.join("").trim();
}
