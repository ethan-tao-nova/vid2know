export type TaskStatus =
  | "pending"
  | "downloading"
  | "transcribing"
  | "extracting_frames"
  | "ocr"
  | "assembling"
  | "analyzing"
  | "completed"
  | "failed";

export type ProviderType = "openai_compatible" | "anthropic" | "gemini" | string;
