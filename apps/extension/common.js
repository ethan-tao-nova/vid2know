/**
 * Shared helpers for the Vid2Know browser extension.
 * Loaded as a plain classic script by both the background service worker
 * (via importScripts) and the popup UI (via <script src="common.js">).
 */

const VID2KNOW_DEFAULT_API_BASE = "http://127.0.0.1:8080";
const VID2KNOW_STORAGE_KEY = "vid2know.apiBase";

/** Video hosts we recognize; used to decide when the action badge lights up. */
const VID2KNOW_VIDEO_HOST_PATTERNS = [
  /(^|\.)bilibili\.com$/,
  /(^|\.)b23\.tv$/,
  /(^|\.)youtube\.com$/,
  /(^|\.)youtu\.be$/,
];

function vid2knowIsVideoUrl(url) {
  try {
    const host = new URL(url).hostname;
    return VID2KNOW_VIDEO_HOST_PATTERNS.some((re) => re.test(host));
  } catch {
    return false;
  }
}

async function vid2knowGetApiBase() {
  try {
    const stored = await chrome.storage.sync.get(VID2KNOW_STORAGE_KEY);
    const value = stored[VID2KNOW_STORAGE_KEY];
    if (typeof value === "string" && value.trim()) return value.trim();
  } catch {
    /* storage may be unavailable in some contexts; fall back below */
  }
  return VID2KNOW_DEFAULT_API_BASE;
}

async function vid2knowSetApiBase(apiBase) {
  await chrome.storage.sync.set({ [VID2KNOW_STORAGE_KEY]: apiBase });
}

/** POST a URL to the Vid2Know API to create a conversion task. */
async function vid2knowCreateTask(apiBase, url, options = {}) {
  const base = apiBase.replace(/\/+$/, "");
  const res = await fetch(`${base}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      provider_ids: options.providerIds || [],
      template_id: options.templateId,
    }),
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      detail = data.detail || data.message || detail;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new Error(detail);
  }
  return res.json();
}

async function vid2knowCheckHealth(apiBase) {
  const base = apiBase.replace(/\/+$/, "");
  const res = await fetch(`${base}/api/health`, { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Node-free UMD-ish export so this file works as a plain classic script
// (importScripts in the SW, <script> tag in the popup) without bundling.
if (typeof self !== "undefined") {
  self.Vid2Know = {
    DEFAULT_API_BASE: VID2KNOW_DEFAULT_API_BASE,
    isVideoUrl: vid2knowIsVideoUrl,
    getApiBase: vid2knowGetApiBase,
    setApiBase: vid2knowSetApiBase,
    createTask: vid2knowCreateTask,
    checkHealth: vid2knowCheckHealth,
  };
}
