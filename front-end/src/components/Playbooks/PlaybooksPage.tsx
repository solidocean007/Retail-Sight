// src/components/Playbooks/PlaybooksPage.tsx
import React, { useMemo, useState } from "react";
import {
  CollectionWithId,
  CreateCollectionInput,
  PostWithID,
} from "../../utils/types";
import PlaybookForm from "./PlaybookForm";
import "./playbooksPage.css";
import PlaybookDetailView from "./PlaybookDetailView";
import { useDispatch } from "react-redux";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";

interface PlaybooksPageProps {
  collections: CollectionWithId[];
  posts?: PostWithID[];
  loading?: boolean;
  onAddPlaybook: (newPlaybook: CreateCollectionInput) => Promise<void>;
}

const PlaybooksPage: React.FC<PlaybooksPageProps> = ({
  collections,
  posts = [],
  loading = false,
  onAddPlaybook,
}) => {
  const dispatch = useAppDispatch();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPlaybook, setSelectedPlaybook] =
    useState<CollectionWithId | null>(null);

  const playbooks = useMemo(() => {
    return collections.filter(
      (collection) => collection.collectionType === "playbook",
    );
  }, [collections]);

  const handleOpenPlaybook = (playbook: CollectionWithId) => {
    const displayCount = playbook.postIds?.length ?? 0;

    if (displayCount === 0) {
      dispatch(
        showMessage(
          "This playbook has no displays yet. Add displays before viewing the full playbook.",
        ),
      );
      return;
    }

    setSelectedPlaybook(playbook);
  };

  const printPlaybook = async () => {
    document.body.classList.add("print-playbook");

    const images = Array.from(
      document.querySelectorAll(".playbook-detail img"),
    );

    await Promise.all(
      images.map((img) => {
        const image = img as HTMLImageElement;

        if (image.complete) return Promise.resolve();

        return new Promise((resolve) => {
          image.onload = resolve;
          image.onerror = resolve;
        });
      }),
    );

    setTimeout(() => {
      window.print();
    }, 250);
  };

  React.useEffect(() => {
    const cleanup = () => {
      document.body.classList.remove("print-playbook");
    };

    window.addEventListener("afterprint", cleanup);

    return () => {
      window.removeEventListener("afterprint", cleanup);
      cleanup();
    };
  }, []);

  const handleAddPlaybook = async (input: CreateCollectionInput) => {
    await onAddPlaybook({
      ...input,
      collectionType: "playbook",
      playbookStatus: input.playbookStatus ?? "draft",
      postIds: input.postIds ?? [],
      previewImages: input.previewImages ?? [],
      sharedWith: input.sharedWith ?? [],
      isShareableOutsideCompany: input.isShareableOutsideCompany ?? false,
      featuredPostIds: input.featuredPostIds ?? [],
    });

    setIsFormOpen(false);
  };

  if (loading) {
    return <p className="playbooks-loading">Loading playbooks...</p>;
  }

  if (selectedPlaybook) {
    const playbookPosts = posts.filter((post) =>
      selectedPlaybook.postIds?.includes(post.id),
    );

    return (
      <PlaybookDetailView
        playbook={selectedPlaybook}
        posts={playbookPosts}
        onBack={() => setSelectedPlaybook(null)}
        onShare={() => console.log("Share playbook")}
        onExportPdf={printPlaybook}
      />
    );
  }

  return (
    <section className="playbooks-page">
      <div className="playbooks-hero">
        <div>
          <p className="playbooks-eyebrow">Reusable execution guidance</p>
          <h2>Playbooks</h2>
          <p>
            Playbooks turn proven display photos into guided execution tools.
            Managers can add context, goals, timing, and notes so reps know how
            to use past displays as a starting point instead of starting from
            scratch.
          </p>
        </div>

        <button
          type="button"
          className="button-primary"
          onClick={() => setIsFormOpen(true)}
        >
          Create Playbook
        </button>
      </div>

      <div className="playbooks-info-grid">
        <article className="playbooks-info-card">
          <h3>What reps should understand</h3>
          <p>
            A playbook should explain when to use the displays, what the manager
            is trying to accomplish, and how each example can be adapted in the
            field.
          </p>
        </article>

        <article className="playbooks-info-card">
          <h3>What managers add</h3>
          <p>
            Manager notes, execution goals, featured displays, brand/program
            context, and reminders about what made the original execution work.
          </p>
        </article>

        <article className="playbooks-info-card">
          <h3>Where this is going</h3>
          <p>
            Playbooks can become Displaygram-branded execution guides that are
            shareable as PDFs across a distributor, supplier, or sales network.
          </p>
        </article>
      </div>

      <div className="playbooks-section-header">
        <div>
          <h3>Your Playbooks</h3>
          <p>
            Guided collections built from display history and manager context.
          </p>
        </div>
      </div>

      {playbooks.length === 0 ? (
        <div className="playbooks-empty-state">
          <h3>No playbooks yet</h3>
          <p>
            Create your first playbook to group proven displays with notes,
            timing, and execution goals for your team.
          </p>
          <button
            type="button"
            className="button-primary"
            onClick={() => setIsFormOpen(true)}
          >
            Create First Playbook
          </button>
        </div>
      ) : (
        <div className="playbooks-grid">
          {playbooks.map((playbook) => {
            const previewImages = playbook.previewImages ?? [];
            const featuredPostIds = playbook.featuredPostIds ?? [];
            const displayCount = playbook.postIds?.length ?? 0;
            const isEmptyPlaybook = displayCount === 0;

            return (
              <article className="playbook-card" key={playbook.id}>
                <div className="playbook-card-preview">
                  {previewImages.length > 0 ? (
                    previewImages
                      .slice(0, 3)
                      .map((imageUrl, index) => (
                        <img
                          key={`${playbook.id}-${imageUrl}-${index}`}
                          src={imageUrl}
                          alt=""
                        />
                      ))
                  ) : (
                    <div className="playbook-card-placeholder">
                      Displaygram Playbook
                    </div>
                  )}
                </div>

                <div className="playbook-card-body">
                  <div className="playbook-card-topline">
                    <span className="playbook-badge">
                      {playbook.playbookStatus ?? "draft"}
                    </span>

                    {playbook.audience && (
                      <span className="playbook-audience">
                        {playbook.audience}
                      </span>
                    )}
                  </div>

                  <h4>{playbook.title}</h4>

                  {playbook.description && (
                    <p className="playbook-description">
                      {playbook.description}
                    </p>
                  )}

                  <div className="playbook-detail-list">
                    {playbook.whenToUse && (
                      <p>
                        <strong>When to use:</strong> {playbook.whenToUse}
                      </p>
                    )}

                    {playbook.executionGoal && (
                      <p>
                        <strong>Execution goal:</strong>{" "}
                        {playbook.executionGoal}
                      </p>
                    )}

                    {playbook.managerNotes && (
                      <p>
                        <strong>Manager notes:</strong> {playbook.managerNotes}
                      </p>
                    )}
                  </div>

                  <div className="playbook-stats">
                    <span>
                      {displayCount} display{displayCount !== 1 ? "s" : ""}
                    </span>
                    <span>{featuredPostIds.length} featured</span>
                  </div>

                  <div className="playbook-actions">
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => handleOpenPlaybook(playbook)}
                    >
                      View Playbook
                    </button>

                    {/* <button
                      type="button"
                      className="btn-outline"
                      disabled={isEmptyPlaybook}
                      title={
                        isEmptyPlaybook
                          ? "Add displays before exporting this playbook."
                          : "Export this playbook as a PDF."
                      }
                      onClick={() => {
                        if (isEmptyPlaybook) {
                          dispatch(
                            showMessage(
                              "Add displays to this playbook before exporting.",
                            ),
                          );
                          return;
                        }

                        setSelectedPlaybook(playbook);
                        setTimeout(() => window.print(), 100);
                      }}
                    >
                      Export PDF
                    </button> */}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <PlaybookForm
        isOpen={isFormOpen}
        onAddPlaybook={handleAddPlaybook}
        onClose={() => setIsFormOpen(false)}
      />
    </section>
  );
};

export default PlaybooksPage;
