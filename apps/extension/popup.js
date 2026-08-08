const DEFAULT_BASE = "http://localhost:8080";

const urlEl = document.getElementById("url");
const baseEl = document.getElementById("base");
const providersEl = document.getElementById("providers");
const sendEl = document.getElementById("send");
const statusEl = document.getElementById("status");

function setStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.className = "status" + (kind ? " " + kind : "");
}

async function init() {
  // Prefill URL from the active tab.
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && /^https?:/i.test(tab.url)) {
      urlEl.value = tab.url;
    }
  } catch (e) {
    /* ignore */
  }

  // Load saved settings.
  try {
    const { apiBase, providerIds } = await chrome.storage.sync.get([
      "apiBase",
      "providerIds",
    ]);
    baseEl.value = apiBase || DEFAULT_BASE;
    if (Array.isArray(providerIds)) providersEl.value = providerIds.join(", ");
    else if (typeof providerIds === "string") providersEl.value = providerIds;
  } catch (e) {
    baseEl.value = DEFAULT_BASE;
  }
}

async function saveSettings() {
  const apiBase = (baseEl.value || DEFAULT_BASE).trim().replace(/\/+$/, "");
  const providerIds = providersEl.value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  try {
    await chrome.storage.sync.set({ apiBase, providerIds });
  } catch (e) {
    /* ignore */
  }
  return { apiBase, providerIds };
}

async function send() {
  const url = urlEl.value.trim();
  if (!url) {
    setStatus("请输入视频网址", "err");
    return;
  }
  sendEl.disabled = true;
  setStatus("发送中…");
  const { apiBase, providerIds } = await saveSettings();
  try {
    const res = await fetch(`${apiBase}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, provider_ids: providerIds }),
    });
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        detail = data.detail || data.message || detail;
      } catch (e) {
        /* ignore */
      }
      throw new Error(detail);
    }
    setStatus("任务已创建，正在生成笔记。", "ok");
  } catch (e) {
    setStatus("失败：" + (e.message || e), "err");
  } finally {
    sendEl.disabled = false;
  }
}

sendEl.addEventListener("click", send);
baseEl.addEventListener("change", saveSettings);
providersEl.addEventListener("change", saveSettings);

init();
