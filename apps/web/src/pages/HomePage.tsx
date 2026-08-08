import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Collapse,
  Empty,
  Input,
  InputNumber,
  Modal,
  Progress,
  Segmented,
  Select,
  Skeleton,
  Space,
  Tag,
  Tooltip,
  Upload,
  message,
} from "antd";
import {
  DeleteOutlined,
  ExperimentOutlined,
  InboxOutlined,
  PlayCircleOutlined,
  ReadOutlined,
  ReloadOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import AnalyzeModal, { type AnalyzeSelection } from "../components/AnalyzeModal";
import { useT } from "../i18n/LocaleContext";
import { useSmartPoll } from "../hooks/useSmartPoll";
import { useHomeDraft } from "../state/HomeDraftContext";
import {
  analyzeTask,
  cancelTask,
  createTasksBatch,
  deleteTask,
  errorMessage,
  fetchProviders,
  fetchTasks,
  fetchTemplates,
  retryTask,
  statusOf,
  uploadTask,
  type Provider,
  type PromptTemplate,
  type SearchMode,
  type Task,
} from "../api/client";
import { isActive, statusColor } from "../utils/status";

type DeleteState = { task: Task; deleteNotes: boolean } | null;
type DuplicateState = { existingId?: string; input: () => Promise<void> } | null;

export default function HomePage() {
  const t = useT();
  const navigate = useNavigate();
  const { draft, setDraft } = useHomeDraft();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<SearchMode>("auto");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [duplicate, setDuplicate] = useState<DuplicateState>(null);
  const [analyzeTarget, setAnalyzeTarget] = useState<Task | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);

  const enabledProviders = useMemo(
    () => providers.filter((p) => p.enabled && p.has_api_key),
    [providers]
  );

  const loadTasks = async () => {
    try {
      const data = await fetchTasks({
        q: search || undefined,
        mode,
        status: statusFilter,
      });
      setTasks(data);
    } catch {
      /* keep last known list on transient failure */
    } finally {
      setLoaded(true);
    }
  };

  const loadMeta = async () => {
    try {
      const [p, tpl] = await Promise.all([fetchProviders(), fetchTemplates()]);
      setProviders(p);
      setTemplates(tpl);
    } catch {
      /* non-fatal */
    }
  };

  useSmartPoll(async () => {
    await Promise.all([loadTasks(), providers.length ? Promise.resolve() : loadMeta()]);
  }, 3000);

  const urls = useMemo(
    () =>
      draft.url
        .split(/\r?\n/)
        .map((u) => u.trim())
        .filter(Boolean),
    [draft.url]
  );

  const clipNumber = (v: string): number | null => {
    if (!v.trim()) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const doCreate = async (force = false) => {
    setSubmitting(true);
    try {
      await createTasksBatch(urls, draft.providerIds, {
        template_id: draft.templateId,
        clip_start: clipNumber(draft.clipStart),
        clip_end: clipNumber(draft.clipEnd),
        ...(force ? ({ force: true } as Record<string, unknown>) : {}),
      });
      setDraft({ url: "" });
      message.success(t.home.taskCreated);
      await loadTasks();
    } finally {
      setSubmitting(false);
    }
  };

  const submitUrls = async () => {
    if (urls.length === 0) {
      message.warning(t.home.needUrl);
      return;
    }
    try {
      await doCreate(false);
    } catch (e) {
      if (statusOf(e) === 409) {
        setDuplicate({
          input: async () => {
            await doCreate(true);
          },
        });
      } else {
        message.error(errorMessage(e));
      }
    }
  };

  const filtered = useMemo(() => {
    // Client-side fallback filtering (server may already filter).
    let list = tasks;
    if (statusFilter) list = list.filter((x) => x.status === statusFilter);
    if (search.trim() && mode !== "semantic") {
      const q = search.trim().toLowerCase();
      list = list.filter((x) =>
        [x.title, x.source_url, x.source_filename, x.message]
          .filter(Boolean)
          .some((f) => String(f).toLowerCase().includes(q))
      );
    }
    return list;
  }, [tasks, statusFilter, search, mode]);

  const onCancel = async (task: Task) => {
    try {
      await cancelTask(task.id);
      await loadTasks();
    } catch (e) {
      message.error(errorMessage(e));
    }
  };

  const onRetry = async (task: Task) => {
    try {
      await retryTask(task.id);
      message.success(t.common.success);
      await loadTasks();
    } catch (e) {
      message.error(errorMessage(e));
    }
  };

  const onConfirmDelete = async () => {
    if (!deleteState) return;
    try {
      await deleteTask(deleteState.task.id, deleteState.deleteNotes);
      setDeleteState(null);
      message.success(t.common.success);
      await loadTasks();
    } catch (e) {
      message.error(errorMessage(e));
    }
  };

  const onAnalyzeSubmit = async (sel: AnalyzeSelection) => {
    if (!analyzeTarget) return;
    setAnalyzeLoading(true);
    try {
      await analyzeTask(analyzeTarget.id, {
        provider_ids: sel.provider_ids,
        template_id: sel.template_id,
      });
      message.success(t.analyze.started);
      setAnalyzeTarget(null);
      await loadTasks();
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const advancedItems = [
    {
      key: "advanced",
      label: t.home.advanced,
      children: (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <div>
            <div style={{ marginBottom: 6, fontWeight: 500 }}>
              {t.home.aiProviders}
            </div>
            {enabledProviders.length === 0 ? (
              <Tag color="default">{t.home.noProviders}</Tag>
            ) : (
              <Checkbox.Group
                value={draft.providerIds}
                onChange={(v) => setDraft({ providerIds: v as string[] })}
                options={enabledProviders.map((p) => ({
                  label: `${p.name} · ${p.default_model}`,
                  value: p.id,
                }))}
              />
            )}
          </div>
          <div>
            <div style={{ marginBottom: 6, fontWeight: 500 }}>
              {t.home.promptTemplate}
            </div>
            <Select
              allowClear
              style={{ width: "100%", maxWidth: 420 }}
              placeholder={t.home.defaultTemplate}
              value={draft.templateId}
              onChange={(v) => setDraft({ templateId: v })}
              options={templates.map((tpl) => ({
                label: tpl.name,
                value: tpl.id,
              }))}
            />
          </div>
          <div>
            <div style={{ marginBottom: 6, fontWeight: 500 }}>
              {t.home.clipRange}
            </div>
            <Space>
              <InputNumber
                min={0}
                placeholder={t.home.clipStart}
                value={draft.clipStart ? Number(draft.clipStart) : undefined}
                onChange={(v) => setDraft({ clipStart: v == null ? "" : String(v) })}
              />
              <span>–</span>
              <InputNumber
                min={0}
                placeholder={t.home.clipEnd}
                value={draft.clipEnd ? Number(draft.clipEnd) : undefined}
                onChange={(v) => setDraft({ clipEnd: v == null ? "" : String(v) })}
              />
            </Space>
            <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
              {t.home.clipHint}
            </div>
          </div>
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t.home.title} description={t.home.subtitle} />

      <div className="panel">
        <Input.TextArea
          size="large"
          autoSize={{ minRows: 2, maxRows: 6 }}
          placeholder={t.home.composerPlaceholder}
          value={draft.url}
          onChange={(e) => setDraft({ url: e.target.value })}
        />
        <div style={{ color: "var(--muted)", fontSize: 12, margin: "6px 0 14px" }}>
          {t.home.multiUrlHint}
        </div>

        <Space wrap>
          <Button
            type="primary"
            size="large"
            icon={<PlayCircleOutlined />}
            loading={submitting}
            onClick={submitUrls}
          >
            {t.home.startConvert}
          </Button>
          <Upload
            accept="video/*,audio/*"
            showUploadList={false}
            customRequest={async ({ file, onSuccess, onError }) => {
              setUploadPercent(0);
              try {
                await uploadTask(
                  file as File,
                  draft.providerIds,
                  (p) => setUploadPercent(p)
                );
                message.success(t.home.uploadCreated);
                await loadTasks();
                onSuccess?.({});
              } catch (err) {
                message.error(errorMessage(err));
                onError?.(err as Error);
              } finally {
                setUploadPercent(null);
              }
            }}
          >
            <Button size="large" icon={<InboxOutlined />}>
              {uploadPercent != null
                ? `${t.home.uploading} ${uploadPercent}%`
                : t.home.uploadLocal}
            </Button>
          </Upload>
        </Space>

        <Collapse
          ghost
          style={{ marginTop: 12 }}
          activeKey={draft.advancedOpen ? ["advanced"] : []}
          onChange={(keys) =>
            setDraft({ advancedOpen: (keys as string[]).includes("advanced") })
          }
          items={advancedItems}
        />
      </div>

      <div className="toolbar" style={{ marginBottom: 16 }}>
        <Input.Search
          allowClear
          style={{ maxWidth: 360 }}
          placeholder={t.home.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={() => loadTasks()}
        />
        <Segmented
          value={mode}
          onChange={(v) => setMode(v as SearchMode)}
          options={[
            { label: t.home.modeAuto, value: "auto" },
            { label: t.home.modeText, value: "text" },
            { label: t.home.modeSemantic, value: "semantic" },
          ]}
        />
        <Select
          allowClear
          style={{ minWidth: 160 }}
          placeholder={t.home.allStatus}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v)}
          onClear={() => setStatusFilter(undefined)}
          options={[
            "pending",
            "downloading",
            "transcribing",
            "analyzing",
            "completed",
            "failed",
            "cancelled",
          ].map((s) => ({ label: s, value: s }))}
        />
        <span className="spacer" />
        <Button icon={<ReloadOutlined />} onClick={() => loadTasks()}>
          {t.common.refresh}
        </Button>
      </div>

      {!loaded ? (
        <div className="task-grid">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="task-card">
              <Skeleton active paragraph={{ rows: 2 }} />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {t.home.emptyTitle}
                </div>
                <div style={{ color: "var(--muted)" }}>{t.home.emptyDesc}</div>
              </div>
            }
          >
            <Button
              type="primary"
              onClick={() =>
                document
                  .querySelector<HTMLTextAreaElement>(".panel textarea")
                  ?.focus()
              }
            >
              {t.home.emptyCta}
            </Button>
          </Empty>
        </div>
      ) : (
        <div className="task-grid">
          {filtered.map((task) => (
            <div key={task.id} className="task-card">
              <div
                onClick={() => navigate(`/tasks/${task.id}`)}
                style={{ cursor: "pointer" }}
              >
                <div className="task-card__title">
                  {task.title || task.source_filename || t.common.loading}
                </div>
                <div className="task-card__source">
                  {task.source_url || task.source_type}
                </div>
              </div>

              <Space size={8} wrap>
                <Tag color={statusColor(task.status)}>{task.status}</Tag>
                {task.provider_ids?.length ? (
                  <Tag icon={<ExperimentOutlined />}>{task.provider_ids.length}</Tag>
                ) : null}
              </Space>

              <Progress
                percent={Math.round(task.progress)}
                size="small"
                status={
                  task.status === "failed"
                    ? "exception"
                    : task.status === "completed"
                      ? "success"
                      : isActive(task.status)
                        ? "active"
                        : "normal"
                }
              />
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  minHeight: 18,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={task.error || task.message}
              >
                {task.error || task.message}
              </div>

              <div className="task-card__foot">
                <Button
                  size="small"
                  type="link"
                  icon={<ReadOutlined />}
                  onClick={() => navigate(`/tasks/${task.id}`)}
                  style={{ paddingInline: 0 }}
                >
                  {t.home.cardOpen}
                </Button>
                <Space size={4}>
                  {isActive(task.status) ? (
                    <Tooltip title={t.home.cardCancel}>
                      <Button
                        size="small"
                        icon={<StopOutlined />}
                        onClick={() => onCancel(task)}
                      />
                    </Tooltip>
                  ) : null}
                  {task.status === "failed" || task.status === "cancelled" ? (
                    <Tooltip title={t.home.cardRetry}>
                      <Button
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={() => onRetry(task)}
                      />
                    </Tooltip>
                  ) : null}
                  <Tooltip title={t.home.cardAnalyze}>
                    <Button
                      size="small"
                      icon={<ExperimentOutlined />}
                      disabled={task.status !== "completed"}
                      onClick={() => setAnalyzeTarget(task)}
                    />
                  </Tooltip>
                  <Tooltip title={t.home.cardDelete}>
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => setDeleteState({ task, deleteNotes: false })}
                    />
                  </Tooltip>
                </Space>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm with delete_notes option */}
      <Modal
        open={!!deleteState}
        title={t.home.deleteTitle}
        okText={t.common.delete}
        okButtonProps={{ danger: true }}
        cancelText={t.common.cancel}
        onCancel={() => setDeleteState(null)}
        onOk={onConfirmDelete}
        destroyOnClose
      >
        <p>{t.home.deleteDesc}</p>
        <Checkbox
          checked={deleteState?.deleteNotes}
          onChange={(e) =>
            setDeleteState((s) => (s ? { ...s, deleteNotes: e.target.checked } : s))
          }
        >
          {t.home.deleteNotesOption}
        </Checkbox>
      </Modal>

      {/* Duplicate 409 modal */}
      <Modal
        open={!!duplicate}
        title={t.home.duplicateTitle}
        onCancel={() => setDuplicate(null)}
        footer={[
          duplicate?.existingId ? (
            <Button
              key="open"
              onClick={() => {
                navigate(`/tasks/${duplicate.existingId}`);
                setDuplicate(null);
              }}
            >
              {t.home.duplicateOpen}
            </Button>
          ) : null,
          <Button
            key="create"
            type="primary"
            onClick={async () => {
              const d = duplicate;
              setDuplicate(null);
              try {
                await d?.input();
                message.success(t.home.taskCreated);
              } catch (e) {
                message.error(errorMessage(e));
              }
            }}
          >
            {t.home.duplicateCreate}
          </Button>,
        ]}
      >
        <p>{t.home.duplicateDesc}</p>
      </Modal>

      <AnalyzeModal
        open={!!analyzeTarget}
        providers={providers}
        templates={templates}
        defaultProviderIds={analyzeTarget?.provider_ids || draft.providerIds}
        defaultTemplateId={draft.templateId}
        confirmLoading={analyzeLoading}
        onCancel={() => setAnalyzeTarget(null)}
        onSubmit={onAnalyzeSubmit}
      />
    </>
  );
}
