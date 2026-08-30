import { Link } from "react-router-dom";
import AccessPageShell from "./AccessPageShell";

export default function RequestSubmitted() {
  return (
    <AccessPageShell
      storyEyebrow="Request received"
      storyTitle="Your company is now in the review queue."
      storyDescription="A real person reviews every new workspace so Displaygram stays useful, private, and focused on legitimate retail teams."
      highlights={[
        {
          label: "We verify the organization",
          detail: "The company name, work email, and requested workspace type are reviewed.",
        },
        {
          label: "Watch your work inbox",
          detail: "Approved contacts receive a secure invitation from Displaygram.",
        },
        {
          label: "Activate the workspace",
          detail: "The invitation guides the first user through account setup.",
        },
      ]}
      panelEyebrow="Submission complete"
      panelTitle="We received your request"
      panelDescription="Most legitimate company requests are reviewed within one business day."
      trustMessage="You can safely close this page. We will follow up by email."
    >
      <div className="access-shell-status">
        <div className="access-shell-status-icon" aria-hidden="true">
          ✓
        </div>

        <p>
          We’ll review the information you submitted and contact you from{" "}
          <a href="mailto:support@displaygram.com" className="support-link">
            support@displaygram.com
          </a>
          .
        </p>

        <div className="access-shell-status-actions">
          <Link to="/" className="access-shell-primary">
            Return Home
          </Link>
          <a
            href="mailto:support@displaygram.com"
            className="access-shell-secondary"
          >
            Contact Support
          </a>
        </div>

        <p className="access-shell-note">
          No account or company workspace exists until the request is approved.
        </p>
      </div>
    </AccessPageShell>
  );
}
