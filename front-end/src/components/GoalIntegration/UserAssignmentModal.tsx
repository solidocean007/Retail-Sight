import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Checkbox,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
} from "@mui/material";
import {
  CompanyAccountType,
  GoalAssignmentType,
  UserType,
} from "../../utils/types";
import "./userAssignmentModal.css";

interface UserAssignmentModalProps {
  user: UserType | null;
  accounts: CompanyAccountType[];
  goalAssignments: GoalAssignmentType[];
  setGoalAssignments: React.Dispatch<
    React.SetStateAction<GoalAssignmentType[]>
  >;
  onClose: () => void;
}

const UserAssignmentModal: React.FC<UserAssignmentModalProps> = ({
  user,
  accounts,
  goalAssignments,
  setGoalAssignments,
  onClose,
}) => {
  // hooks ALWAYS run — no early returns with hooks above
  const [searchTerm, setSearchTerm] = useState("");

  const isOpen = Boolean(user);

  const accountsForUser = useMemo(() => {
    if (!user) return [];
    return accounts.filter((acc) =>
      goalAssignments.some(
        (g) =>
          g.uid === user.uid && g.accountNumber === acc.accountNumber.toString()
      )
    );
  }, [accounts, goalAssignments, user]);

  const filteredAccounts = useMemo(() => {
    return accountsForUser.filter((a) =>
      (a.accountName || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [accountsForUser, searchTerm]);

  const toggleAccount = (acc: CompanyAccountType) => {
    if (!user) return;

    const accNum = acc.accountNumber.toString();

    const isAssigned = goalAssignments.some(
      (g) => g.uid === user.uid && g.accountNumber === accNum
    );

    if (isAssigned) {
      setGoalAssignments((prev) =>
        prev.filter((g) => !(g.uid === user.uid && g.accountNumber === accNum))
      );
    }
  };

  const removeAll = () => {
    if (!user) return;

    setGoalAssignments((prev) => prev.filter((g) => g.uid !== user.uid));
  };

  // Reset search when modal is closed or when user changes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    } else {
      setSearchTerm(""); // also reset when switching users
    }
  }, [isOpen, user]);

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      {user && (
        <>
          <DialogTitle>
            {user.firstName} {user.lastName} — {accountsForUser.length} Accounts
          </DialogTitle>

          <DialogContent dividers>
            <TextField
              fullWidth
              size="small"
              placeholder="Search accounts…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="uam-search"
            />

            <List dense className="uam-list">
              {filteredAccounts.map((acc) => {
                const accNum = acc.accountNumber.toString();
                const isAssigned = goalAssignments.some(
                  (g) => g.uid === user.uid && g.accountNumber === accNum
                );

                return (
                  <React.Fragment key={accNum}>
                    <ListItemButton onClick={() => toggleAccount(acc)}>
                      <ListItemIcon>
                        <Checkbox edge="start" checked={isAssigned} />
                      </ListItemIcon>

                      <ListItemText
                        primary={acc.accountName || acc.accountNumber}
                        secondary={`${acc.chain || "N/A"} • ${
                          acc.typeOfAccount || ""
                        }`}
                      />
                    </ListItemButton>
                    <Divider component="li" />
                  </React.Fragment>
                );
              })}

              {filteredAccounts.length === 0 && (
                <p className="uam-empty">No accounts found.</p>
              )}
            </List>
          </DialogContent>

          <DialogActions>
            <Button color="error" onClick={removeAll}>
              Remove All
            </Button>
            <Button variant="contained" onClick={onClose}>
              Save Changes
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

export default UserAssignmentModal;
