# AI Project Journal

> This file is maintained by the `record-project-journal` skill. It records project-relevant conversations, decisions, changes, and verification without storing hidden reasoning or secrets.

## Project Snapshot

- Project: Vid2Know
- Project root: `E:\AI_Development_Tools\Vid2Know`
- Created: 2026-08-08T11:41:26+08:00
- Last updated: 2026-08-08T11:41:27+08:00

## Decision Index

| ID | Date | Decision | Status |
| --- | --- | --- | --- |
<!-- decision-index:start -->
<!-- decision:20260808-video-url-to-document:start -->
| DEC-001 | 2026-08-08 | 支持公开网页视频地址，并为解析失败场景提供合法视频上传兜底。 | accepted |
| DEC-002 | 2026-08-08 | 不绕过登录、付费墙或 DRM。 | accepted |
<!-- decision:20260808-video-url-to-document:end -->
<!-- decision:20260808-vid2know-architecture:start -->
| DEC-003 | 2026-08-08 | 产品采用可安装 PWA 加云端异步处理架构。 | accepted |
| DEC-004 | 2026-08-08 | 同时生成逐字原文版与结构化教程版。 | accepted |
| DEC-005 | 2026-08-08 | 首版在本机通过 Docker Compose 试运行，公网部署延期至域名备案完成。 | accepted |
<!-- decision:20260808-vid2know-architecture:end -->
<!-- decision:20260808-project-name:start -->
| DEC-006 | 2026-08-08 | 产品中文名使用影知，英文名和工程名使用 Vid2Know。 | accepted |
<!-- decision:20260808-project-name:end -->
<!-- decision:20260808-record-project-journal:start -->
| DEC-007 | 2026-08-08 | 所有项目使用根目录单文件 AI_PROJECT_JOURNAL.md。 | accepted |
| DEC-008 | 2026-08-08 | 每个项目任务完成前记录一次用户原话和结构化结论。 | accepted |
| DEC-009 | 2026-08-08 | 附件复制到 .project-journal/assets 并在日志中使用相对链接。 | accepted |
<!-- decision:20260808-record-project-journal:end -->
<!-- decision-index:end -->

## Current Open Items

<!-- open-items:start -->
<!-- open-item:20260808-vid2know-architecture:start -->
- [ ] `20260808-vid2know-architecture` - Vid2Know 主程序尚未开始创建。
- [ ] `20260808-vid2know-architecture` - 公网部署前需要购买域名并完成 ICP 备案。
<!-- open-item:20260808-vid2know-architecture:end -->
<!-- open-item:20260808-project-name:start -->
- [ ] `20260808-project-name` - 正式发布前检查 Vid2Know 相关域名和商标是否可用。
<!-- open-item:20260808-project-name:end -->
<!-- open-item:20260808-record-project-journal:start -->
- [ ] `20260808-record-project-journal` - 完成 Skill 校验、脚本测试和 CC Switch 导入启用。
<!-- open-item:20260808-record-project-journal:end -->
<!-- open-items:end -->

## Conversation Log

<!-- entry:20260808-video-url-to-document:start -->
### 2026-08-08T10:20:00+08:00 | 将网页视频转换为图文教程

- Entry ID: `20260808-video-url-to-document`
- Tool: Codex

**User request (verbatim)**

> 我想把视频中的内容原封不动的转化为文档教程有原文的图片和讲解可以实现嘛？
>
> 补充：是网址上的视频。

**Key response and outcome**

确认可以实现：从合法可访问的视频网页提取音频、原始帧和时间顺序，输出带原文、截图和讲解的教程；同时明确语音识别误差、登录限制、DRM 与版权边界。

**Symptoms or requested behavior**

- 需要把网页视频内容转换成可阅读、可追溯的图文教程。
- 需要保留视频原话、原始画面和讲解顺序。

**Root cause**

- 视频是时间序列媒体，必须将语音时间戳、画面变化和教程章节建立映射。
- 部分网页存在登录、付费墙、下载限制或 DRM，不能承诺任意网址都能直接解析。

**Evidence**

- 用户明确说明输入来源是网页视频地址。
- 目标输出需要同时包含原文图片和讲解。

