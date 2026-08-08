import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Statistic,
  Switch,
  message,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import PageHeader from "../components/PageHeader";
import { useT } from "../i18n/LocaleContext";
import {
  errorMessage,
  fetchSettings,
  fetchUsage,
  reindexAll,
  updateSettings,
  type UsageSummary,
} from "../api/client";

export default function SettingsPage() {
  const t = useT();
  const [form] = Form.useForm();
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [reindexing, setReindexing] = useState(false);
  const [saving, setSaving] = useState(false);
  const isElectron = Boolean(window.vid2know);

  useEffect(() => {
    fetchSettings()
      .then((s) => form.setFieldsValue(s))
      .catch((e) => message.error(errorMessage(e)));
    fetchUsage().then(setUsage).catch(() => undefined);
  }, [form]);

  const onSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await updateSettings(values);
      message.success(t.settings.saved);
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const onReindex = async () => {
    setReindexing(true);
    try {
      await reindexAll();
      message.success(t.settings.reindexDone);
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setReindexing(false);
    }
  };

  const pickDir = async (field: string) => {
    const path = await window.vid2know?.pickDirectory?.();
    if (path) form.setFieldValue(field, path);
  };

  const pickCookies = async () => {
    const path = await window.vid2know?.pickCookiesFile?.();
    if (path) form.setFieldValue("cookies_file", path);
  };

  const browseAddon = (onClick: () => void) =>
    isElectron ? (
      <Button type="link" onClick={onClick} style={{ padding: 0 }}>
        {t.common.browse}
      </Button>
    ) : null;

  return (
    <>
      <PageHeader
        title={t.settings.title}
        description={
          t.settings.subtitle + (isElectron ? ` ${t.settings.electronHint}` : "")
        }
      />

      {usage ? (
        <div className="panel">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>
            {t.settings.usageCard}
          </div>
          <Row gutter={24}>
            <Col>
              <Statistic title={t.detail.promptTokens} value={usage.prompt_tokens} />
            </Col>
            <Col>
              <Statistic
                title={t.detail.completionTokens}
                value={usage.completion_tokens}
              />
            </Col>
            <Col>
              <Statistic title={t.detail.totalTokens} value={usage.total_tokens} />
            </Col>
            {usage.cost != null ? (
              <Col>
                <Statistic
                  title={t.detail.cost}
                  prefix="$"
                  value={usage.cost}
                  precision={4}
                />
              </Col>
            ) : null}
          </Row>
        </div>
      ) : null}

      <div className="panel">
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={t.settings.cookiesWarnTitle}
          description={t.settings.cookiesWarnDesc}
        />
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item
            name="notes_root"
            label={t.settings.notesRoot}
            rules={[{ required: true }]}
            extra={t.settings.notesRootHint}
          >
            <Input addonAfter={browseAddon(() => pickDir("notes_root"))} />
          </Form.Item>
          <Form.Item
            name="video_cache_root"
            label={t.settings.videoCacheRoot}
            rules={[{ required: true }]}
            extra={t.settings.videoCacheRootHint}
          >
            <Input addonAfter={browseAddon(() => pickDir("video_cache_root"))} />
          </Form.Item>
          <Form.Item
            name="cookies_file"
            label={t.settings.cookiesFile}
            extra={t.settings.cookiesFileHint}
          >
            <Input addonAfter={browseAddon(pickCookies)} />
          </Form.Item>
          <Form.Item
            name="auto_delete_video"
            label={t.settings.autoDelete}
            valuePropName="checked"
            extra={t.settings.autoDeleteHint}
          >
            <Switch />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="whisper_model"
                label={t.settings.whisperModel}
                extra={t.settings.whisperHint}
              >
                <Input placeholder="tiny / base / small / medium" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="quality_preset"
                label={t.settings.qualityPreset}
                extra={t.settings.qualityHint}
              >
                <Select
                  allowClear
                  options={[
                    { label: t.settings.qualityFast, value: "fast" },
                    { label: t.settings.qualityBalanced, value: "balanced" },
                    { label: t.settings.qualityHigh, value: "high" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="scene_threshold" label={t.settings.sceneThreshold}>
                <InputNumber min={10} max={60} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="max_keyframes" label={t.settings.maxKeyframes}>
                <InputNumber min={5} max={200} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="analysis_language"
                label={t.settings.analysisLanguage}
                extra={t.settings.analysisLanguageHint}
              >
                <Select
                  allowClear
                  options={[
                    { label: "简体中文", value: "zh-CN" },
                    { label: "English", value: "en" },
                    { label: "日本語", value: "ja" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="default_locale" label={t.settings.defaultLocale}>
                <Select
                  options={[
                    { label: "简体中文", value: "zh-CN" },
                    { label: "English", value: "en" },
                    { label: "日本語", value: "ja" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="ocr_enabled"
            label={t.settings.ocrEnabled}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={saving}>
            {t.common.save}
          </Button>
        </Form>
      </div>

      <Card size="small" title={t.settings.reindex} style={{ marginBottom: 16 }}>
        <p style={{ color: "var(--muted)" }}>{t.settings.reindexHint}</p>
        <Button
          icon={<ReloadOutlined />}
          loading={reindexing}
          onClick={onReindex}
        >
          {t.settings.reindex}
        </Button>
      </Card>
    </>
  );
}
