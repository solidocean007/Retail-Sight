import "./../userTableForGoals.css";

interface Submission {
  postId: string;
  storeName: string;
  submittedAt?: string;
}

interface UnsubmittedAccount {
  accountName: string;
  accountAddress: string;
  accountNumber: string;
}

interface Props {
  title: string; // "Williams, Clinton" OR "Your Accounts"
  completionPercentage: number;
  submissions: Submission[];
  unsubmittedAccounts: UnsubmittedAccount[];
  onViewPost: (postId: string, ref: HTMLElement) => void;
}

const GoalProgressRow: React.FC<Props> = ({
  title,
  completionPercentage,
  submissions,
  unsubmittedAccounts,
  onViewPost,
}) => {
  return (
    <div className="user-table-wrapper">
      <table className="user-table">
        <tbody>
          <tr>
            <td>
              <div className="user-info-cell">
                <div className="user-name-cell">{title}</div>

                <span
                  className={`completion-pill ${
                    completionPercentage >= 90
                      ? "high"
                      : completionPercentage >= 50
                      ? "mid"
                      : "low"
                  }`}
                >
                  {completionPercentage}%
                </span>
              </div>

              {/* Submissions */}
              <div className="submissions-wrapper">
                {submissions.length > 0 ? (
                  submissions.map((sub, idx) => (
                    <div key={idx} className="submission-item">
                      <div className="store-name">{sub.storeName}</div>
                      {sub.submittedAt && (
                        <div className="submitted-at">
                          {new Date(sub.submittedAt).toLocaleString()}
                        </div>
                      )}
                      <button
                        onClick={(e) => onViewPost(sub.postId, e.currentTarget)}
                      >
                        View
                      </button>
                    </div>
                  ))
                ) : (
                  <div>— No submissions</div>
                )}
              </div>

              {/* Unsubmitted */}
              {unsubmittedAccounts.length > 0 && (
                <details className="unsubmitted-details">
                  <summary
                    className="unsubmitted-summary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {unsubmittedAccounts.length} unsubmitted account
                    {unsubmittedAccounts.length > 1 ? "s" : ""}
                  </summary>
                  <ul className="unsubmitted-list">
                    {unsubmittedAccounts.map((acc) => (
                      <li key={acc.accountNumber}>
                        <strong>{acc.accountName}</strong> —{" "}
                        {acc.accountAddress || "No address"}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default GoalProgressRow;
