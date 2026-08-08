const pageTitleEl = document.getElementById("pageTitle");
const pageUrlEl = document.getElementById("pageUrl");
const providerSelectEl = document.getElementById("providerSelect");
const sendBtn = document.getElementById("sendBtn");
const statusEl = document.getElementById("status");
const apiBaseInput = document.getElementById("apiBaseInput");
const saveApiBaseBtn = document.getElementById("saveApiBaseBtn");
const testApiBaseBtn = document.getElementById("testApiBaseBtn");
const openAppLink = document.getElementById("openAppLink");

let currentTab = null;

function setStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.className = "status" + (kind ? ` status--${kind}` : "");
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

async function loadProviders(apiBase) {
  providerSelectEl.innerHTML = "";
  try {
    const base = apiBase.replace(/\/+$/, "");
    const res = await fetch(`${base}/api/providers`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const providers = await res.json();
    const enabled = providers.filter((p) => p.enabled && p.has_api_key);
    for (const p of enabled) {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.name} · ${p.default_model}`;
      providerSelectEl.appendChild(opt);
    }
    if (enabled.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "（尚未配置可用模型）";
      opt.disabled = true;
      providerSelectEl.appendChild(opt);
    }
  } catch {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "（无法连接后端，仅生成原文笔记）";
    opt.disabled = true;
    providerSelectEl.appendChild(opt);
  }
}

function selectedProviderIds() {
  return Array.from(providerSelectEl.selectedOptions)
    .map((o) => o.value)
    .filter(Boolean);
}

async function init() {
  currentTab = await getActiveTab();
  pageTitleEl.textContent = currentTab?.title || "未检测到页面";
  pageUrlEl.textContent = currentTab?.url || "-";

  const apiBase = await Vid2Know.getApiBase();
  apiBaseInput.value = apiBase;
  openAppLink.href = apiBase;

  const isSupported = currentTab?.url ? Vid2Know.isVideoUrl(currentTab.url) : false;
  if (currentTab?.url && !/^https?:\/\//.test(currentTab.url)) {
    sendBtn.disabled = true;
    setStatus("该页面不支持发送（非 http/https 链接）。", "error");
  } else if (!isSupported) {
    setStatus("提示：当前页面看起来不是已知的视频站点，仍可尝试发送。");
  }

  await loadProviders(apiBase);
}

sendBtn.addEventListener("click", async () => {
  if (!currentTab?.url) return;
  sendBtn.disabled = true;
  setStatus("正在发送…");
  try {
    const apiBase = await Vid2Know.getApiBase();
    const task = await Vid2Know.createTask(apiBase, currentTab.url, {
      providerIds: selectedProviderIds(),
    });
    setStatus(`已创建任务${task?.title ? `：${task.title}` : ""}`, "ok");
  } catch (err) {
    setStatus(`发送失败：${err instanceof Error ? err.message : String(err)}`, "error");
  } finally {
    sendBtn.disabled = false;
  }
});

saveApiBaseBtn.addEventListener("click", async () => {
  const value = apiBaseInput.value.trim() || Vid2Know.DEFAULT_API_BASE;
  await Vid2Know.setApiBase(value);
  openAppLink.href = value;
  setStatus("已保存 API 地址。", "ok");
  await loadProviders(value);
});

testApiBaseBtn.addEventListener("click", async () => {
  const value = apiBaseInput.value.trim() || Vid2Know.DEFAULT_API_BASE;
  setStatus("正在测试连接…");
  try {
    await Vid2Know.checkHealth(value);
    setStatus("连接成功。", "ok");
  } catch (err) {
    setStatus(`连接失败：${err instanceof Error ? err.message : String(err)}`, "error");
  }
});

init();
