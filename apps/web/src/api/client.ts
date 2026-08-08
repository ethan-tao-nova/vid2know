import axios, { AxiosError } from "axios";

const api = axios.create({
  baseURL: "",
  timeout: 120000,
});

export const API_BASE = "";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type TaskStatus =
  | "pending"
  | "downloading"
  | "transcribing"
  | "extracting_frames"
  | "ocr"
  | "assembling"
  | "analyzing"
  | "completed"
  | "failed"
  | "cancelled";

export type AnalysisResult = {
  id?: string;
  provider_id: string;
  provider_name?: string;
  model?: string;
  content: string;
  created_at?: string;
  usage?: TokenUsage | null;
};

export type TokenUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost?: number | null;
};

export type UsageSummary = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost?: number | null;
  by_provider?: Record<string, TokenUsage>;
};

export type Artifact = {
  name: string;
  path: string;
  kind: string;
  size?: number;
  url?: string;
};

export type Task = {
  id: string;
  source_type: string;
  source_url?: string | null;
  source_filename?: string | null;
  title?: string | null;
  status: TaskStatus | string;
  progress: number;
  message: string;
  error?: string | null;
  notes_path?: string | null;
  provider_ids: string[];
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  analyses?: AnalysisResult[];
  artifacts?: Artifact[];
  usage?: UsageSummary | null;
};

export type Provider = {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  base_url: string;
  default_model: string;
  temperature: number;
  timeout_seconds: number;
  has_api_key: boolean;
  api_key_masked: string;
  system_prompt?: string;
};

export type Settings = {
  notes_root: string;
  video_cache_root: string;
  cookies_file: string;
  auto_delete_video: boolean;
  whisper_model: string;
  ocr_enabled: boolean;
  scene_threshold: number;
  max_keyframes: number;
  default_locale: string;
  analysis_language?: string;
  quality_preset?: string;
};

export type PromptTemplate = {
  id: string;
  name: string;
  description?: string;
  system_prompt?: string;
  user_prompt?: string;
  builtin?: boolean;
};

export type HealthStatus = {
  status: string;
  app?: string;
  database?: string;
  redis?: string;
};

export type TaskEvent = {
  type: string;
  task_id?: string;
  status?: string;
  progress?: number;
  message?: string;
  [key: string]: unknown;
};

export type CreateTaskInput = {
  url: string;
  provider_ids?: string[];
  template_id?: string;
  clip_start?: number | null;
  clip_end?: number | null;
};

export type SearchMode = "auto" | "text" | "semantic";

/* ------------------------------------------------------------------ */
/* Error helpers                                                       */
/* ------------------------------------------------------------------ */

export type ApiError = AxiosError<{ detail?: string; message?: string }>;

export function isApiError(e: unknown): e is ApiError {
  return axios.isAxiosError(e);
}

export function errorMessage(e: unknown): string {
  if (isApiError(e)) {
    const data = e.response?.data;
    if (data && typeof data === "object") {
      const detail = (data as { detail?: unknown }).detail;
      if (typeof detail === "string") return detail;
      const msg = (data as { message?: unknown }).message;
      if (typeof msg === "string") return msg;
    }
    return e.message;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}

export function statusOf(e: unknown): number | undefined {
  return isApiError(e) ? e.response?.status : undefined;
}

/** Resolve to a fallback value when the endpoint is missing (404/405/501). */
async function graceful<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (e) {
    const s = statusOf(e);
    if (s === 404 || s === 405 || s === 501) return fallback;
    throw e;
  }
}

/* ------------------------------------------------------------------ */
/* Health                                                              */
/* ------------------------------------------------------------------ */

export const fetchHealth = () =>
  api.get<HealthStatus>("/api/health").then((r) => r.data);

/* ------------------------------------------------------------------ */
/* Tasks: CRUD                                                         */
/* ------------------------------------------------------------------ */

export const fetchTasks = (params?: {
  q?: string;
  mode?: SearchMode;
  status?: string;
  limit?: number;
}) =>
  api
    .get<Task[]>("/api/tasks", { params })
    .then((r) => r.data);

export const fetchTask = (id: string) =>
  api.get<Task>(`/api/tasks/${id}`).then((r) => r.data);

export const createTask = (
  input: CreateTaskInput | string,
  providerIds?: string[]
) => {
  const body: CreateTaskInput =
    typeof input === "string"
      ? { url: input, provider_ids: providerIds ?? [] }
      : input;
  return api.post<Task>("/api/tasks", body).then((r) => r.data);
};

export const createTasksBatch = (
  urls: string[],
  provider_ids: string[] = [],
  extra?: Partial<CreateTaskInput>
) =>
  graceful(
    api
      .post<Task[]>("/api/tasks/batch", { urls, provider_ids, ...extra })
      .then((r) => r.data),
    // Fallback: fan-out to single create when batch endpoint is absent.
    Promise.all(
      urls.map((url) => createTask({ url, provider_ids, ...extra }))
    ) as unknown as Task[]
  );

export const uploadTask = (
  file: File,
  provider_ids: string[] = [],
  onProgress?: (percent: number) => void
) => {
  const form = new FormData();
  form.append("file", file);
  form.append("provider_ids", JSON.stringify(provider_ids));
  return api
    .post<Task>("/api/tasks/upload", form, {
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      },
    })
    .then((r) => r.data);
};

export const cancelTask = (id: string) =>
  api.post<Task>(`/api/tasks/${id}/cancel`).then((r) => r.data);

export const retryTask = (id: string) =>
  api.post<Task>(`/api/tasks/${id}/retry`).then((r) => r.data);

