export const STATUS_COLOR: Record<string, string> = {
  pending: "default",
  downloading: "processing",
  transcribing: "processing",
  extracting_frames: "processing",
  ocr: "processing",
  assembling: "processing",
  analyzing: "processing",
  completed: "success",
  failed: "error",
  cancelled: "warning",
};

export const ACTIVE_STATUSES = new Set([
  "pending",
  "downloading",
  "transcribing",
  "extracting_frames",
  "ocr",
  "assembling",
  "analyzing",
]);

export function isActive(status: string): boolean {
  return ACTIVE_STATUSES.has(status);
}

export function statusColor(status: string): string {
  return STATUS_COLOR[status] || "default";
}

export const ALL_STATUS_OPTIONS = [
  "pending",
  "downloading",
  "transcribing",
  "extracting_frames",
  "ocr",
  "assembling",
  "analyzing",
  "completed",
  "failed",
  "cancelled",
];
