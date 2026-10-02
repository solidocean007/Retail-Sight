interface ArchivedMonthChipProps {
  month: string;
  count: number;
  isActive: boolean;
  onToggle: () => void;
}

const ArchivedMonthChip = ({
  month,
  count,
  isActive,
  onToggle,
}: ArchivedMonthChipProps) => (
  <button
    type="button"
    className={`archived-month-chip ${isActive ? "archived-month-chip--active" : ""}`}
    onClick={onToggle}
    aria-pressed={isActive}
  >
    <span>{month}</span>
    <strong>{count}</strong>
  </button>
);

export default ArchivedMonthChip;
