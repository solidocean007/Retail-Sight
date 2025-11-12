declare global {
  interface Window {
    adsbygoogle: { [key: string]: unknown }[];
    __autoReloadTimer?: ReturnType<typeof setTimeout>;
  }
}

export {};
