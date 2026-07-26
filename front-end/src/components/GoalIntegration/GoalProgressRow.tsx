import "./../userTableForGoals.css";
import { GoalAccountReport, GoalKind } from "../../types/goalReports";
import AccountReportAction from "../GoalReports/AccountReportAction";

interface Submission {
  postId: string;
  storeName: string;
  submittedAt?: string;
}

interface UnsubmittedAccount {
  accountName: string;
  accountAddress: string;
  accountNumber: string;
  /** Gallo opportunity id — the identity a Gallo report is keyed on. */
  oppId?: string;
}

interface ReportingContext {
  goalKind: GoalKind;
  goalId: string;
  goalTitle?: string;
}

interface Props {
  title: string; // "Williams, Clinton" OR "Your Accounts"
  completionPercentage: number;
  submissions: Submission[];
  unsubmittedAccounts: UnsubmittedAccount[];
  onViewPost: (postId: string, ref: HTMLElement) => void;

  /** Opt-in rep capture — omitted in any admin-facing usage. */
  reporting?: ReportingContext;
  reports?: GoalAccountReport[];
  onReportSaved?: () => void;
}

const GoalProgressRow: React.FC<Props> = ({
  title,
  completionPercentage,
  submissions,
  unsubmittedAccounts,
  onViewPost,
  reporting,
  reports = [],
  onReportSaved,
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
                      <li key={acc.oppId ?? acc.accountNumber}>
                        <div className="unsubmitted-account-name">
                          {acc.accountName}
                        </div>
                        <div className="unsubmitted-account-address">
                          {acc.accountAddress || "No address"}
                        </div>
                        {reporting && (
                          <AccountReportAction
                            goalKind={reporting.goalKind}
                            goalId={reporting.goalId}
                            goalTitle={reporting.goalTitle}
                            oppId={acc.oppId}
                            accountNumber={
                              acc.oppId ? undefined : acc.accountNumber
                            }
                            accountName={acc.accountName}
                            existingReport={reports.find((r) =>
                              acc.oppId
                                ? r.oppId === acc.oppId
                                : r.accountNumber === acc.accountNumber,
                            )}
                            onSaved={onReportSaved}
                          />
                        )}
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
