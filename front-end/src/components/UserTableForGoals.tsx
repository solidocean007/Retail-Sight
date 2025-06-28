import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./userTableForGoals.css";
import { getCompletionClass } from "../utils/helperFunctions/getCompletionClass";
import { CompanyGoalWithIdType, PostQueryFilters } from "../utils/types";
import { clearAllFilters } from "./FilterSideBar/utils/filterUtils";

interface UserRowType {
  uid: string;
  firstName: string;
  lastName: string;
  submissions: { postId: string; storeName: string; submittedAt: string }[];
  userCompletionPercentage: number;
}

const UserTableForGoals = ({
  users,
  goal,
}: {
  users: UserRowType[];
  goal: CompanyGoalWithIdType;
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  type SortMode = "completion-desc" | "completion-asc" | "alphabetical";
  const [sortMode, setSortMode] = useState<SortMode>("completion-desc");

  const handleViewGoalPost = (postId: string) => {
    console.log('postId: ', postId)
    const base = clearAllFilters();
    const filters = {
      ...base,
      companyGoalId: goal.id,
      companyGoalTitle: goal.goalTitle,
    };

    navigate("/user-home-page", {
      state: { filters, postIdToScroll: postId },
    });
  };

  const sortedFilteredUsers = useMemo(() => {
    const filtered = users.filter((u) =>
      `${u.firstName} ${u.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      if (sortMode === "completion-desc") {
        return b.userCompletionPercentage - a.userCompletionPercentage;
      }
      if (sortMode === "completion-asc") {
        return a.userCompletionPercentage - b.userCompletionPercentage;
      }
      // Alphabetical by last, then first
      const aLast = a.lastName || "";
      const bLast = b.lastName || "";
      const aFirst = a.firstName || "";
      const bFirst = b.firstName || "";
      return aLast.localeCompare(bLast) || aFirst.localeCompare(bFirst);
    });
  }, [users, searchTerm, sortMode]);

  return (
    <div>
      <div className="user-table-head">
        <div className="user-table-search">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ marginBottom: "8px", padding: "4px", width: "100%" }}
          />
        </div>
        <div className="user-table-filter">
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            style={{ marginBottom: "8px", marginLeft: "8px" }}
          >
            <option value="completion-desc">Completion ↓</option>
            <option value="completion-asc">Completion ↑</option>
            <option value="alphabetical">Alphabetical (Last Name)</option>
          </select>
        </div>
      </div>

      <table className="user-table">
        <tbody>
          {sortedFilteredUsers.map((user, idx) => (
            <tr key={user.uid}>
              <td className="user-table-count">{idx + 1}</td>
              <td>
                <div className="user-info-cell">
                  <div className="user-name-cell">{`${user.lastName}, ${user.firstName}`}</div>
                  <div
                    className={getCompletionClass(
                      user.userCompletionPercentage
                    )}
                  >
                    {user.userCompletionPercentage}%
                  </div>
                </div>
                <div className="submissions-wrapper">
                  {user.submissions.length > 0
                    ? user.submissions.map((sub, subIdx) => (
                        <div key={subIdx} className="submission-item">
                          <div className="store-name">{sub.storeName}</div>
                          <div className="submitted-at">
                            {new Date(sub.submittedAt).toLocaleString()}
                          </div>

                          <button
                            onClick={() => handleViewGoalPost(sub.postId)}
                          >
                            View
                          </button>
                        </div>
                      ))
                    : "—"}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserTableForGoals;
