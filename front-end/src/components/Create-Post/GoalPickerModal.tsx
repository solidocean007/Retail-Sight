// components/GoalPickerModal.tsx
import React, { useMemo, useState } from "react";
import { Dialog, AppBar, Toolbar, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";

import "./goalPickerModal.css";

interface GoalPickerModalProps<T> {
  open: boolean;
  title: string;
  goals: T[];
  getId: (g: T) => string;
  getLabel: (g: T) => string;
  selectedId?: string | null;
  onClose: () => void;
  onSelect: (goal: T) => void;
}

export function GoalPickerModal<T>({
  open,
  title,
  goals,
  getId,
  getLabel,
  selectedId,
  onClose,
  onSelect,
}: GoalPickerModalProps<T>) {
  const [query, setQuery] = useState("");

  const filteredGoals = useMemo(() => {
    const q = query.toLowerCase();
    return goals.filter((g) => getLabel(g).toLowerCase().includes(q));
  }, [goals, query, getLabel]);

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={(_, reason) => {
        if (reason === "backdropClick") onClose();
      }}
      slotProps={{
        paper: {
          sx: {
            backgroundColor: "transparent",
            boxShadow: "none",
            overflow: "hidden",
          },
        },
      }}
    >
      <AppBar position="sticky" elevation={1}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={onClose}>
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 2 }}>
            {title}
          </Typography>
        </Toolbar>
      </AppBar>

      <div
        className="goal-picker-backdrop"
        onMouseDown={() => onClose()} // closes when clicking outside card
        onTouchStart={() => onClose()} // mobile safety
      >
        <div
          className="goal-picker-card"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {/* 🔍 Search */}
          <div className="goal-picker-search">
            <input
              type="text"
              placeholder="Search goals…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* List */}
          {filteredGoals.map((g, index) => {
            const id = getId(g);
            const selected = id === selectedId;

            return (
              <div
                key={id}
                className={`goal-picker-row ${
                  index % 2 === 0 ? "even" : "odd"
                } ${selected ? "selected" : ""}`}
                onClick={() => {
                  onSelect(g);
                  onClose();
                }}
              >
                <div className="goal-picker-text">{getLabel(g)}</div>

                {selected && <CheckIcon className="goal-picker-check" />}
              </div>
            );
          })}

          {filteredGoals.length === 0 && (
            <div className="goal-picker-empty">No matching goals</div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
