import fs from "fs";

const MIME_BY_EXT = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

// Normalizes an image source into something Substack's /image endpoint accepts.
// - data URL  -> passed through unchanged
// - http(s) URL -> passed through (Substack fetches & rehosts it)
// - local file path -> read from disk and encoded as a base64 data URL
export function toImagePayload(source) {
  if (/^data:/i.test(source) || /^https?:\/\//i.test(source)) {
    return source;
  }

  if (!fs.existsSync(source)) {
    throw new Error(`Image source is not a data URL, http(s) URL, or an existing file path: ${source}`);
  }

  const ext = source.split(".").pop().toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) {
    throw new Error(`Unsupported image type ".${ext}". Supported: ${Object.keys(MIME_BY_EXT).join(", ")}.`);
  }

  const base64 = fs.readFileSync(source).toString("base64");
  return `data:${mime};base64,${base64}`;
}
