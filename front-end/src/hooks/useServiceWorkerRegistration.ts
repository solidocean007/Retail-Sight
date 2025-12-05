// import { useEffect } from "react";

// export function useServiceWorkerRegistration(user: any) {
//   useEffect(() => {
//     if (!user) return;
//     if (!("serviceWorker" in navigator)) return;

//     const isIOS =
//       typeof window !== "undefined" &&
//       /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());

//     const isStandalone =
//       typeof window !== "undefined" &&
//       (window.matchMedia("(display-mode: standalone)").matches ||
//         (navigator as any).standalone === true);

//     // iOS Safari (not PWA installed) → DO NOT REGISTER SW
//     if (isIOS && !isStandalone) {
//       console.log("Skipping SW registration on iOS Safari.");
//       return;
//     }

//     const timer = setTimeout(() => {
//       navigator.serviceWorker.register("/service-worker.js");
//     }, 500);

//     return () => clearTimeout(timer);
//   }, [user]);
// }
