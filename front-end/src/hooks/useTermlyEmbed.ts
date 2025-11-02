import { useEffect } from "react";

declare global {
  interface Window {
    Termly?: unknown;
  }
}

/**
 * Forces Termly's embed script to reinitialize every mount
 * by removing any old script + iframe and re-inserting fresh markup.
 */
export const useTermlyEmbed = (dataId: string) => {
  useEffect(() => {
    const existingScript = document.getElementById("termly-jssdk");
    if (existingScript) existingScript.remove();

    // Remove any old iframes Termly left behind
    document
      .querySelectorAll('iframe[src*="termly.io"], div.termly-embed')
      .forEach((el) => el.remove());

    // Create new container
    const container = document.querySelector(
      `[data-id="${dataId}"]`
    ) as HTMLElement | null;

    if (container) {
      // Recreate the exact markup Termly expects
      container.outerHTML = `<div name="termly-embed" data-id="${dataId}"></div>`;
    }

    // Inject a *new* script each time
    const script = document.createElement("script");
    script.id = "termly-jssdk";
    script.src = "https://app.termly.io/embed-policy.min.js";
    script.async = true;
    document.body.appendChild(script);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [dataId]);
};
