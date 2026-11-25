import { Component, type ErrorInfo, type ReactNode } from "react";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import "./savedPostsPage.css";

type Props = {
  children: ReactNode;
};

type State = {
  failed: boolean;
};

export class SavedPostsErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Saved Posts screen failed:", error, info);
  }

  private goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.assign("/user-home-page");
  };

  private retry = () => {
    this.setState({ failed: false });
  };

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="saved-posts-page">
        <header className="saved-posts-page__header">
          <button type="button" onClick={this.goBack} aria-label="Go back">
            <ArrowBackRoundedIcon />
          </button>
          <div>
            <h1>Saved posts</h1>
            <p>Your saved photo is still on this device.</p>
          </div>
        </header>
        <section className="saved-posts-page__empty saved-posts-page__recovery">
          <h2>We couldn’t open your saved posts</h2>
          <p>
            Go back and keep Displaygram installed. You can try this screen
            again without deleting the saved photo.
          </p>
          <div className="saved-post-card__actions">
            <button type="button" onClick={this.retry}>
              <RefreshRoundedIcon /> Try again
            </button>
            <button type="button" onClick={this.goBack}>
              <ArrowBackRoundedIcon /> Go back
            </button>
          </div>
        </section>
      </main>
    );
  }
}
