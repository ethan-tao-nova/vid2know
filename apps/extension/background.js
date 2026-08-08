// MV3 background service worker (classic script — importScripts is available here).
importScripts("common.js");

const MENU_SEND_PAGE = "vid2know-send-page";
const MENU_SEND_LINK = "vid2know-send-link";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_SEND_PAGE,
    title: "发送当前页面到 Vid2Know",
    contexts: ["page", "video"],
  });
  chrome.contextMenus.create({
    id: MENU_SEND_LINK,
    title: "发送该链接到 Vid2Know",
    contexts: ["link"],
  });
});

async function notify(title, message, isError = false) {
  try {
    await chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title,
      message,
      priority: isError ? 2 : 0,
    });
  } catch {
    /* notifications permission may be denied by the OS; ignore */
  }
}

async function sendUrlToVid2Know(url) {
  const apiBase = await self.Vid2Know.getApiBase();
  try {
    const task = await self.Vid2Know.createTask(apiBase, url);
    await notify(
      "已发送到 Vid2Know",
      task?.title ? `任务已创建：${task.title}` : "任务已创建，正在处理中。"
    );
  } catch (err) {
    await notify("发送失败", err instanceof Error ? err.message : String(err), true);
  }
}

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === MENU_SEND_PAGE && info.pageUrl) {
    void sendUrlToVid2Know(info.pageUrl);
  } else if (info.menuItemId === MENU_SEND_LINK && info.linkUrl) {
    void sendUrlToVid2Know(info.linkUrl);
  }
});

// Light up the toolbar badge when the active tab looks like a supported
// video page, as a hint that one click will queue a conversion.
function updateBadgeForTab(tab) {
  if (!tab || !tab.id || !tab.url) return;
  const isVideo = self.Vid2Know.isVideoUrl(tab.url);
  chrome.action.setBadgeText({ tabId: tab.id, text: isVideo ? "•" : "" });
  chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#0f6e56" });
}

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") updateBadgeForTab(tab);
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId).then(updateBadgeForTab).catch(() => undefined);
});

// Allow the popup to delegate task creation through the background page too
// (kept for parity with the context-menu flow; the popup can also call the
// API directly).
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "vid2know:create-task") {
    sendUrlToVid2Know(message.url).then(() => sendResponse({ ok: true }));
    return true;
  }
  return undefined;
});
