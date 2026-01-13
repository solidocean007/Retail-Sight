interface GoalActionsMenuProps {
  status: "active" | "archived" | "disabled";
  onArchive: () => void;
  onDisable: () => void;
  onEdit: () => void;
}

export const GoalActionsMenu: React.FC<GoalActionsMenuProps> = ({
  status,
  onArchive,
  onDisable,
  onEdit,
}) => {
  return (
    <details className="goal-actions">
      <summary>Manage</summary>

      {status === "active" && (
        <>
          <button onClick={onEdit}>Edit</button>
          <button onClick={onArchive}>Archive</button>
          <button onClick={onDisable}>Disable</button>
        </>
      )}
    </details>
  );
};
