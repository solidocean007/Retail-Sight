// utils/api.ts
export function getApiBaseUrl() {
    if (import.meta.env.DEV) {
      // Local dev — point to your deployed Vercel API
      return "https://my-fetch-data-api.vercel.app/api";
    }
    // Production/preview — can just use relative path
    return "/api";
  }