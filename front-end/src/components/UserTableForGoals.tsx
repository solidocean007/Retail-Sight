import { useNavigate } from "react-router-dom";

// components/UserTable.tsx
const UserTableForGoals = ({ users }: { users: any[] }) => {
  const navigate = useNavigate();

  const handleViewPost = (postId: string) => {
    navigate(`/user-home-page?postId=${postId}`);
  };

  return (
    <table className="user-table">
      <thead>
        <tr>
          <th>#</th>
          <th>User</th>
          <th>Submitted At</th>
          <th>Post</th>
        </tr>
      </thead>
      <tbody>
        {users.map((u, idx) => (
          <tr key={u.uid}>
            <td>{idx + 1}</td>
            <td>{u.displayName}</td>
            <td>
              {u.submittedAt ? new Date(u.submittedAt).toLocaleString() : "—"}
            </td>
            <td>
              {u.postId ? (
                <button onClick={() => handleViewPost(u.postId)}>View</button>
              ) : (
                "—"
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default UserTableForGoals;
