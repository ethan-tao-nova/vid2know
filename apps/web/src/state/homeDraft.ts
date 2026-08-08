export type HomeDraft = {
  url: string;
  providerIds: string[];
  templateId?: string;
  clipStart: string;
  clipEnd: string;
  advancedOpen: boolean;
};

const STORAGE_KEY = "vid2know.homeDraft";

export const EMPTY_DRAFT: HomeDraft = {
  url: "",
  providerIds: [],
  templateId: undefined,
  clipStart: "",
  clipEnd: "",
  advancedOpen: false,
};

export function loadHomeDraft(): HomeDraft {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_DRAFT };
    const parsed = JSON.parse(raw) as Partial<HomeDraft>;
    return {
      ...EMPTY_DRAFT,
      ...parsed,
      providerIds: Array.isArray(parsed.providerIds) ? parsed.providerIds : [],
    };
  } catch {
    return { ...EMPTY_DRAFT };
  }
}

export function saveHomeDraft(draft: HomeDraft): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* ignore quota / privacy errors */
  }
}

export function clearHomeDraftUrl(draft: HomeDraft): HomeDraft {
  return { ...draft, url: "" };
}
