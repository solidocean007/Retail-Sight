import React, { useEffect } from "react";

const PushDebugConsole = () => {
  const [logs, setLogs] = React.useState<string[]>([]);

  useEffect(() => {
    const listener = (e: any) => {
      setLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] ${JSON.stringify(e.detail)}`,
        ...prev,
      ]);
    };

    window.addEventListener("push-debug", listener);
    return () => window.removeEventListener("push-debug", listener);
  }, []);

  return (
    <div
      style={{
        background: "#111",
        color: "#0f0",
        padding: "1rem",
        marginBottom: "1rem",
        height: "150px",
        overflowY: "auto",
        fontFamily: "monospace",
        borderRadius: "8px",
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
        Push Debug Console
      </div>
      {logs.length === 0 && (
        <div style={{ opacity: 0.5 }}>No push activity yet…</div>
      )}
      {logs.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
};

export default PushDebugConsole;
