# Vid2Know 浏览器扩展 (MV3)

一个 Chrome / Edge Manifest V3 扩展，用于一键把当前网页（B 站、YouTube 等视频页面，或任意链接）发送给本地/远程部署的 Vid2Know 后端，自动创建转换任务。

## 功能

- **工具栏弹窗**：显示当前页面标题与地址，可勾选要并行分析的 AI 模型，点击「发送到 Vid2Know」创建任务。
- **右键菜单**：在任意页面或链接上右键，选择「发送当前页面 / 该链接到 Vid2Know」。
- **状态提醒**：任务创建成功或失败时通过系统通知反馈。
- **徽标提示**：当前标签页是已知视频站点（Bilibili / YouTube）时，工具栏图标显示一个小圆点提示。
- **可配置 API 地址**：默认 `http://127.0.0.1:8080`，可在弹窗「设置」中修改并测试连接，配置保存在 `chrome.storage.sync`。

## 目录结构

```
apps/extension/
├── manifest.json      # MV3 清单
├── background.js       # service worker：右键菜单、通知、徽标
├── common.js            # 弹窗与后台共用的小工具（API 调用等）
├── popup.html/css/js    # 工具栏弹窗 UI
├── icons/                # 16/32/48/128 px 图标
└── README.md
```

## 本地加载（开发调试）

1. 打开 Chrome/Edge，进入 `chrome://extensions`（或 `edge://extensions`）。
2. 打开右上角「开发者模式」。
3. 点击「加载已解压的扩展程序」，选择本目录 `apps/extension/`。
4. 确保 Vid2Know 后端已在 `http://127.0.0.1:8080`（或你在弹窗设置中填写的地址）运行。
5. 打开一个视频页面，点击工具栏图标即可发送。

## 权限说明

| 权限 | 用途 |
| --- | --- |
| `activeTab` | 读取当前标签页的标题与 URL |
| `storage` | 保存自定义的 API 地址 |
| `contextMenus` | 提供右键菜单入口 |
| `notifications` | 任务创建结果的系统通知 |
| `host_permissions`（`localhost` / `127.0.0.1`） | 允许扩展直接向本地部署的 Vid2Know API 发起请求 |

如果你把后端部署在其他域名/公网地址，需要在弹窗「设置」中修改 API 地址，并把该域名加入 `manifest.json` 的 `host_permissions`（否则跨域请求可能被拦截）。

## 打包发布

```bash
cd apps/extension
zip -r ../vid2know-extension.zip . -x "*.DS_Store"
```

将生成的 zip 上传到 Chrome 开发者后台或做企业内部分发。
