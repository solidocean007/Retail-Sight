import "./goalActionsMenu.css"
type GoalActionsMenuProps = {
  // open: boolean;
  status: "active" | "disabled" | "archived";
  onEdit: () => void;
  onArchive: () => void;
  onDisable: () => void;
};

export const GoalActionsMenu: React.FC<GoalActionsMenuProps> = ({
  // open,
  status,
  onEdit,
  onArchive,
  onDisable,
}) => {
  // if (!open) return null;

  return (
    <div className="goal-actions-menu">
      {status === "active" && (
        <div className="goal-actions-buttons">
          <button onClick={onEdit}>Edit</button>
         
        </div>
      )}
    </div>
  );
};
