import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ConfigProvider } from "antd";
import type { Locale } from "antd/es/locale";
import zhCN from "antd/locale/zh_CN";
import enUS from "antd/locale/en_US";
import jaJP from "antd/locale/ja_JP";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import "dayjs/locale/ja";
import "dayjs/locale/en";
import {
  DEFAULT_LOCALE,
  MESSAGES,
  type LocaleKey,
  type Messages,
} from "./locales";

const STORAGE_KEY = "vid2know.locale";

const ANTD_LOCALES: Record<LocaleKey, Locale> = {
  "zh-CN": zhCN,
  en: enUS,
  ja: jaJP,
};

const DAYJS_LOCALES: Record<LocaleKey, string> = {
  "zh-CN": "zh-cn",
  en: "en",
  ja: "ja",
};

function readStoredLocale(): LocaleKey {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && raw in MESSAGES) return raw as LocaleKey;
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE;
}

type LocaleContextValue = {
  locale: LocaleKey;
  setLocale: (l: LocaleKey) => void;
  t: Messages;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleKey>(readStoredLocale);

  useEffect(() => {
    dayjs.locale(DAYJS_LOCALES[locale]);
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: LocaleKey) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t: MESSAGES[locale] }),
    [locale, setLocale]
  );

  return (
    <LocaleContext.Provider value={value}>
      <ConfigProvider locale={ANTD_LOCALES[locale]}>{children}</ConfigProvider>
    </LocaleContext.Provider>
  );
}

export function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocaleContext must be used within LocaleProvider");
  return ctx;
}

/** Convenience hook returning the message map for the active locale. */
export function useT(): Messages {
  return useLocaleContext().t;
}
