import { useEffect, useState } from "react";
import { Alert, Button, Descriptions, Spin, Typography, message } from "antd";
import { Link, useParams } from "react-router-dom";
import { fetchNote, fetchTask, type Task } from "../api/client";

export default function TaskDetailPage() {
  const { id } = useParams();
  const [task, setTask] = useState<Task | null>(null);
  const [note, setNote] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    const load = async () => {
      try {
        const t = await fetchTask(id);
        if (!alive) return;
        setTask(t);
        if (t.status === "completed") {
          const n = await fetchNote(id);
          if (alive) setNote(n.content);
        }
      } catch (e) {
        message.error(String(e));
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const timer = setInterval(load, 3000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [id]);

  if (loading && !task) return <Spin />;
  if (!task) return <Alert type="error" message="任务不存在" />;

  return (
    <>
      <Typography.Title level={3}>{task.title || "任务详情"}</Typography.Title>
      <p>
        <Link to="/">← 返回列表</Link>
      </p>
      <div className="panel">
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="ID">{task.id}</Descriptions.Item>
          <Descriptions.Item label="状态">{task.status}</Descriptions.Item>
          <Descriptions.Item label="进度">{Math.round(task.progress)}%</Descriptions.Item>
          <Descriptions.Item label="消息">{task.message}</Descriptions.Item>
          <Descriptions.Item label="来源">{task.source_url || task.source_filename}</Descriptions.Item>
          <Descriptions.Item label="笔记目录">
            <span className="mono">{task.notes_path || "-"}</span>
          </Descriptions.Item>
          {task.error ? (
            <Descriptions.Item label="错误">
              <Alert type="error" message={task.error} />
            </Descriptions.Item>
          ) : null}
        </Descriptions>
      </div>
      {note ? (
        <div className="panel">
          <Typography.Title level={5}>note.md 预览</Typography.Title>
          <Button
            style={{ marginBottom: 12 }}
            onClick={() => navigator.clipboard.writeText(note)}
          >
            复制 Markdown
          </Button>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "#0b1f18",
              color: "#d7efe6",
              padding: 16,
              borderRadius: 8,
              maxHeight: 640,
              overflow: "auto",
            }}
          >
            {note}
          </pre>
        </div>
      ) : null}
    </>
  );
}
