import { useEffect, useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  fetchProviders,
  saveProvider,
  testProvider,
  type Provider,
} from "../api/client";

type EditState = Provider & { api_key?: string };

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [form] = Form.useForm();

  const refresh = () =>
    fetchProviders()
      .then(setProviders)
      .catch((e) => message.error(String(e)));

  useEffect(() => {
    refresh();
  }, []);

  const openEdit = (p: Provider) => {
    setEditing({ ...p, api_key: "" });
    form.setFieldsValue({ ...p, api_key: "" });
  };

  const onSave = async () => {
    const values = await form.validateFields();
    await saveProvider({
      id: editing!.id,
      name: values.name,
      type: values.type,
      enabled: values.enabled,
      base_url: values.base_url,
      api_key: values.api_key || undefined,
      default_model: values.default_model,
      temperature: values.temperature,
      timeout_seconds: values.timeout_seconds,
    });
    message.success("已保存");
    setEditing(null);
    refresh();
  };

  const onTest = async (p: Provider) => {
    const res = await testProvider({
      id: p.id,
      type: p.type,
      base_url: p.base_url,
      api_key: "***",
      default_model: p.default_model,
    });
    if (res.ok) message.success(`连通成功: ${res.sample || res.message}`);
    else message.error(res.message);
  };

  return (
    <>
      <Typography.Title level={3}>AI 模型（Cherry Studio 风格）</Typography.Title>
      <p className="hero-line">
        通过 OpenAI Compatible / Claude / Gemini 适配器配置任意 API，可启用多个模型并在任务中并行分析。
      </p>
      <div className="panel">
        <Table
          rowKey="id"
          dataSource={providers}
          columns={[
            { title: "名称", dataIndex: "name" },
            { title: "类型", dataIndex: "type", render: (t) => <Tag>{t}</Tag> },
            { title: "模型", dataIndex: "default_model" },
            {
              title: "启用",
              dataIndex: "enabled",
              render: (v) => (v ? <Tag color="success">on</Tag> : <Tag>off</Tag>),
            },
            {
              title: "Key",
              render: (_, r) => (r.has_api_key ? r.api_key_masked : "未配置"),
            },
            {
              title: "操作",
              render: (_, r) => (
                <Space>
                  <Button size="small" onClick={() => openEdit(r)}>
                    编辑
                  </Button>
                  <Button size="small" onClick={() => onTest(r)} disabled={!r.has_api_key}>
                    测试
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </div>

      <Modal
        title={`编辑 Provider — ${editing?.id}`}
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={onSave}
        okText="保存"
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="显示名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Input placeholder="openai_compatible | anthropic | gemini" />
          </Form.Item>
          <Form.Item name="base_url" label="Base URL" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="api_key" label="API Key（留空则保留原值）">
            <Input.Password placeholder="sk-..." />
          </Form.Item>
          <Form.Item name="default_model" label="默认模型" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="temperature" label="Temperature">
            <InputNumber min={0} max={2} step={0.1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="timeout_seconds" label="超时（秒）">
            <InputNumber min={10} max={600} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
