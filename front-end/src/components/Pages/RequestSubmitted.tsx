import "./RequestSubmitted.css";

export default function RequestSubmitted() {
  return (
    <main className="request-submitted-page">
      <section className="request-card fade-in-up">
        <div className="checkmark-container">
          <div className="checkmark-glow"></div>
          <div className="checkmark-symbol">✅</div>
        </div>

        <h1 className="request-title">Request Received</h1>

        <p className="request-message">
          Thanks for submitting your access request! Our team will review your
          information and email you from{" "}
          <a href="mailto:support@displaygram.com" className="support-link">
            support@displaygram.com
          </a>{" "}
          once a decision has been made.
        </p>

        <div className="button-row">
          <a href="/" className="btn btn-primary">
            Return Home
          </a>
          <a href="mailto:support@displaygram.com" className="btn btn-outline">
            Contact Support
          </a>
        </div>

        <p className="small-note">
          You can close this page safely — we’ll be in touch soon.
        </p>
      </section>
    </main>
  );
}
