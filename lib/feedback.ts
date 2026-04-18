export const FEEDBACK_MAX_ATTACHMENTS = 5;
export const FEEDBACK_MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB per file
export const FEEDBACK_MAX_TOTAL_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB total

export const FEEDBACK_ALLOWED_ATTACHMENT_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export const FEEDBACK_ATTACHMENT_ACCEPT = "image/*,video/*";

export function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  const precision = exponent === 0 ? 0 : 1;

  return `${value.toFixed(precision)} ${units[exponent]}`;
}