**Solution**

- 公开且合法可访问的视频使用网页解析和媒体处理流水线。
- 无法解析的网址提供本地视频上传兜底。
- 逐字原文与结构化教程分开生成，并保留时间码。

**Files changed**

- Not applicable.

**Verification**

- 完成需求可行性分析并明确实现边界。

**Open items**

- None.

**Attachments**

- None.
<!-- entry:20260808-video-url-to-document:end -->
<!-- entry:20260808-vid2know-architecture:start -->
### 2026-08-08T10:32:00+08:00 | 确定 Vid2Know 产品与技术方案

- Entry ID: `20260808-vid2know-architecture`
- Tool: Codex

**User request (verbatim)**

> 做成一个小程序，方便使用，要求在任意电脑都能够暗装和使用，需要：输入视频的地址你就直接转化了，格式支持.md、.word、.pdf导出，并且还会给出有哪些知识点通过.xmind格式来给出，可以给出你的方案，同时可以上传到github上，代码同步的修改，用什么框架、用什么实现好点直接给出方案

**Key response and outcome**

形成跨平台 PWA 与云端处理服务方案：输入公开视频地址后生成逐字原文版、结构化教程版和 XMind 知识导图；首版采用 React/Vite、FastAPI、Celery、Redis、PostgreSQL、FFmpeg、yt-dlp、PaddleOCR 与阿里云百炼模型。代码使用 GitHub 私有仓库和自动化流水线管理。

**Symptoms or requested behavior**

- 需要在不同电脑上方便使用，并能主动安装到桌面。
- 需要从一个视频地址自动生成 Markdown、Word、PDF 和 XMind。
- 需要 GitHub 私有仓库同步代码并支持后续自动部署。

**Root cause**

- 视频下载、转写和视觉理解计算量较大，不适合全部放在轻量浏览器客户端。
- 国内个人或小团队使用需要兼顾访问稳定性、成本和模型可用性。
- 当前没有域名和 ICP 备案，暂时不能按大陆公网 PWA 方案正式上线。

**Evidence**

- 用户选择可安装 PWA、云端 API、普通一键安装。
- 用户选择公开视频加上传兜底、双版本输出、GitHub 私有仓库自动部署。
- 用户选择中国大陆云、个人或小团队、文件保留 7 天。
- 用户选择管理员统一模型密钥、单台 ECS 加 OSS、单视频 3 小时或 5 GB。
- 用户确认目前没有域名和备案，首版仅本机试运行。

**Solution**

- 前端使用 React、TypeScript、Vite、Ant Design 和 PWA。
- 后端使用 FastAPI、SQLAlchemy、PostgreSQL、Celery 与 Redis。
- 媒体流水线使用 yt-dlp、FFmpeg、PySceneDetect 和 PaddleOCR。
- 转写和知识整理通过可替换的模型适配层调用 paraformer-v2、qwen-vl-max 和 qwen-max。
- Markdown 与截图打包导出，Word 使用 python-docx，PDF 使用 WeasyPrint，知识树导出 XMind 兼容文件。
- 首版使用 Docker Compose 在本机运行；完成域名和 ICP 备案后迁移到大陆 ECS 与 OSS。

**Files changed**

- Not applicable.

**Verification**

- 完成目标用户、视频范围、文稿风格、数据保留、部署规格和上线阶段的逐项决策。

**Open items**

- Vid2Know 主程序尚未开始创建。
- 公网部署前需要购买域名并完成 ICP 备案。

**Attachments**

- None.
<!-- entry:20260808-vid2know-architecture:end -->
<!-- entry:20260808-project-name:start -->
### 2026-08-08T10:40:00+08:00 | 确定工程名称

- Entry ID: `20260808-project-name`
- Tool: Codex

**User request (verbatim)**

> 工程名称叫什么合适

**Key response and outcome**

推荐产品名“影知”、英文名“Vid2Know”，GitHub 仓库名和工程标识统一使用 vid2know。该名称能够覆盖视频转文档、教程和知识导图，而不局限于某一种导出格式。

**Symptoms or requested behavior**

- 新项目需要统一的产品名、英文名和工程标识。

**Root cause**

