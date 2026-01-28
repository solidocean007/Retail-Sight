type GoalActionsMenuProps = {
  open: boolean;
  status: "active" | "disabled" | "archived";
  onEdit: () => void;
  onArchive: () => void;
  onDisable: () => void;
};

export const GoalActionsMenu: React.FC<GoalActionsMenuProps> = ({
  open,
  status,
  onEdit,
  onArchive,
  onDisable,
}) => {
  if (!open) return null;

  return (
    <div className="goal-actions-overlay">
      {status === "active" && (
        <>
          <button onClick={onEdit}>Edit</button>
          <button onClick={onArchive}>Archive</button>
          <button onClick={onDisable}>Disable</button>
        </>
      )}
    </div>
  );
};
