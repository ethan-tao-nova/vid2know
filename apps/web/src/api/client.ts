import axios from "axios";

const api = axios.create({
  baseURL: "",
  timeout: 120000,
});

export type Task = {
  id: string;
  source_type: string;
  source_url?: string | null;
  source_filename?: string | null;
  title?: string | null;
  status: string;
  progress: number;
  message: string;
  error?: string | null;
  notes_path?: string | null;
  provider_ids: string[];
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
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
};

export const fetchHealth = () => api.get("/api/health").then((r) => r.data);
export const fetchTasks = () => api.get<Task[]>("/api/tasks").then((r) => r.data);
export const fetchTask = (id: string) => api.get<Task>(`/api/tasks/${id}`).then((r) => r.data);
export const createTask = (url: string, provider_ids: string[]) =>
  api.post<Task>("/api/tasks", { url, provider_ids }).then((r) => r.data);
export const uploadTask = (file: File, provider_ids: string[]) => {
  const form = new FormData();
  form.append("file", file);
  form.append("provider_ids", JSON.stringify(provider_ids));
  return api.post<Task>("/api/tasks/upload", form).then((r) => r.data);
};
export const fetchNote = (id: string) =>
  api.get<{ path: string; content: string }>(`/api/tasks/${id}/note`).then((r) => r.data);
export const fetchSettings = () => api.get<Settings>("/api/settings").then((r) => r.data);
export const updateSettings = (body: Partial<Settings>) =>
  api.put<Settings>("/api/settings", body).then((r) => r.data);
export const fetchProviders = () => api.get<Provider[]>("/api/providers").then((r) => r.data);
export const saveProvider = (body: Record<string, unknown>) =>
  api.put<Provider>("/api/providers", body).then((r) => r.data);
export const testProvider = (body: Record<string, unknown>) =>
  api.post<{ ok: boolean; message: string; sample?: string }>("/api/providers/test", body).then((r) => r.data);

export default api;
