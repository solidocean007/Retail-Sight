import { doc, updateDoc } from "firebase/firestore";
import AdminUserRowActions from "./AdminUserRowActions";
import { AdminUserRow } from "./AdminUsersConsole";
import { db } from "../../utils/firebase";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";
import { UserType } from "../../utils/types";
import "./adminUsersConsole.css";

// ---- Small helpers ----
export function StatusPill({ value }: { value: AdminUserRow["status"] }) {
  return <span className={`status-pill status-${value}`}>{value}</span>;
}

function AdminUserCard({
  row,
  setEditRow,
}: {
  row: AdminUserRow;
  setEditRow: React.Dispatch<React.SetStateAction<UserType | null>>;
}) {
  const dispatch = useAppDispatch();
  const handleSetUserStatus = async (
    uid: string,
    newStatus: "active" | "inactive"
  ) => {
    try {
      await updateDoc(doc(db, "users", uid), { status: newStatus });
      dispatch(
        showMessage({ text: `User ${newStatus}.`, severity: "success" })
      );
    } catch (err: any) {
      dispatch(
        showMessage({
          text: err.message ?? "Update failed.",
          severity: "error",
        })
      );
    }
  };

  return (
    <div className="user-card">
      <div className="user-card-body">
        <div className="user-card-name-role">
          <div className="user-card-name">
            {row.firstName} {row.lastName}
          </div>
          <div className="user-card-meta">
            • {row.role}
          </div>
        </div>
        <div className="user-card-content">
          <div className="user-card-email">{row.email}</div>
          {row.phone && <div className="user-card-phone">{row.phone}</div>}
          <div className="user-card-status">
            <StatusPill value={row.status} />
          </div>
        </div>
      </div>

      {/* <div className="user-card-footer">
        {row.createdAt && <span>Created {row.createdAt}</span>}
        {row.lastActive && <span>• Last active {row.lastActive}</span>}
      </div> */}
      <AdminUserRowActions
        row={row}
        onEdit={() => setEditRow(row)}
        onActivate={() => handleSetUserStatus(row.id, "active")}
        onDeactivate={() => handleSetUserStatus(row.id, "inactive")}
      />
    </div>
  );
}

export default AdminUserCard;
