export {};

declare global {
  interface Window {
    vid2know?: {
      platform?: string;
      pickDirectory?: () => Promise<string | null>;
      pickCookiesFile?: () => Promise<string | null>;
      getApiBase?: () => Promise<string>;
      openPath?: (target: string) => Promise<string | boolean | null>;
    };
  }
}
