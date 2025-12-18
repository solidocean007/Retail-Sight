import { UserType } from "../../utils/types";
import "./recentlyAcceptedList.css"

export const RecentlyAcceptedList = ({
  users,
}: {
  users: UserType[];
}) => {
  if (!users.length) return null;

  return (
    <section className="recent-accepted">
      <h4>✅ Recently Accepted</h4>

      <ul className="recent-accepted-list">
        {users.map((u) => (
          <li key={u.uid} className="recent-accepted-item">
            <div className="recent-avatar">
              {u.firstName?.[0]}
            </div>
            <div className="recent-meta">
              <strong>
                {u.firstName} {u.lastName}
              </strong>
              <span>{u.email}</span>
            </div>
            <span className="recent-role">{u.role}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
