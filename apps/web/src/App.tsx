import { Layout, Menu, Typography } from "antd";
import {
  ExperimentOutlined,
  SettingOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import { Link, Navigate, Route, Routes, useLocation, BrowserRouter } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ProvidersPage from "./pages/ProvidersPage";
import SettingsPage from "./pages/SettingsPage";
import TaskDetailPage from "./pages/TaskDetailPage";

const { Header, Content } = Layout;

function Shell() {
  const location = useLocation();
  const selected =
    location.pathname.startsWith("/providers")
      ? "providers"
      : location.pathname.startsWith("/settings")
        ? "settings"
        : "home";

  return (
    <Layout style={{ minHeight: "100vh", background: "transparent" }}>
      <Header
        style={{
          background: "rgba(255,255,255,0.86)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid #d9e5df",
          display: "flex",
          alignItems: "center",
          gap: 24,
          paddingInline: 24,
        }}
      >
        <Typography.Title level={4} style={{ margin: 0, color: "#0f6e56" }}>
          影知 Vid2Know
        </Typography.Title>
        <Menu
          mode="horizontal"
          selectedKeys={[selected]}
          style={{ flex: 1, background: "transparent", borderBottom: "none" }}
          items={[
            {
              key: "home",
              icon: <VideoCameraOutlined />,
              label: <Link to="/">任务</Link>,
            },
            {
              key: "providers",
              icon: <ExperimentOutlined />,
              label: <Link to="/providers">AI 模型</Link>,
            },
            {
              key: "settings",
              icon: <SettingOutlined />,
              label: <Link to="/settings">设置</Link>,
            },
          ]}
        />
      </Header>
      <Content>
        <div className="app-shell">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/tasks/:id" element={<TaskDetailPage />} />
            <Route path="/providers" element={<ProvidersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Content>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
