import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./userTableForGoals.css";

interface UserRowType {
  uid: string;
  firstName: string;
  lastName: string;
  submissions: { postId: string; submittedAt: string }[];
  userCompletionPercentage: number;
}

const UserTableForGoals = ({ users }: { users: UserRowType[] }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const handleViewPost = (postId: string) => {
    navigate(`/user-home-page?postId=${postId}`);
  };

  const sortedFilteredUsers = useMemo(() => {
    return users
      .filter((u) =>
        `${u.firstName} ${u.lastName}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const aLast = a.lastName || "";
        const bLast = b.lastName || "";
        const aFirst = a.firstName || "";
        const bFirst = b.firstName || "";

        return aLast.localeCompare(bLast) || aFirst.localeCompare(bFirst);
      });
  }, [users, searchTerm]);

  const getCompletionClass = (percentage: number) => {
    const rounded = Math.round(percentage / 10) * 10; // Round to nearest 10
    return `completion-${rounded}`;
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Search users..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: "8px", padding: "4px", width: "100%" }}
      />

      <table className="user-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Last Name, First Name</th>
            <th>Submissions</th>
          </tr>
        </thead>
        <tbody>
          {sortedFilteredUsers.map((user, idx) => (
            <tr key={user.uid}>
              <td>{idx + 1}</td>
              <td>
                {user.lastName}, {user.firstName}{" "}
                <span
                  className={getCompletionClass(user.userCompletionPercentage)}
                >
                  {user.userCompletionPercentage}%
                </span>
              </td>

              <td>
                <div className="submissions-wrapper">
                  {user.submissions.length > 0
                    ? user.submissions.map((sub, subIdx) => (
                        <div key={subIdx} className="submission-item">
                          <span>
                            {new Date(sub.submittedAt).toLocaleString()}
                          </span>
                          <button onClick={() => handleViewPost(sub.postId)}>
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
