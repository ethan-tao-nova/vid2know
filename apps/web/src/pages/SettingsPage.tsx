import { useEffect } from "react";
import { Button, Form, Input, InputNumber, Switch, Typography, message } from "antd";
import { fetchSettings, updateSettings } from "../api/client";

declare global {
  interface Window {
    vid2know?: {
      pickDirectory?: () => Promise<string | null>;
      pickCookiesFile?: () => Promise<string | null>;
      getApiBase?: () => Promise<string>;
      platform?: string;
    };
  }
}

export default function SettingsPage() {
  const [form] = Form.useForm();
  const isElectron = Boolean(window.vid2know);

  useEffect(() => {
    fetchSettings()
      .then((s) => form.setFieldsValue(s))
      .catch((e) => message.error(String(e)));
  }, [form]);

  const onSave = async () => {
    const values = await form.validateFields();
    await updateSettings(values);
    message.success("设置已保存");
  };

  const pickNotes = async () => {
    const path = await window.vid2know?.pickDirectory?.();
    if (path) form.setFieldValue("notes_root", path);
  };

  const pickCookies = async () => {
    const path = await window.vid2know?.pickCookiesFile?.();
    if (path) form.setFieldValue("cookies_file", path);
  };

  return (
    <>
      <Typography.Title level={3}>设置</Typography.Title>
      <p className="hero-line">
        配置笔记/图片保存根目录、Cookie（B 站字幕常用）与转写参数。
        {isElectron ? " 当前为 Electron 桌面端，可浏览本机路径。" : ""}
      </p>
      <div className="panel">
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item
            name="notes_root"
            label="笔记与图片根目录"
            rules={[{ required: true }]}
            extra="每个任务会在该目录下创建子文件夹，图片保存在 images/"
          >
            <Input
              addonAfter={
                isElectron ? (
                  <Button type="link" onClick={pickNotes} style={{ padding: 0 }}>
                    浏览
                  </Button>
                ) : null
              }
            />
          </Form.Item>
          <Form.Item
            name="cookies_file"
            label="Cookies 文件路径（可选）"
            extra="Netscape cookies.txt；B 站字幕通常需要登录态"
          >
            <Input
              addonAfter={
                isElectron ? (
                  <Button type="link" onClick={pickCookies} style={{ padding: 0 }}>
                    浏览
                  </Button>
                ) : null
              }
            />
          </Form.Item>
          <Form.Item name="whisper_model" label="Whisper 模型">
            <Input placeholder="tiny / base / small / medium" />
          </Form.Item>
          <Form.Item name="scene_threshold" label="场景检测阈值">
            <InputNumber min={10} max={60} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="max_keyframes" label="最大关键帧数">
            <InputNumber min={5} max={200} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="ocr_enabled" label="启用 OCR" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="default_locale" label="默认语言">
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit">
            保存设置
          </Button>
        </Form>
      </div>
    </>
  );
}
