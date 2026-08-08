import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Dropdown,
  Empty,
  List,
  Progress,
  Segmented,
  Select,
  Space,
  Spin,
  Statistic,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  DownloadOutlined,
  ExperimentOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import IllustratedMarkdown from "../components/IllustratedMarkdown";
import DocOutline from "../components/DocOutline";
import AnalyzeModal, { type AnalyzeSelection } from "../components/AnalyzeModal";
import { useT } from "../i18n/LocaleContext";
import { useSmartPoll } from "../hooks/useSmartPoll";
import { useTaskEvents } from "../hooks/useTaskEvents";
import {
  analyzeTask,
  assetUrl,
  downloadExport,
  errorMessage,
  fetchArtifacts,
  fetchNote,
  fetchProviders,
  fetchTask,
  fetchTemplates,
  reindexTask,
  type Artifact,
  type ExportFormat,
  type Provider,
  type PromptTemplate,
  type Task,
} from "../api/client";
import { isActive, statusColor } from "../utils/status";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function TaskDetailPage() {
  const t = useT();
  const { id } = useParams();

  const [task, setTask] = useState<Task | null>(null);
  const [note, setNote] = useState<string>("");
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [compare, setCompare] = useState(false);
  const [leftId, setLeftId] = useState<string | undefined>();
  const [rightId, setRightId] = useState<string | undefined>();
  const [liveProgress, setLiveProgress] = useState<number | null>(null);
  const [liveMessage, setLiveMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const fresh = await fetchTask(id);
      setTask(fresh);
      if (fresh.status === "completed") {
        try {
          const n = await fetchNote(id);
          setNote(n.content);
        } catch {
          /* note may still be missing */
        }
        setArtifacts(await fetchArtifacts(id));
      }
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
    fetchProviders().then(setProviders).catch(() => undefined);
    fetchTemplates().then(setTemplates).catch(() => undefined);
  }, [load]);

  const stillActive = task ? isActive(task.status) : false;

  // SSE with polling fallback: poll only while active and not connected.
  const { connected } = useTaskEvents(
    id,
    (e) => {
      if (typeof e.progress === "number") setLiveProgress(e.progress);
      if (typeof e.message === "string") setLiveMessage(e.message);
      if (
        e.type === "completed" ||
        e.type === "failed" ||
        e.status === "completed" ||
        e.status === "failed"
      ) {
        void load();
      }
    },
    stillActive
  );

  useSmartPoll(load, 3000, stillActive && !connected);

  const analyses = task?.analyses ?? [];

  useEffect(() => {
    if (analyses.length >= 2) {
      setLeftId((prev) => prev ?? analyses[0].id ?? analyses[0].provider_id);
      setRightId((prev) => prev ?? analyses[1].id ?? analyses[1].provider_id);
    }
  }, [analyses.length]);

  const analysisKey = (a: (typeof analyses)[number]) =>
    a.id ?? a.provider_id;

  const usage = task?.usage;

  const onAnalyzeSubmit = async (sel: AnalyzeSelection) => {
    if (!task) return;
    setAnalyzeLoading(true);
    try {
      await analyzeTask(task.id, {
        provider_ids: sel.provider_ids,
        template_id: sel.template_id,
      });
      message.success(t.analyze.started);
      setAnalyzeOpen(false);
      await load();
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const onExport = async (format: ExportFormat) => {
    if (!task) return;
    setExporting(true);
    try {
      const blob = await downloadExport(task.id, format);
      const base = (task.title || task.id).replace(/[^\w\u4e00-\u9fa5-]+/g, "_");
      const ext = format === "zip" ? "zip" : format === "md" ? "md" : format;
      triggerDownload(blob, `${base}.${ext}`);
      message.success(t.detail.exportStarted);
    } catch (e) {
      message.error(`${t.detail.exportFailed}: ${errorMessage(e)}`);
    } finally {
      setExporting(false);
    }
  };

  const onOpenFolder = async () => {
    if (!task?.notes_path) return;
    try {
      await window.vid2know?.openPath?.(task.notes_path);
    } catch (e) {
      message.error(errorMessage(e));
    }
  };

  const onReindex = async () => {
    if (!task) return;
    await reindexTask(task.id);
    message.success(t.detail.reindexDone);
  };

  const exportItems = useMemo(
    () => [
      { key: "zip", label: t.detail.exportZip },
      { key: "md", label: t.detail.exportMd },
      { key: "docx", label: t.detail.exportDocx },
      { key: "pdf", label: t.detail.exportPdf },
      { key: "xmind", label: t.detail.exportXmind },
    ],
    [t]
  );

  if (loading && !task) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }
  if (!task) return <Alert type="error" showIcon message={t.detail.notFound} />;

  const displayProgress =
    liveProgress != null ? Math.round(liveProgress) : Math.round(task.progress);
  const displayMessage = liveMessage ?? task.message;

  const findAnalysis = (key?: string) =>
    analyses.find((a) => analysisKey(a) === key);

  return (
    <>
      <PageHeader
        title={task.title || t.nav.tasks}
        description={<Link to="/">← {t.detail.back}</Link>}
        extra={
          <Space wrap>
            <Button
              icon={<ExperimentOutlined />}
              onClick={() => setAnalyzeOpen(true)}
              disabled={task.status !== "completed"}
            >
              {analyses.length ? t.detail.reanalyze : t.detail.analyze}
            </Button>
            <Dropdown
              disabled={task.status !== "completed"}
              menu={{
                items: exportItems,
                onClick: ({ key }) => onExport(key as ExportFormat),
              }}
            >
              <Button icon={<DownloadOutlined />} loading={exporting}>
                {t.detail.export}
              </Button>
            </Dropdown>
            {window.vid2know?.openPath && task.notes_path ? (
              <Tooltip title={t.detail.openFolder}>
                <Button icon={<FolderOpenOutlined />} onClick={onOpenFolder} />
              </Tooltip>
            ) : null}
            <Tooltip title={t.detail.reindex}>
              <Button
                icon={<ReloadOutlined />}
                onClick={onReindex}
                disabled={task.status !== "completed"}
              />
            </Tooltip>
          </Space>
        }
      />

      {stillActive ? (
        <div className="panel">
          <Space size={12} style={{ marginBottom: 8 }}>
            <Tag color={statusColor(task.status)}>{task.status}</Tag>
            <Typography.Text type="secondary">{displayMessage}</Typography.Text>
            {connected ? <Tag color="success">SSE</Tag> : null}
          </Space>
          <Progress percent={displayProgress} status="active" />
        </div>
      ) : null}

      {task.error ? (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message={task.error}
        />
      ) : null}

      {usage ? (
        <div className="panel">
          <Typography.Text strong>{t.detail.usage}</Typography.Text>
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginTop: 12 }}>
            <Statistic title={t.detail.promptTokens} value={usage.prompt_tokens} />
            <Statistic
              title={t.detail.completionTokens}
              value={usage.completion_tokens}
            />
            <Statistic title={t.detail.totalTokens} value={usage.total_tokens} />
            {usage.cost != null ? (
              <Statistic title={t.detail.cost} prefix="$" value={usage.cost} precision={4} />
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="reader-layout">
        <div>
          {task.status === "completed" && note ? (
            <div className="panel">
              <div className="toolbar" style={{ marginBottom: 12 }}>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  note.md
                </Typography.Title>
                <span className="spacer" />
                {analyses.length >= 2 ? (
                  <Button
                    size="small"
                    icon={<SwapOutlined />}
                    type={compare ? "primary" : "default"}
                    onClick={() => setCompare((c) => !c)}
                  >
                    {compare ? t.detail.exitCompare : t.detail.compare}
                  </Button>
                ) : null}
                <Button
                  size="small"
                  onClick={() => {
                    navigator.clipboard.writeText(note);
                    message.success(t.common.copied);
                  }}
                >
                  {t.detail.copyMarkdown}
                </Button>
              </div>
              <IllustratedMarkdown content={note} taskId={task.id} />
            </div>
          ) : task.status === "completed" ? (
            <div className="panel">
              <Empty description={t.detail.notReady} />
            </div>
          ) : null}

          {/* AI analyses */}
          {analyses.length ? (
            <div className="panel">
              <div className="toolbar" style={{ marginBottom: 12 }}>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  {t.detail.analyses}
                </Typography.Title>
                <span className="spacer" />
                {analyses.length >= 2 ? (
                  <Segmented
                    size="small"
                    value={compare ? "compare" : "tabs"}
                    onChange={(v) => setCompare(v === "compare")}
                    options={[
                      { label: t.detail.analyses, value: "tabs" },
                      { label: t.detail.compare, value: "compare" },
                    ]}
                  />
                ) : null}
              </div>

              {compare && analyses.length >= 2 ? (
                <>
                  <div className="toolbar" style={{ marginBottom: 12 }}>
                    <Select
                      style={{ minWidth: 200 }}
                      value={leftId}
                      onChange={setLeftId}
                      options={analyses.map((a) => ({
                        label: a.provider_name || a.provider_id,
                        value: analysisKey(a),
                      }))}
                    />
                    <Select
                      style={{ minWidth: 200 }}
                      value={rightId}
                      onChange={setRightId}
                      options={analyses.map((a) => ({
                        label: a.provider_name || a.provider_id,
                        value: analysisKey(a),
                      }))}
                    />
                  </div>
                  <div className="compare-grid">
                    {[findAnalysis(leftId), findAnalysis(rightId)].map((a, i) => (
                      <Card
                        key={i}
                        size="small"
                        title={a?.provider_name || a?.provider_id}
                      >
                        <IllustratedMarkdown
                          content={a?.content || ""}
                          taskId={task.id}
                        />
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <Tabs
                  items={analyses.map((a) => ({
                    key: analysisKey(a),
                    label: (
                      <span>
                        {a.provider_name || a.provider_id}
                        {a.usage?.total_tokens ? (
                          <Tag style={{ marginLeft: 6 }}>
                            {a.usage.total_tokens} {t.detail.tokens}
                          </Tag>
                        ) : null}
                      </span>
                    ),
                    children: (
                      <IllustratedMarkdown content={a.content} taskId={task.id} />
                    ),
                  }))}
                />
              )}
            </div>
          ) : task.status === "completed" ? (
            <div className="panel">
              <Empty description={t.detail.noAnalyses}>
                <Button type="primary" onClick={() => setAnalyzeOpen(true)}>
                  {t.detail.analyze}
                </Button>
              </Empty>
            </div>
          ) : null}
        </div>

        {/* Sidebar */}
        <div>
          {note ? <DocOutline content={note} /> : null}

          <div className="panel" style={{ marginTop: note ? 16 : 0 }}>
            <Typography.Text strong>{t.detail.artifacts}</Typography.Text>
            {artifacts.length ? (
              <List
                size="small"
                dataSource={artifacts}
                renderItem={(a) => (
                  <List.Item
                    actions={[
                      <a
                        key="dl"
                        href={a.url || assetUrl(task.id, a.path)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <DownloadOutlined />
                      </a>,
                    ]}
                  >
                    <Typography.Text ellipsis style={{ maxWidth: 150 }}>
                      {a.name}
                    </Typography.Text>
                  </List.Item>
                )}
              />
            ) : (
              <div style={{ color: "var(--muted)", marginTop: 8, fontSize: 13 }}>
                {t.detail.noArtifacts}
              </div>
            )}
          </div>

          <div className="panel">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="ID">
                <span className="mono">{task.id}</span>
              </Descriptions.Item>
              <Descriptions.Item label={t.detail.source}>
                <span className="mono">
                  {task.source_url || task.source_filename || "-"}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label={t.detail.notesPath}>
                <span className="mono">{task.notes_path || "-"}</span>
              </Descriptions.Item>
            </Descriptions>
          </div>
        </div>
      </div>

      <AnalyzeModal
        open={analyzeOpen}
        providers={providers}
        templates={templates}
        defaultProviderIds={task.provider_ids}
        confirmLoading={analyzeLoading}
        onCancel={() => setAnalyzeOpen(false)}
        onSubmit={onAnalyzeSubmit}
      />
    </>
  );
}