- 原工作名称 video-to-tutorial 功能明确，但不利于形成简短产品品牌。

**Evidence**

- 产品能力不只包括教程，还包括逐字稿、文档和知识导图。

**Solution**

- 产品名称使用影知，英文名称和代码仓库使用 Vid2Know/vid2know。
- 正式发布前检查 GitHub、域名和商标占用情况。

**Files changed**

- Not applicable.

**Verification**

- 当前项目目录已经命名为 E:\AI_Development_Tools\Vid2Know。

**Open items**

- 正式发布前检查 Vid2Know 相关域名和商标是否可用。

**Attachments**

- None.
<!-- entry:20260808-project-name:end -->
<!-- entry:20260808-record-project-journal:start -->
### 2026-08-08T11:00:00+08:00 | 创建跨工具项目对话日志 Skill

- Entry ID: `20260808-record-project-journal`
- Tool: Codex

**User request (verbatim)**

> 我和你的对话形成一个专属的文档，用于记录所有的内容，问题的出现和解决办法，文件格式为.md格式，对于当前的项目放在这个位置E:\AI_Development_Tools\Vid2Know，其他项目的话放在工程目录下就行，形成一个适用于全部工具的skills

**Key response and outcome**

设计并开始实现 record-project-journal 通用 Skill：每个项目任务完成前维护根目录 AI_PROJECT_JOURNAL.md，记录用户原话、关键答复、问题、原因、方案、改动、验证、决策、遗留事项和附件。Skill 使用标准 SKILL.md，并通过 CC Switch ZIP 分发给多个工具。初始化时短描述长度校验失败属于本地元数据校验问题，并非网络连接故障，随后改用符合要求的描述继续。

**Symptoms or requested behavior**

- 不同 AI 工具之间缺少统一、持久、可版本管理的项目对话记录。
- 临时截图路径可能失效，需要复制到项目内并使用相对链接。
- Skill 初始化第一次因 short_description 长度不足而中止。

**Root cause**

- 各工具的聊天历史和上下文相互隔离，必须把项目知识写入工程文件。
- Skill 的界面短描述要求 25 到 64 个字符，第一次提供的中文描述只有 20 个字符。
- 仅安装 Skill 不能保证所有工具每轮都隐式触发，需要 Skill 描述与全局规则双重保障。

**Evidence**

- Vid2Know 目录存在且最初为空。
- skill-creator 初始化输出明确报告 short_description must be 25-64 characters (got 20)。
- CC Switch 截图显示 Skills 管理页以及 Claude、Codex、Gemini、Grok Build、OpenCode、Hermes 的分发状态。

**Solution**

- 创建标准 SKILL.md、Codex 界面元数据、Markdown 模板和无第三方依赖的 Python 更新脚本。
- 更新脚本使用稳定记录 ID、锁文件、原子替换、附件 SHA-256 去重和常见密钥模式脱敏。
- 当前项目固定写入 E:\AI_Development_Tools\Vid2Know；其他项目自动识别 Git 根目录或使用当前工程目录。
- 生成顶层包含 record-project-journal 文件夹的 CC Switch ZIP 导入包。

**Files changed**

- E:\AI_Development_Tools\SharedSkills\record-project-journal - 通用 Skill 源码。
- E:\AI_Development_Tools\Vid2Know\AI_PROJECT_JOURNAL.md - 项目对话日志。
- E:\AI_Development_Tools\Vid2Know\.project-journal\assets - 持久化附件目录。
- E:\AI_Development_Tools\Vid2Know\.gitignore - 忽略锁、临时文件和条目输入文件。

**Verification**

- 待完成 Skill 校验、脚本测试、ZIP 内容检查和 CC Switch 导入验证。

**Open items**

- 完成 Skill 校验、脚本测试和 CC Switch 导入启用。

**Attachments**

- ![CC Switch Skills 管理与多工具分发截图](<.project-journal/assets/2026-08-08/5fc342cebc2a-codex-clipboard-fc7a8da1-e44f-4e3c-bd32-3541a4790b4d.png>) (`5fc342cebc2a`)
<!-- entry:20260808-record-project-journal:end -->
<!-- Entries are maintained by stable entry markers below. -->
