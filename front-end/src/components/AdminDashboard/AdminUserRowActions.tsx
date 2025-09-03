import { useEffect, useRef, useState } from "react";
import { useAppDispatch } from "../../utils/store";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";
import { showMessage } from "../../Slices/snackbarSlice";
import { EditNotifications } from "@mui/icons-material";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import "./adminUsersConsole.css"

 interface RowActionsProps {
  row: AdminUserRow;
  onEdit: (row: AdminUserRow) => void;
  onActivate: (row: AdminUserRow) => void;
  onDeactivate: (row: AdminUserRow) => void;
}


function AdminUserRowActions({ row, onEdit, onActivate, onDeactivate }: RowActionsProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const open = Boolean(anchorEl);
  const dispatch = useAppDispatch();

  const handleSetUserStatus = async (uid: string, newStatus: "active" | "inactive") => {
  try {
    await updateDoc(doc(db, "users", uid), { status: newStatus });
    dispatch(showMessage({ text: `User ${newStatus}.`, severity: "success" }));
  } catch (err: any) {
    dispatch(showMessage({ text: err.message ?? "Update failed.", severity: "error" }));
  }
};


  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setAnchorEl(null);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="row-actions">
      <button
        className="action-button"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        ⋮
      </button>

      {open && (
        <div className="action-menu" ref={menuRef}>
          <div
            className="action-item"
            onClick={() => {
              setAnchorEl(null);
              onEdit(row);
            }}
          >
            <EditNotifications fontSize="small" /> Edit
          </div>

          {row.status !== "inactive" ? (
            <div
              className="action-item"
              onClick={() => {
                setAnchorEl(null);
                onDeactivate(row);
              }}
            >
              <BlockIcon fontSize="small" /> Deactivate
            </div>
          ) : (
            <div
              className="action-item"
              onClick={() => {
                setAnchorEl(null);
                onActivate(row);
              }}
            >
              <CheckCircleIcon fontSize="small" /> Activate
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminUserRowActions;