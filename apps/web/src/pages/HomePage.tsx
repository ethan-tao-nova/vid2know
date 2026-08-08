import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Form,
  Input,
  Progress,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import { Link } from "react-router-dom";
import {
  createTask,
  fetchProviders,
  fetchTasks,
  uploadTask,
  type Provider,
  type Task,
} from "../api/client";

const statusColor: Record<string, string> = {
  pending: "default",
  downloading: "processing",
  transcribing: "processing",
  extracting_frames: "processing",
  ocr: "processing",
  assembling: "processing",
  analyzing: "processing",
  completed: "success",
  failed: "error",
};

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const enabledProviders = useMemo(
    () => providers.filter((p) => p.enabled && p.has_api_key),
    [providers]
  );

  const refresh = async () => {
    const [t, p] = await Promise.all([fetchTasks(), fetchProviders()]);
    setTasks(t);
    setProviders(p);
  };

  useEffect(() => {
    refresh().catch((e) => message.error(String(e)));
    const timer = setInterval(() => {
      fetchTasks()
        .then(setTasks)
        .catch(() => undefined);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const submitUrl = async () => {
    if (!url.trim()) {
      message.warning("请输入视频网址");
      return;
    }
    setLoading(true);
    try {
      await createTask(url.trim(), selectedProviders);
      setUrl("");
      message.success("任务已创建");
      await refresh();
    } catch (e: unknown) {
      message.error(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="brand">
        <h1>视频网址 → Markdown 笔记</h1>
        <span>影知 Vid2Know</span>
      </div>
      <p className="hero-line">
        输入 B 站 / YouTube 等公开视频地址，自动抽取字幕或语音转写、关键帧与 OCR，并可选多模型并行分析。
      </p>

      <div className="panel">
        <Typography.Title level={5}>新建任务</Typography.Title>
        <Form layout="vertical" onFinish={submitUrl}>
          <Form.Item label="视频网址">
            <Input
              size="large"
              placeholder="https://www.bilibili.com/video/BVxxxx"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onPressEnter={submitUrl}
            />
          </Form.Item>
          <Form.Item label="同时分析的 AI（可多选）">
            {enabledProviders.length === 0 ? (
              <Alert
                type="info"
                showIcon
                message="尚未启用带 API Key 的模型，可先到「AI 模型」页配置，或仅生成原文笔记。"
              />
            ) : (
              <Checkbox.Group
                options={enabledProviders.map((p) => ({
                  label: `${p.name} / ${p.default_model}`,
                  value: p.id,
                }))}
                value={selectedProviders}
                onChange={(v) => setSelectedProviders(v as string[])}
              />
            )}
          </Form.Item>
          <Space wrap>
            <Button type="primary" size="large" loading={loading} onClick={submitUrl}>
              开始转换
            </Button>
            <Upload
              accept="video/*,audio/*"
              showUploadList={false}
              customRequest={async ({ file, onSuccess, onError }) => {
                try {
                  await uploadTask(file as File, selectedProviders);
                  message.success("上传任务已创建");
                  await refresh();
                  onSuccess?.({});
                } catch (err) {
                  onError?.(err as Error);
                  message.error(String(err));
                }
              }}
            >
              <Button size="large">上传本地视频（兜底）</Button>
            </Upload>
          </Space>
        </Form>
      </div>

      <div className="panel">
        <Typography.Title level={5}>任务列表</Typography.Title>
        <Table
          rowKey="id"
          dataSource={tasks}
          pagination={{ pageSize: 10 }}
          columns={[
            {
              title: "标题 / 来源",
              render: (_, row) => (
                <div>
                  <div>{row.title || row.source_filename || "处理中…"}</div>
                  <div className="mono" style={{ color: "#5b6f68" }}>
                    {row.source_url || row.source_type}
                  </div>
                </div>
              ),
            },
            {
              title: "状态",
              dataIndex: "status",
              width: 140,
              render: (s: string) => <Tag color={statusColor[s] || "default"}>{s}</Tag>,
            },
            {
              title: "进度",
              width: 180,
              render: (_, row) => (
                <Progress
                  percent={Math.round(row.progress)}
                  size="small"
                  status={row.status === "failed" ? "exception" : undefined}
                />
              ),
            },
            {
              title: "说明",
              dataIndex: "message",
              ellipsis: true,
            },
            {
              title: "操作",
              width: 100,
              render: (_, row) => <Link to={`/tasks/${row.id}`}>详情</Link>,
            },
          ]}
        />
      </div>
    </>
  );
}
