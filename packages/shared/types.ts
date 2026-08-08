/** Shared Task / Provider types for Vid2Know. */
export type TaskStatus =
  | "pending"
  | "downloading"
  | "transcribing"
  | "extracting_frames"
  | "ocr"
  | "assembling"
  | "analyzing"
  | "cancelling"
  | "cancelled"
  | "completed"
  | "failed";

export type ProviderType = "openai_compatible" | "openai" | "anthropic" | "gemini";

export type PromptTemplateId = "illustrated" | "brief" | "tutorial" | "exam_points";

export type PipelineStage =
  | "downloading"
  | "transcribing"
  | "extracting_frames"
  | "ocr"
  | "assembling"
  | "analyzing";
