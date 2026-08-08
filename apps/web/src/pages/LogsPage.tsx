import { useState } from "react";
import { Alert, Button, Select, Space, Switch } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import PageHeader from "../components/PageHeader";
import LogViewer from "../components/LogViewer";
import { useT } from "../i18n/LocaleContext";
import { useSmartPoll } from "../hooks/useSmartPoll";
import { fetchLogs } from "../api/client";

export default function LogsPage() {
  const t = useT();
  const [lines, setLines] = useState<string[]>([]);
  const [available, setAvailable] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [level, setLevel] = useState<string | undefined>();

  const load = async () => {
    const res = await fetchLogs({ limit: 500, level });
    if (res == null) {
      setAvailable(false);
      return;
    }
    setAvailable(true);
    setLines(res.lines);
  };

  useSmartPoll(load, 4000);

  return (
    <>
      <PageHeader title={t.logs.title} description={t.logs.subtitle} />
      {!available ? (
        <Alert type="info" showIcon message={t.logs.unavailable} />
      ) : (
        <div className="panel">
          <div className="toolbar" style={{ marginBottom: 12 }}>
            <Select
              allowClear
              style={{ minWidth: 140 }}
              placeholder={t.logs.level}
              value={level}
              onChange={(v) => setLevel(v)}
              options={[
                { label: "INFO", value: "info" },
                { label: "WARNING", value: "warning" },
                { label: "ERROR", value: "error" },
              ]}
            />
            <Space>
              <Switch checked={autoScroll} onChange={setAutoScroll} size="small" />
              <span style={{ color: "var(--muted)" }}>{t.logs.autoScroll}</span>
            </Space>
            <span className="spacer" />
            <Button icon={<ReloadOutlined />} onClick={() => load()}>
              {t.common.refresh}
            </Button>
            <Button onClick={() => setLines([])}>{t.logs.clear}</Button>
          </div>
          <LogViewer lines={lines} autoScroll={autoScroll} />
        </div>
      )}
    </>
  );
}
