export type LocaleKey = "zh-CN" | "en" | "ja";

export const LOCALE_OPTIONS: { value: LocaleKey; label: string }[] = [
  { value: "zh-CN", label: "简体中文" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
];

export type Messages = {
  common: {
    appName: string;
    tagline: string;
    save: string;
    cancel: string;
    confirm: string;
    delete: string;
    edit: string;
    close: string;
    retry: string;
    refresh: string;
    copy: string;
    copied: string;
    loading: string;
    submit: string;
    search: string;
    reset: string;
    yes: string;
    no: string;
    open: string;
    download: string;
    test: string;
    add: string;
    browse: string;
    optional: string;
    seconds: string;
    all: string;
    none: string;
    saved: string;
    failed: string;
    success: string;
    unknownError: string;
    back: string;
    more: string;
    less: string;
    theme: string;
    language: string;
    light: string;
    dark: string;
    system: string;
    online: string;
    offline: string;
  };
  nav: {
    home: string;
    tasks: string;
    providers: string;
    settings: string;
    logs: string;
  };
  home: {
    title: string;
    subtitle: string;
    composerPlaceholder: string;
    startConvert: string;
    uploadLocal: string;
    advanced: string;
    aiProviders: string;
    noProviders: string;
    promptTemplate: string;
    defaultTemplate: string;
    clipRange: string;
    clipStart: string;
    clipEnd: string;
    clipHint: string;
    taskCreated: string;
    uploadCreated: string;
    needUrl: string;
    searchPlaceholder: string;
    modeAuto: string;
    modeText: string;
    modeSemantic: string;
    statusFilter: string;
    allStatus: string;
    emptyTitle: string;
    emptyDesc: string;
    emptyCta: string;
    cardOpen: string;
    cardCancel: string;
    cardRetry: string;
    cardAnalyze: string;
    cardDelete: string;
    deleteTitle: string;
    deleteDesc: string;
    deleteNotesOption: string;
    duplicateTitle: string;
    duplicateDesc: string;
    duplicateOpen: string;
    duplicateCreate: string;
    uploading: string;
    multiUrlHint: string;
  };
  detail: {
    back: string;
    outline: string;
    artifacts: string;
    noArtifacts: string;
    export: string;
    exportZip: string;
    exportMd: string;
    exportDocx: string;
    exportPdf: string;
    exportXmind: string;
    analyze: string;
    reanalyze: string;
    usage: string;
    tokens: string;
    promptTokens: string;
    completionTokens: string;
    totalTokens: string;
    cost: string;
    compare: string;
    compareHint: string;
    compareLeft: string;
    compareRight: string;
    exitCompare: string;
    openFolder: string;
    copyMarkdown: string;
    notReady: string;
    progress: string;
    source: string;
    notesPath: string;
    analyses: string;
    noAnalyses: string;
    reindex: string;
    reindexDone: string;
    notFound: string;
    exportStarted: string;
    exportFailed: string;
  };
  analyze: {
    title: string;
    selectProviders: string;
    selectTemplate: string;
    noneTemplate: string;
    start: string;
    needProvider: string;
    started: string;
    hint: string;
  };
  settings: {
    title: string;
    subtitle: string;
    notesRoot: string;
    notesRootHint: string;
    videoCacheRoot: string;
    videoCacheRootHint: string;
    autoDelete: string;
    autoDeleteHint: string;
    cookiesFile: string;
    cookiesFileHint: string;
    cookiesWarnTitle: string;
    cookiesWarnDesc: string;
    whisperModel: string;
    whisperHint: string;
    sceneThreshold: string;
    maxKeyframes: string;
    ocrEnabled: string;
    defaultLocale: string;
    analysisLanguage: string;
    analysisLanguageHint: string;
    qualityPreset: string;
    qualityFast: string;
    qualityBalanced: string;
    qualityHigh: string;
    qualityHint: string;
    usageCard: string;
    usageEmpty: string;
    reindex: string;
    reindexHint: string;
    reindexDone: string;
    electronHint: string;
    saved: string;
  };
  providers: {
    title: string;
    subtitle: string;
    name: string;
    type: string;
    model: string;
    enabled: string;
    key: string;
    keyMissing: string;
    actions: string;
    editTitle: string;
    baseUrl: string;
    apiKey: string;
    apiKeyHint: string;
    defaultModel: string;
    temperature: string;
    timeout: string;
    systemPrompt: string;
    systemPromptHint: string;
    saved: string;
    testOk: string;
    add: string;
    deleteConfirm: string;
  };
  logs: {
    title: string;
    subtitle: string;
    empty: string;
    level: string;
    autoScroll: string;
    clear: string;
    unavailable: string;
  };
};

const zhCN: Messages = {
  common: {
    appName: "影知 Vid2Know",
    tagline: "把视频变成可检索的 Markdown 知识",
    save: "保存",
    cancel: "取消",
    confirm: "确定",
    delete: "删除",
    edit: "编辑",
    close: "关闭",
    retry: "重试",
    refresh: "刷新",
    copy: "复制",
    copied: "已复制",
    loading: "加载中…",
    submit: "提交",
    search: "搜索",
    reset: "重置",
    yes: "是",
    no: "否",
    open: "打开",
    download: "下载",
    test: "测试",
    add: "新增",
    browse: "浏览",
    optional: "可选",
    seconds: "秒",
    all: "全部",
    none: "无",
    saved: "已保存",
    failed: "失败",
    success: "成功",
    unknownError: "未知错误",
    back: "返回",
    more: "更多",
    less: "收起",
    theme: "主题",
    language: "语言",
    light: "浅色",
    dark: "深色",
    system: "跟随系统",
    online: "已连接",
    offline: "未连接",
  },
  nav: {
    home: "首页",
    tasks: "任务",
    providers: "AI 模型",
    settings: "设置",
    logs: "日志",
  },
  home: {
    title: "视频网址 → Markdown 笔记",
    subtitle:
      "输入 B 站 / YouTube 等公开视频地址，自动抽取字幕或语音转写、关键帧与 OCR，并可选多模型并行分析。",
    composerPlaceholder:
      "粘贴视频网址，支持多行批量，例如：\nhttps://www.bilibili.com/video/BVxxxx",
    startConvert: "开始转换",
    uploadLocal: "上传本地视频",
    advanced: "高级选项",
    aiProviders: "同时分析的 AI（可多选）",
    noProviders: "尚未启用带 API Key 的模型，可先到「AI 模型」页配置，或仅生成原文笔记。",
    promptTemplate: "提示词模板",
    defaultTemplate: "默认模板",
    clipRange: "截取片段",
    clipStart: "开始（秒）",
    clipEnd: "结束（秒）",
    clipHint: "仅处理视频的某个时间段，留空表示整段。",
    taskCreated: "任务已创建",
    uploadCreated: "上传任务已创建",
    needUrl: "请输入视频网址",
    searchPlaceholder: "搜索标题或来源",
    modeAuto: "自动",
    modeText: "关键词",
    modeSemantic: "语义",
    statusFilter: "状态",
    allStatus: "全部状态",
    emptyTitle: "还没有任务",
    emptyDesc: "粘贴一个视频网址开始，或上传本地视频文件。",
    emptyCta: "创建第一个任务",
    cardOpen: "查看笔记",
    cardCancel: "取消",
    cardRetry: "重试",
    cardAnalyze: "分析",
    cardDelete: "删除",
    deleteTitle: "删除任务",
    deleteDesc: "该操作不可撤销，确定要删除此任务吗？",
    deleteNotesOption: "同时删除已生成的笔记与图片文件",
    duplicateTitle: "任务已存在",
    duplicateDesc: "该视频已经创建过任务，你可以直接打开已有任务，或强制再次创建。",
    duplicateOpen: "打开已有任务",
    duplicateCreate: "仍然创建",
    uploading: "上传中",
    multiUrlHint: "支持一行一个网址批量创建。",
  },
  detail: {
    back: "返回列表",
    outline: "大纲",
    artifacts: "产物文件",
    noArtifacts: "暂无产物文件",
    export: "导出",
    exportZip: "打包 ZIP",
    exportMd: "Markdown",
    exportDocx: "Word (docx)",
    exportPdf: "PDF",
    exportXmind: "XMind 脑图",
    analyze: "分析",
    reanalyze: "重新分析",
    usage: "用量",
    tokens: "Token",
    promptTokens: "输入 Token",
    completionTokens: "输出 Token",
    totalTokens: "总 Token",
    cost: "费用",
    compare: "对比分析",
    compareHint: "选择两个分析结果并排对比。",
    compareLeft: "左侧",
    compareRight: "右侧",
    exitCompare: "退出对比",
    openFolder: "打开所在文件夹",
    copyMarkdown: "复制 Markdown",
    notReady: "笔记尚未生成，处理完成后自动显示。",
    progress: "进度",
    source: "来源",
    notesPath: "笔记目录",
    analyses: "AI 分析",
    noAnalyses: "尚无 AI 分析结果，可点击「分析」生成。",
    reindex: "重建索引",
    reindexDone: "索引已重建",
    notFound: "任务不存在",
    exportStarted: "已开始导出",
    exportFailed: "导出失败",
  },
  analyze: {
    title: "运行 AI 分析",
    selectProviders: "选择模型（可多选）",
    selectTemplate: "提示词模板",
    noneTemplate: "不使用模板（默认提示词）",
    start: "开始分析",
    needProvider: "请至少选择一个模型",
    started: "已提交分析任务",
    hint: "所选模型将基于本任务的转写与截图并行生成分析笔记。",
  },
  settings: {
    title: "设置",
    subtitle: "配置笔记目录、临时视频目录、Cookie、转写与分析参数。",
    notesRoot: "笔记与图片根目录",
    notesRootHint: "每个任务会在该目录下创建子文件夹，图片保存在 images/",
    videoCacheRoot: "临时视频下载目录",
    videoCacheRootHint:
      "Docker 默认 /data/cache（对应宿主机 data/cache）。自定义宿主机路径需先挂载进容器。",
    autoDelete: "分析完成后自动删除临时视频",
    autoDeleteHint: "开启后只保留 Markdown 笔记与截图，不保留完整视频文件",
    cookiesFile: "Cookies 文件路径",
    cookiesFileHint: "Netscape cookies.txt；解决 412 与拉取字幕",
    cookiesWarnTitle: "B 站 412 提示",
    cookiesWarnDesc:
      "下载 B 站视频请先登录后导出 cookies.txt，放到仓库 config/cookies.txt，并在下方填写 /config/cookies.txt。",
    whisperModel: "Whisper 模型",
    whisperHint: "tiny / base / small / medium，越大越准也越慢",
    sceneThreshold: "场景检测阈值",
    maxKeyframes: "最大关键帧数",
    ocrEnabled: "启用 OCR",
    defaultLocale: "界面默认语言",
    analysisLanguage: "分析输出语言",
    analysisLanguageHint: "AI 分析笔记使用的语言，可与界面语言不同。",
    qualityPreset: "质量预设",
    qualityFast: "快速",
    qualityBalanced: "均衡",
    qualityHigh: "高质量",
    qualityHint: "在速度与质量之间快速切换转写与截图参数。",
    usageCard: "累计用量",
    usageEmpty: "暂无用量数据",
    reindex: "重建全部索引",
    reindexHint: "重新扫描并索引所有笔记，用于搜索恢复。",
    reindexDone: "索引已重建",
    electronHint: "当前为 Electron 桌面端，可浏览本机路径。",
    saved: "设置已保存",
  },
  providers: {
    title: "AI 模型",
    subtitle:
      "通过 OpenAI Compatible / Claude / Gemini 适配器配置任意 API，可启用多个模型并在任务中并行分析。",
    name: "名称",
    type: "类型",
    model: "模型",
    enabled: "启用",
    key: "Key",
    keyMissing: "未配置",
    actions: "操作",
    editTitle: "编辑模型",
    baseUrl: "Base URL",
    apiKey: "API Key",
    apiKeyHint: "留空则保留原值",
    defaultModel: "默认模型",
    temperature: "Temperature",
    timeout: "超时（秒）",
    systemPrompt: "系统提示词",
    systemPromptHint: "作为该模型分析时的默认系统提示词（可选）。",
    saved: "已保存",
    testOk: "连通成功",
    add: "新增模型",
    deleteConfirm: "确定删除该模型配置？",
  },
  logs: {
    title: "运行日志",
    subtitle: "查看后台处理与分析的实时日志。",
    empty: "暂无日志",
    level: "级别",
    autoScroll: "自动滚动",
    clear: "清空显示",
    unavailable: "当前后端未提供日志接口。",
  },
};

const en: Messages = {
  common: {
    appName: "Vid2Know",
    tagline: "Turn videos into searchable Markdown knowledge",
    save: "Save",
    cancel: "Cancel",
    confirm: "OK",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    retry: "Retry",
    refresh: "Refresh",
    copy: "Copy",
    copied: "Copied",
    loading: "Loading…",
    submit: "Submit",
    search: "Search",
    reset: "Reset",
    yes: "Yes",
    no: "No",
    open: "Open",
    download: "Download",
    test: "Test",
    add: "Add",
    browse: "Browse",
    optional: "optional",
    seconds: "s",
    all: "All",
    none: "None",
    saved: "Saved",
    failed: "Failed",
    success: "Success",
    unknownError: "Unknown error",
    back: "Back",
    more: "More",
    less: "Less",
    theme: "Theme",
    language: "Language",
    light: "Light",
    dark: "Dark",
    system: "System",
    online: "Online",
    offline: "Offline",
  },
  nav: {
    home: "Home",
    tasks: "Tasks",
    providers: "AI Models",
    settings: "Settings",
    logs: "Logs",
  },
  home: {
    title: "Video URL → Markdown notes",
    subtitle:
      "Paste a public video URL (Bilibili / YouTube …) to auto-extract subtitles or speech, keyframes and OCR, with optional multi-model analysis.",
    composerPlaceholder:
      "Paste a video URL. Multiple lines are supported, e.g.\nhttps://www.bilibili.com/video/BVxxxx",
    startConvert: "Convert",
    uploadLocal: "Upload local file",
    advanced: "Advanced",
    aiProviders: "Analyze with AI (multi-select)",
    noProviders:
      "No enabled model with an API key yet. Configure one under \"AI Models\", or just generate raw notes.",
    promptTemplate: "Prompt template",
    defaultTemplate: "Default template",
    clipRange: "Clip range",
    clipStart: "Start (s)",
    clipEnd: "End (s)",
    clipHint: "Process only a time range of the video. Leave empty for the whole clip.",
    taskCreated: "Task created",
    uploadCreated: "Upload task created",
    needUrl: "Please enter a video URL",
    searchPlaceholder: "Search title or source",
    modeAuto: "Auto",
    modeText: "Keyword",
    modeSemantic: "Semantic",
    statusFilter: "Status",
    allStatus: "All statuses",
    emptyTitle: "No tasks yet",
    emptyDesc: "Paste a video URL to begin, or upload a local video file.",
    emptyCta: "Create your first task",
    cardOpen: "Open notes",
    cardCancel: "Cancel",
    cardRetry: "Retry",
    cardAnalyze: "Analyze",
    cardDelete: "Delete",
    deleteTitle: "Delete task",
    deleteDesc: "This cannot be undone. Delete this task?",
    deleteNotesOption: "Also delete generated notes and image files",
    duplicateTitle: "Task already exists",
    duplicateDesc:
      "This video already has a task. Open the existing one, or force-create a new task.",
    duplicateOpen: "Open existing",
    duplicateCreate: "Create anyway",
    uploading: "Uploading",
    multiUrlHint: "One URL per line for batch creation.",
  },
  detail: {
    back: "Back to list",
    outline: "Outline",
    artifacts: "Artifacts",
    noArtifacts: "No artifacts yet",
    export: "Export",
    exportZip: "ZIP bundle",
    exportMd: "Markdown",
    exportDocx: "Word (docx)",
    exportPdf: "PDF",
    exportXmind: "XMind",
    analyze: "Analyze",
    reanalyze: "Re-analyze",
    usage: "Usage",
    tokens: "Tokens",
    promptTokens: "Prompt tokens",
    completionTokens: "Completion tokens",
    totalTokens: "Total tokens",
    cost: "Cost",
    compare: "Compare",
    compareHint: "Pick two analyses to compare side by side.",
    compareLeft: "Left",
    compareRight: "Right",
    exitCompare: "Exit compare",
    openFolder: "Open folder",
    copyMarkdown: "Copy Markdown",
    notReady: "Notes are not ready yet; they appear once processing finishes.",
    progress: "Progress",
    source: "Source",
    notesPath: "Notes path",
    analyses: "AI analyses",
    noAnalyses: "No AI analysis yet. Click \"Analyze\" to generate one.",
    reindex: "Reindex",
    reindexDone: "Reindexed",
    notFound: "Task not found",
    exportStarted: "Export started",
    exportFailed: "Export failed",
  },
  analyze: {
    title: "Run AI analysis",
    selectProviders: "Select models (multi-select)",
    selectTemplate: "Prompt template",
    noneTemplate: "No template (default prompt)",
    start: "Start analysis",
    needProvider: "Select at least one model",
    started: "Analysis submitted",
    hint: "Selected models generate analysis notes from this task's transcript and frames in parallel.",
  },
  settings: {
    title: "Settings",
    subtitle:
      "Configure notes directory, temp video directory, cookies, transcription and analysis parameters.",
    notesRoot: "Notes & images root",
    notesRootHint: "Each task gets a subfolder here; images go under images/",
    videoCacheRoot: "Temp video download directory",
    videoCacheRootHint:
      "Docker defaults to /data/cache. A custom host path must be mounted into the container first.",
    autoDelete: "Auto-delete temp video after analysis",
    autoDeleteHint: "Keep only Markdown notes and screenshots, not the full video.",
    cookiesFile: "Cookies file path",
    cookiesFileHint: "Netscape cookies.txt; fixes 412 and enables subtitle fetch",
    cookiesWarnTitle: "Bilibili 412 note",
    cookiesWarnDesc:
      "To download Bilibili videos, log in and export cookies.txt to config/cookies.txt, then set /config/cookies.txt below.",
    whisperModel: "Whisper model",
    whisperHint: "tiny / base / small / medium — larger is more accurate but slower",
    sceneThreshold: "Scene detection threshold",
    maxKeyframes: "Max keyframes",
    ocrEnabled: "Enable OCR",
    defaultLocale: "UI default language",
    analysisLanguage: "Analysis output language",
    analysisLanguageHint: "Language for AI analysis notes; may differ from the UI language.",
    qualityPreset: "Quality preset",
    qualityFast: "Fast",
    qualityBalanced: "Balanced",
    qualityHigh: "High quality",
    qualityHint: "Quickly switch transcription and frame parameters for speed vs quality.",
    usageCard: "Cumulative usage",
    usageEmpty: "No usage data yet",
    reindex: "Reindex everything",
    reindexHint: "Rescan and index all notes to restore search.",
    reindexDone: "Reindexed",
    electronHint: "Desktop (Electron) mode — you can browse local paths.",
    saved: "Settings saved",
  },
  providers: {
    title: "AI Models",
    subtitle:
      "Configure any API via OpenAI Compatible / Claude / Gemini adapters. Enable multiple models to analyze in parallel.",
    name: "Name",
    type: "Type",
    model: "Model",
    enabled: "Enabled",
    key: "Key",
    keyMissing: "Not set",
    actions: "Actions",
    editTitle: "Edit model",
    baseUrl: "Base URL",
    apiKey: "API Key",
    apiKeyHint: "Leave empty to keep the current value",
    defaultModel: "Default model",
    temperature: "Temperature",
    timeout: "Timeout (s)",
    systemPrompt: "System prompt",
    systemPromptHint: "Default system prompt used by this model when analyzing (optional).",
    saved: "Saved",
    testOk: "Connection OK",
    add: "Add model",
    deleteConfirm: "Delete this model configuration?",
  },
  logs: {
    title: "Logs",
    subtitle: "Live logs from background processing and analysis.",
    empty: "No logs",
    level: "Level",
    autoScroll: "Auto-scroll",
    clear: "Clear view",
    unavailable: "The backend does not expose a logs endpoint.",
  },
};

const ja: Messages = {
  common: {
    appName: "影知 Vid2Know",
    tagline: "動画を検索可能な Markdown ナレッジに",
    save: "保存",
    cancel: "キャンセル",
    confirm: "OK",
    delete: "削除",
    edit: "編集",
    close: "閉じる",
    retry: "再試行",
    refresh: "更新",
    copy: "コピー",
    copied: "コピーしました",
    loading: "読み込み中…",
    submit: "送信",
    search: "検索",
    reset: "リセット",
    yes: "はい",
    no: "いいえ",
    open: "開く",
    download: "ダウンロード",
    test: "テスト",
    add: "追加",
    browse: "参照",
    optional: "任意",
    seconds: "秒",
    all: "すべて",
    none: "なし",
    saved: "保存しました",
    failed: "失敗",
    success: "成功",
    unknownError: "不明なエラー",
    back: "戻る",
    more: "もっと見る",
    less: "閉じる",
    theme: "テーマ",
    language: "言語",
    light: "ライト",
    dark: "ダーク",
    system: "システム",
    online: "接続済み",
    offline: "未接続",
  },
  nav: {
    home: "ホーム",
    tasks: "タスク",
    providers: "AI モデル",
    settings: "設定",
    logs: "ログ",
  },
  home: {
    title: "動画 URL → Markdown ノート",
    subtitle:
      "Bilibili / YouTube などの公開動画 URL を入力すると、字幕や音声書き起こし、キーフレーム、OCR を自動抽出し、複数モデルでの並列分析も可能です。",
    composerPlaceholder:
      "動画 URL を貼り付け。複数行の一括入力にも対応：\nhttps://www.bilibili.com/video/BVxxxx",
    startConvert: "変換する",
    uploadLocal: "ローカル動画をアップロード",
    advanced: "詳細設定",
    aiProviders: "分析する AI（複数選択可）",
    noProviders:
      "API キー付きの有効なモデルがありません。「AI モデル」で設定するか、原文ノートのみ生成します。",
    promptTemplate: "プロンプトテンプレート",
    defaultTemplate: "デフォルトテンプレート",
    clipRange: "切り出し範囲",
    clipStart: "開始（秒）",
    clipEnd: "終了（秒）",
    clipHint: "動画の一部分のみ処理します。空欄で全体。",
    taskCreated: "タスクを作成しました",
    uploadCreated: "アップロードタスクを作成しました",
    needUrl: "動画 URL を入力してください",
    searchPlaceholder: "タイトルまたはソースを検索",
    modeAuto: "自動",
    modeText: "キーワード",
    modeSemantic: "セマンティック",
    statusFilter: "ステータス",
    allStatus: "すべてのステータス",
    emptyTitle: "タスクがありません",
    emptyDesc: "動画 URL を貼り付けて開始するか、ローカル動画をアップロードしてください。",
    emptyCta: "最初のタスクを作成",
    cardOpen: "ノートを開く",
    cardCancel: "キャンセル",
    cardRetry: "再試行",
    cardAnalyze: "分析",
    cardDelete: "削除",
    deleteTitle: "タスクを削除",
    deleteDesc: "この操作は取り消せません。削除しますか？",
    deleteNotesOption: "生成済みのノートと画像ファイルも削除する",
    duplicateTitle: "タスクは既に存在します",
    duplicateDesc:
      "この動画のタスクは既にあります。既存を開くか、強制的に新規作成できます。",
    duplicateOpen: "既存を開く",
    duplicateCreate: "それでも作成",
    uploading: "アップロード中",
    multiUrlHint: "1 行 1 URL で一括作成できます。",
  },
  detail: {
    back: "一覧に戻る",
    outline: "アウトライン",
    artifacts: "生成物",
    noArtifacts: "生成物はまだありません",
    export: "エクスポート",
    exportZip: "ZIP パッケージ",
    exportMd: "Markdown",
    exportDocx: "Word (docx)",
    exportPdf: "PDF",
    exportXmind: "XMind",
    analyze: "分析",
    reanalyze: "再分析",
    usage: "使用量",
    tokens: "トークン",
    promptTokens: "入力トークン",
    completionTokens: "出力トークン",
    totalTokens: "合計トークン",
    cost: "コスト",
    compare: "比較",
    compareHint: "2 つの分析結果を並べて比較します。",
    compareLeft: "左",
    compareRight: "右",
    exitCompare: "比較を終了",
    openFolder: "フォルダを開く",
    copyMarkdown: "Markdown をコピー",
    notReady: "ノートはまだ生成されていません。処理完了後に表示されます。",
    progress: "進捗",
    source: "ソース",
    notesPath: "ノートの場所",
    analyses: "AI 分析",
    noAnalyses: "AI 分析結果がありません。「分析」で生成できます。",
    reindex: "再インデックス",
    reindexDone: "再インデックスしました",
    notFound: "タスクが見つかりません",
    exportStarted: "エクスポートを開始しました",
    exportFailed: "エクスポートに失敗しました",
  },
  analyze: {
    title: "AI 分析を実行",
    selectProviders: "モデルを選択（複数可）",
    selectTemplate: "プロンプトテンプレート",
    noneTemplate: "テンプレートなし（デフォルト）",
    start: "分析を開始",
    needProvider: "モデルを 1 つ以上選択してください",
    started: "分析を送信しました",
    hint: "選択したモデルが、書き起こしとフレームから並列で分析ノートを生成します。",
  },
  settings: {
    title: "設定",
    subtitle:
      "ノートディレクトリ、一時動画ディレクトリ、Cookie、書き起こし・分析パラメータを設定します。",
    notesRoot: "ノート・画像のルート",
    notesRootHint: "各タスクはここにサブフォルダを作成し、画像は images/ に保存されます",
    videoCacheRoot: "一時動画ダウンロード先",
    videoCacheRootHint:
      "Docker のデフォルトは /data/cache。カスタムパスは先にコンテナへマウントが必要です。",
    autoDelete: "分析後に一時動画を自動削除",
    autoDeleteHint: "Markdown ノートとスクリーンショットのみ保持し、動画は残しません。",
    cookiesFile: "Cookies ファイルのパス",
    cookiesFileHint: "Netscape cookies.txt。412 の回避と字幕取得に使用",
    cookiesWarnTitle: "Bilibili 412 について",
    cookiesWarnDesc:
      "Bilibili のダウンロードにはログイン後 cookies.txt を config/cookies.txt に書き出し、下に /config/cookies.txt を設定してください。",
    whisperModel: "Whisper モデル",
    whisperHint: "tiny / base / small / medium。大きいほど正確だが低速",
    sceneThreshold: "シーン検出しきい値",
    maxKeyframes: "最大キーフレーム数",
    ocrEnabled: "OCR を有効化",
    defaultLocale: "UI 既定言語",
    analysisLanguage: "分析出力言語",
    analysisLanguageHint: "AI 分析ノートの言語。UI 言語と異なっても構いません。",
    qualityPreset: "品質プリセット",
    qualityFast: "高速",
    qualityBalanced: "バランス",
    qualityHigh: "高品質",
    qualityHint: "速度と品質のパラメータを素早く切り替えます。",
    usageCard: "累計使用量",
    usageEmpty: "使用量データがありません",
    reindex: "全体を再インデックス",
    reindexHint: "全ノートを再スキャン・インデックスして検索を復旧します。",
    reindexDone: "再インデックスしました",
    electronHint: "デスクトップ（Electron）モード。ローカルパスを参照できます。",
    saved: "設定を保存しました",
  },
  providers: {
    title: "AI モデル",
    subtitle:
      "OpenAI Compatible / Claude / Gemini アダプタで任意の API を設定。複数モデルを有効化して並列分析できます。",
    name: "名称",
    type: "種類",
    model: "モデル",
    enabled: "有効",
    key: "キー",
    keyMissing: "未設定",
    actions: "操作",
    editTitle: "モデルを編集",
    baseUrl: "Base URL",
    apiKey: "API キー",
    apiKeyHint: "空欄の場合は現在の値を保持",
    defaultModel: "既定モデル",
    temperature: "Temperature",
    timeout: "タイムアウト（秒）",
    systemPrompt: "システムプロンプト",
    systemPromptHint: "このモデルが分析時に使う既定のシステムプロンプト（任意）。",
    saved: "保存しました",
    testOk: "接続成功",
    add: "モデルを追加",
    deleteConfirm: "このモデル設定を削除しますか？",
  },
  logs: {
    title: "ログ",
    subtitle: "バックエンド処理と分析のリアルタイムログ。",
    empty: "ログはありません",
    level: "レベル",
    autoScroll: "自動スクロール",
    clear: "表示をクリア",
    unavailable: "バックエンドはログ API を提供していません。",
  },
};

export const MESSAGES: Record<LocaleKey, Messages> = {
  "zh-CN": zhCN,
  en,
  ja,
};

export const DEFAULT_LOCALE: LocaleKey = "zh-CN";
