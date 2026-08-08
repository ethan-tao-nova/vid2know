import { useEffect } from "react";
import { Alert, Button, Form, Input, InputNumber, Switch, Typography, message } from "antd";
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

  const pickVideoCache = async () => {
    const path = await window.vid2know?.pickDirectory?.();
    if (path) form.setFieldValue("video_cache_root", path);
  };

  const pickCookies = async () => {
    const path = await window.vid2know?.pickCookiesFile?.();
    if (path) form.setFieldValue("cookies_file", path);
  };

  return (
    <>
      <Typography.Title level={3}>设置</Typography.Title>
      <p className="hero-line">
        配置笔记目录、临时视频下载目录、分析后是否自动删视频，以及 B 站 Cookie。
        {isElectron ? " 当前为 Electron 桌面端，可浏览本机路径。" : ""}
      </p>
      <div className="panel">
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="B 站 412 提示"
          description="下载 B 站视频请先登录后导出 cookies.txt，放到仓库 config/cookies.txt，并在下方填写 /config/cookies.txt。"
        />
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
            name="video_cache_root"
            label="临时视频下载目录"
            rules={[{ required: true }]}
            extra="Docker 默认 /data/cache（对应宿主机 data/cache）。自定义宿主机路径需先挂载进容器。"
          >
            <Input
              addonAfter={
                isElectron ? (
                  <Button type="link" onClick={pickVideoCache} style={{ padding: 0 }}>
                    浏览
                  </Button>
                ) : null
              }
            />
          </Form.Item>
          <Form.Item
            name="auto_delete_video"
            label="分析完成后自动删除临时视频"
            valuePropName="checked"
            extra="开启后只保留 Markdown 笔记与截图，不保留完整视频文件"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="cookies_file"
            label="Cookies 文件路径（B 站强烈建议）"
            extra="Netscape cookies.txt；解决 412 与拉取字幕"
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
