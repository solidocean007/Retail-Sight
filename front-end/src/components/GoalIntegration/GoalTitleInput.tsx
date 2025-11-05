import { useState } from "react";
import "./GoalTitleInput.css";

const MAX_LENGTH = 70;
const SOFT_LIMIT = 50;

const GoalTitleInput = ({ value, setValue }: { value: string; setValue: (v: string) => void }) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className="goal-title-input-wrapper">
      <label htmlFor="goal-title">Goal Title</label>
      <input
        id="goal-title"
        type="text"
        value={value}
        maxLength={MAX_LENGTH}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="goal-title-input"
        placeholder="e.g. Display 3 Cases..."
      />
      <div className="goal-title-meta">
        <span className={`goal-title-count ${value.length > SOFT_LIMIT ? "warn" : ""}`}>
          {value.length} / {MAX_LENGTH}
        </span>
        {value.length > SOFT_LIMIT && (
          <span className="goal-title-helper">Consider keeping under {SOFT_LIMIT} characters</span>
        )}
      </div>
    </div>
  );
};

export default GoalTitleInput;
