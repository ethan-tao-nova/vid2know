import { useEffect, useState } from "react";
import { Layout, Menu, Segmented, Select, Tooltip } from "antd";
import {
  ExperimentOutlined,
  FileTextOutlined,
  SettingOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import BrandLogo from "./components/BrandLogo";
import HomePage from "./pages/HomePage";
import ProvidersPage from "./pages/ProvidersPage";
import SettingsPage from "./pages/SettingsPage";
import TaskDetailPage from "./pages/TaskDetailPage";
import LogsPage from "./pages/LogsPage";
import { useT, useLocaleContext } from "./i18n/LocaleContext";
import { LOCALE_OPTIONS } from "./i18n/locales";
import { useTheme, type ThemeMode } from "./theme/ThemeContext";
import { fetchHealth, logsAvailable } from "./api/client";

const { Header, Content } = Layout;

function HealthDot() {
  const t = useT();
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    const check = () =>
      fetchHealth()
        .then(() => alive && setOnline(true))
        .catch(() => alive && setOnline(false));
    check();
    const timer = setInterval(check, 15000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const cls =
    online == null
      ? "health-dot"
      : online
        ? "health-dot health-dot--online"
        : "health-dot health-dot--offline";
  return (
    <Tooltip title={online ? t.common.online : t.common.offline}>
      <span className={cls} />
    </Tooltip>
  );
}

function Shell({ showLogs }: { showLogs: boolean }) {
  const t = useT();
  const location = useLocation();
  const { locale, setLocale } = useLocaleContext();
  const { mode, setMode } = useTheme();

  const selected = location.pathname.startsWith("/providers")
    ? "providers"
    : location.pathname.startsWith("/settings")
      ? "settings"
      : location.pathname.startsWith("/logs")
        ? "logs"
        : "home";

  const menuItems = [
    {
      key: "home",
      icon: <VideoCameraOutlined />,
      label: <Link to="/">{t.nav.tasks}</Link>,
    },
    {
      key: "providers",
      icon: <ExperimentOutlined />,
      label: <Link to="/providers">{t.nav.providers}</Link>,
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: <Link to="/settings">{t.nav.settings}</Link>,
    },
    ...(showLogs
      ? [
          {
            key: "logs",
            icon: <FileTextOutlined />,
            label: <Link to="/logs">{t.nav.logs}</Link>,
          },
        ]
      : []),
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: "transparent" }}>
      <Header className="app-header" style={{ background: undefined }}>
        <BrandLogo />
        <Menu
          mode="horizontal"
          selectedKeys={[selected]}
          style={{ flex: 1, background: "transparent", borderBottom: "none" }}
          items={menuItems}
        />
        <div className="toolbar">
          <HealthDot />
          <Segmented
            size="small"
            value={mode}
            onChange={(v) => setMode(v as ThemeMode)}
            options={[
              { label: t.common.light, value: "light" },
              { label: t.common.dark, value: "dark" },
              { label: t.common.system, value: "system" },
            ]}
          />
          <Select
            size="small"
            style={{ minWidth: 110 }}
            value={locale}
            onChange={setLocale}
            options={LOCALE_OPTIONS}
          />
        </div>
      </Header>
      <Content>
        <div className="app-shell">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/tasks/:id" element={<TaskDetailPage />} />
            <Route path="/providers" element={<ProvidersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {showLogs ? <Route path="/logs" element={<LogsPage />} /> : null}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Content>
    </Layout>
  );
}

export default function App() {
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    logsAvailable().then(setShowLogs).catch(() => setShowLogs(false));
  }, []);

  return (
    <BrowserRouter>
      <Shell showLogs={showLogs} />
    </BrowserRouter>
  );
}
