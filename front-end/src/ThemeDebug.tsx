// components/ThemeDebug.tsx
import React, { useEffect, useState } from "react";

const keys = [
  "--background-body",
  "--post-card-background",
  "--text-color",
  "--button-background",
  "--button-background-hover",
  "--button-text-color",
  "--border-color",
  "--header-background",
  "--card-radius",
];

export const ThemeDebug = () => {
  const [vars, setVars] = useState<Record<string, string>>({});

  useEffect(() => {
    const values: Record<string, string> = {};
    keys.forEach((key) => {
      values[key] = getComputedStyle(document.documentElement)
        .getPropertyValue(key)
        .trim();
    });
    setVars(values);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        bottom: "1rem",
        right: "1rem",
        background: "#fff",
        color: "#111",
        border: "1px solid #ddd",
        padding: "0.5rem",
        fontSize: "0.75rem",
        zIndex: 9999,
        maxHeight: "60vh",
        overflowY: "auto",
        boxShadow: "0 0 8px rgba(0,0,0,0.2)",
        borderRadius: "8px",
      }}
    >
      <strong>🎨 Theme Vars</strong>
      <ul style={{ padding: 0, margin: 0 }}>
        {Object.entries(vars).map(([key, value]) => (
          <li key={key}>
            <code>{key}</code>:{" "}
            <span style={{ fontWeight: "bold" }}>{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
