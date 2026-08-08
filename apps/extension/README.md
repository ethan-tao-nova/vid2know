# Vid2Know 浏览器扩展（MV3）

把当前视频页面一键发送到本地运行的 Vid2Know，自动生成可检索的 Markdown 笔记。

## 功能

- 弹窗中自动填入当前标签页网址，点击「发送到 Vid2Know」即创建任务。
- 右键菜单「发送到 Vid2Know」（页面 / 链接 / 视频均可）。
- 可配置 API 地址（默认 `http://localhost:8080`）与默认模型 ID。
- 设置通过 `chrome.storage.sync` 持久化。

## 前置条件

先在本机启动 Vid2Know API（默认 `http://localhost:8080`）。扩展通过
`POST /api/tasks`（`{ "url": "...", "provider_ids": [] }`）创建任务。

`manifest.json` 的 `host_permissions` 已包含 `http://localhost:8080/*` 与
`http://127.0.0.1:8080/*`。若你的 API 使用其他地址，请：

1. 在弹窗「高级设置」中修改 API 地址；
2. 在 `manifest.json` 的 `host_permissions` 中加入对应地址后重新加载扩展。

## 安装（开发者模式）

1. 打开 `chrome://extensions`（Edge 为 `edge://extensions`）。
2. 打开右上角「开发者模式」。
3. 点击「加载已解压的扩展程序」，选择本目录 `apps/extension`。

## 图标

图标为无依赖脚本生成，如需重新生成：

```bash
node generate-icons.js
```

会在 `icons/` 下生成 `icon16.png` / `icon48.png` / `icon128.png`。

## 文件说明

- `manifest.json` — MV3 清单，声明弹窗、后台 Service Worker 与权限。
- `background.js` — 后台 Service Worker：右键菜单、消息处理、`POST /api/tasks`。
- `popup.html` / `popup.js` — 弹窗界面与逻辑。
- `generate-icons.js` — 生成品牌色 PNG 图标的脚本。
