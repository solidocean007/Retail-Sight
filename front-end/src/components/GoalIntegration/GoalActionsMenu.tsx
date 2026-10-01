import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import { useEffect, useRef, useState } from "react";

import { LifecycleFilter } from "../../utils/types";

import "./goalActionsMenu.css";

type GoalActionsMenuProps = {
  status: LifecycleFilter;
  onEdit: () => void;
  onArchive: () => void;
  onDisable: () => void;
};

export const GoalActionsMenu = ({
  status,
  onEdit,
  onArchive,
  onDisable,
}: GoalActionsMenuProps) => {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideInteraction = (event: PointerEvent) => {
      if (!detailsRef.current?.contains(event.target as Node)) {
        detailsRef.current?.removeAttribute("open");
        setOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      detailsRef.current?.removeAttribute("open");
      setOpen(false);
      detailsRef.current?.querySelector("summary")?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsideInteraction);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideInteraction);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const run = (action: () => void) => {
    if (detailsRef.current) detailsRef.current.open = false;
    setOpen(false);
    action();
  };

  return (
    <details
      ref={detailsRef}
      className="goal-actions-menu"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary aria-label="Open goal actions" aria-haspopup="menu">
        <MoreVertRoundedIcon aria-hidden="true" />
      </summary>
      <div className="goal-actions-menu__popover" role="menu">
        <div className="goal-actions-menu__label">Goal actions</div>
        <button type="button" role="menuitem" onClick={() => run(onEdit)}>
          <span>Edit accounts</span>
          <small>Assignments and account status</small>
        </button>
        {status === "active" && (
          <>
            <button
              type="button"
              role="menuitem"
              onClick={() => run(onArchive)}
            >
              <span>Archive goal</span>
              <small>Move it out of active workflows</small>
            </button>
            <button
              type="button"
              role="menuitem"
              className="is-danger"
              onClick={() => run(onDisable)}
            >
              <span>Disable goal</span>
              <small>Stop new submissions immediately</small>
            </button>
          </>
        )}
      </div>
    </details>
  );
};
