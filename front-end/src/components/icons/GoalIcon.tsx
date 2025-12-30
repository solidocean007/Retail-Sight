import React from "react";
import './goalIcon.css';

type Props = {
  className?: string;
};

export default function GoalIcon({ className }: Props) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="10" fill="var(--target-ring-1)" />
      <circle cx="12" cy="12" r="7" fill="var(--target-ring-2)" />
      <circle cx="12" cy="12" r="4" fill="var(--target-ring-3)" />
      <circle cx="12" cy="12" r="2" fill="var(--target-core)" />
    </svg>
  );
}
