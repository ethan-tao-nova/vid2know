import { useEffect, useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import PageHeader from "../components/PageHeader";
import { useT } from "../i18n/LocaleContext";
import {
  deleteProvider,
  errorMessage,
  fetchProviders,
  saveProvider,
  testProvider,
  type Provider,
} from "../api/client";

type EditState = (Partial<Provider> & { api_key?: string }) | null;

const NEW_PROVIDER: EditState = {
  id: "",
  name: "",
  type: "openai_compatible",
  enabled: true,
  base_url: "",
  default_model: "",
  temperature: 0.3,
  timeout_seconds: 120,
  system_prompt: "",
  api_key: "",
};

export default function ProvidersPage() {
  const t = useT();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [editing, setEditing] = useState<EditState>(null);
  const [isNew, setIsNew] = useState(false);
  const [form] = Form.useForm();

  const refresh = () =>
    fetchProviders()
      .then(setProviders)
      .catch((e) => message.error(errorMessage(e)));

  useEffect(() => {
    refresh();
  }, []);

  const openEdit = (p: Provider) => {
    setIsNew(false);
    setEditing({ ...p, api_key: "" });
    form.setFieldsValue({ ...p, api_key: "" });
  };

  const openNew = () => {
    setIsNew(true);
    setEditing(NEW_PROVIDER);
    form.setFieldsValue(NEW_PROVIDER);
  };

  const onSave = async () => {
    const values = await form.validateFields();
    try {
      await saveProvider({
        id: isNew ? values.id : editing!.id,
        name: values.name,
        type: values.type,
        enabled: values.enabled,
        base_url: values.base_url,
        api_key: values.api_key || undefined,
        default_model: values.default_model,
        temperature: values.temperature,
        timeout_seconds: values.timeout_seconds,
        system_prompt: values.system_prompt || "",
      });
      message.success(t.providers.saved);
      setEditing(null);
      refresh();
    } catch (e) {
      message.error(errorMessage(e));
    }
  };

  const onTest = async (p: Provider) => {
    try {
      const res = await testProvider({
        id: p.id,
        type: p.type,
        base_url: p.base_url,
        api_key: "***",
        default_model: p.default_model,
      });
      if (res.ok) message.success(`${t.providers.testOk}: ${res.sample || res.message}`);
      else message.error(res.message);
    } catch (e) {
      message.error(errorMessage(e));
    }
  };

  const onDelete = async (p: Provider) => {
    try {
      await deleteProvider(p.id);
      message.success(t.common.success);
      refresh();
    } catch (e) {
      message.error(errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader
        title={t.providers.title}
        description={t.providers.subtitle}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>
            {t.providers.add}
          </Button>
        }
      />
      <div className="panel panel--flush">
        <Table
          rowKey="id"
          dataSource={providers}
          pagination={false}
          columns={[
            { title: t.providers.name, dataIndex: "name" },
            {
              title: t.providers.type,
              dataIndex: "type",
              render: (t2) => <Tag>{t2}</Tag>,
            },
            { title: t.providers.model, dataIndex: "default_model" },
            {
              title: t.providers.enabled,
              dataIndex: "enabled",
              render: (v) =>
                v ? <Tag color="success">on</Tag> : <Tag>off</Tag>,
            },
            {
              title: t.providers.key,
              render: (_, r) =>
                r.has_api_key ? r.api_key_masked : t.providers.keyMissing,
            },
            {
              title: t.providers.actions,
              width: 220,
              render: (_, r) => (
                <Space>
                  <Button size="small" onClick={() => openEdit(r)}>
                    {t.common.edit}
                  </Button>
                  <Button
                    size="small"
                    onClick={() => onTest(r)}
                    disabled={!r.has_api_key}
                  >
                    {t.common.test}
                  </Button>
                  <Popconfirm
                    title={t.providers.deleteConfirm}
                    okText={t.common.delete}
                    cancelText={t.common.cancel}
                    onConfirm={() => onDelete(r)}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </div>

      <Modal
        title={t.providers.editTitle}
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={onSave}
        okText={t.common.save}
        cancelText={t.common.cancel}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          {isNew ? (
            <Form.Item name="id" label="ID" rules={[{ required: true }]}>
              <Input placeholder="openai / claude / gemini …" />
            </Form.Item>
          ) : null}
          <Form.Item name="name" label={t.providers.name} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label={t.providers.type} rules={[{ required: true }]}>
            <Input placeholder="openai_compatible | anthropic | gemini" />
          </Form.Item>
          <Form.Item name="base_url" label={t.providers.baseUrl} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="api_key"
            label={t.providers.apiKey}
            extra={t.providers.apiKeyHint}
          >
            <Input.Password placeholder="sk-..." />
          </Form.Item>
          <Form.Item
            name="default_model"
            label={t.providers.defaultModel}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="system_prompt"
            label={t.providers.systemPrompt}
            extra={t.providers.systemPromptHint}
          >
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
          </Form.Item>
          <Space size="large" style={{ display: "flex" }}>
            <Form.Item name="temperature" label={t.providers.temperature}>
              <InputNumber min={0} max={2} step={0.1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="timeout_seconds" label={t.providers.timeout}>
              <InputNumber min={10} max={600} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="enabled" label={t.providers.enabled} valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </>
  );
}
