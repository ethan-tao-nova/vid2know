import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  EMPTY_DRAFT,
  loadHomeDraft,
  saveHomeDraft,
  type HomeDraft,
} from "./homeDraft";

type HomeDraftContextValue = {
  draft: HomeDraft;
  setDraft: (patch: Partial<HomeDraft>) => void;
  resetDraft: () => void;
};

const HomeDraftContext = createContext<HomeDraftContextValue | null>(null);

export function HomeDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<HomeDraft>(loadHomeDraft);

  useEffect(() => {
    saveHomeDraft(draft);
  }, [draft]);

  const setDraft = useCallback((patch: Partial<HomeDraft>) => {
    setDraftState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraftState({ ...EMPTY_DRAFT });
  }, []);

  const value = useMemo<HomeDraftContextValue>(
    () => ({ draft, setDraft, resetDraft }),
    [draft, setDraft, resetDraft]
  );

  return (
    <HomeDraftContext.Provider value={value}>
      {children}
    </HomeDraftContext.Provider>
  );
}

export function useHomeDraft(): HomeDraftContextValue {
  const ctx = useContext(HomeDraftContext);
  if (!ctx) throw new Error("useHomeDraft must be used within HomeDraftProvider");
  return ctx;
}