export const deleteTask = (id: string, delete_notes = false) =>
  api
    .delete(`/api/tasks/${id}`, { params: { delete_notes } })
    .then((r) => r.data);

export const analyzeTask = (
  id: string,
  body: { provider_ids: string[]; template_id?: string }
) => api.post<Task>(`/api/tasks/${id}/analyze`, body).then((r) => r.data);

/* ------------------------------------------------------------------ */
/* Tasks: notes / artifacts / exports / assets                        */
/* ------------------------------------------------------------------ */

export const fetchNote = (id: string) =>
  api
    .get<{ path: string; content: string }>(`/api/tasks/${id}/note`)
    .then((r) => r.data);

export const fetchArtifacts = (id: string) =>
  graceful(
    api.get<Artifact[]>(`/api/tasks/${id}/artifacts`).then((r) => r.data),
    []
  );

export type ExportFormat = "zip" | "md" | "docx" | "pdf" | "xmind";

export const exportUrl = (id: string, format: ExportFormat) =>
  `/api/tasks/${id}/export?format=${encodeURIComponent(format)}`;

export const downloadExport = (id: string, format: ExportFormat) =>
  api
    .get(exportUrl(id, format), { responseType: "blob" })
    .then((r) => r.data as Blob);

export const assetUrl = (id: string, path: string, w?: number) => {
  const params = new URLSearchParams({ path });
  if (w) params.set("w", String(w));
  return `/api/tasks/${id}/asset?${params.toString()}`;
};

export const reindexTask = (id: string) =>
  graceful(
    api.post(`/api/tasks/${id}/reindex`).then((r) => r.data),
    { ok: true }
  );

/* ------------------------------------------------------------------ */
/* Prompt templates                                                    */
/* ------------------------------------------------------------------ */

export const fetchTemplates = () =>
  graceful(
    api.get<PromptTemplate[]>("/api/templates").then((r) => r.data),
    []
  );

export const saveTemplate = (body: Partial<PromptTemplate>) =>
  api.put<PromptTemplate>("/api/templates", body).then((r) => r.data);

export const deleteTemplate = (id: string) =>
  api.delete(`/api/templates/${id}`).then((r) => r.data);

/* ------------------------------------------------------------------ */
/* Usage                                                               */
/* ------------------------------------------------------------------ */

export const fetchUsage = () =>
  graceful(
    api.get<UsageSummary>("/api/usage").then((r) => r.data),
    null as UsageSummary | null
  );

/* ------------------------------------------------------------------ */
/* Providers                                                           */
/* ------------------------------------------------------------------ */

export const fetchProviders = () =>
  api.get<Provider[]>("/api/providers").then((r) => r.data);

export const saveProvider = (body: Record<string, unknown>) =>
  api.put<Provider>("/api/providers", body).then((r) => r.data);

export const testProvider = (body: Record<string, unknown>) =>
  api
    .post<{ ok: boolean; message: string; sample?: string }>(
      "/api/providers/test",
      body
    )
    .then((r) => r.data);

export const deleteProvider = (id: string) =>
  graceful(
    api.delete(`/api/providers/${id}`).then((r) => r.data),
    { ok: true }
  );

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export const fetchSettings = () =>
  api.get<Settings>("/api/settings").then((r) => r.data);

export const updateSettings = (body: Partial<Settings>) =>
  api.put<Settings>("/api/settings", body).then((r) => r.data);

export const reindexAll = () =>
  graceful(
    api.post("/api/settings/reindex").then((r) => r.data),
    { ok: true }
  );

/* ------------------------------------------------------------------ */
/* Cookies (optional)                                                  */
/* ------------------------------------------------------------------ */

export type CookieStatus = { present: boolean; path?: string; updated_at?: string };

export const fetchCookieStatus = () =>
  graceful(
    api.get<CookieStatus>("/api/cookies").then((r) => r.data),
    { present: false } as CookieStatus
  );

export const uploadCookies = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api.post<CookieStatus>("/api/cookies", form).then((r) => r.data);
};

/* ------------------------------------------------------------------ */
/* Logs (optional)                                                     */
/* ------------------------------------------------------------------ */

export const fetchLogs = (params?: { limit?: number; level?: string }) =>
  graceful(
    api
      .get<{ lines: string[] }>("/api/logs", { params })
      .then((r) => r.data),
    null as { lines: string[] } | null
  );

/** Detect whether the logs endpoint is available. */
export const logsAvailable = () =>
  api
    .get("/api/logs", { params: { limit: 1 } })
    .then(() => true)
    .catch(() => false);

/* ------------------------------------------------------------------ */
/* SSE task events (with graceful teardown)                            */
/* ------------------------------------------------------------------ */

export type TaskEventHandlers = {
  onEvent?: (e: TaskEvent) => void;
  onError?: (err: Event) => void;
  onOpen?: () => void;
};

/**
 * Subscribe to server-sent task events. Returns an unsubscribe function.
 * The endpoint may not exist; callers should also keep a polling fallback.
 */
export function subscribeTaskEvents(
  taskId: string,
  handlers: TaskEventHandlers
): () => void {
  let source: EventSource | null = null;
  try {
    source = new EventSource(`/api/tasks/${taskId}/events`);
  } catch {
    return () => undefined;
  }
  const es = source;
  es.onopen = () => handlers.onOpen?.();
  es.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data) as TaskEvent;
      handlers.onEvent?.(data);
    } catch {
      /* ignore malformed frames */
    }
  };
  es.onerror = (err) => handlers.onError?.(err);
  return () => es.close();
}

export default api;
