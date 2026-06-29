// src/components/Playbooks/PlaybooksPage.tsx
import React, { useMemo, useState } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { CompanyGoalWithIdType, PostWithID } from "../../utils/types";
import PlaybookForm from "./PlaybookForm";
import "./playbooksPage.css";
import PlaybookDetailView from "./PlaybookDetailView";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";
import {
  CreateCollectionInput,
  CollectionWithId,
  PlaybookPostSnapshot,
  isPlaybookCollection,
} from "../../types/library";
import { buildPlaybookPostSnapshot } from "../../utils/helperFunctions/buildPlaybookPostSnapshot";
import { selectUser } from "../../Slices/userSlice";
import { selectAllCompanyGoals } from "../../Slices/companyGoalsSlice";
import { useSelector } from "react-redux";
import { db } from "../../utils/firebase";

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

  const user = useSelector(selectUser);
  const companyGoals = useSelector(selectAllCompanyGoals);
  const canManagePlaybooks =
    user?.role === "admin" ||
    user?.role === "super-admin" ||
    user?.role === "supervisor" ||
    user?.role === "developer";

  const playbooks = useMemo(() => {
    return collections.filter(isPlaybookCollection);
  }, [collections]);

  const selectedPlaybookPosts = useMemo(() => {
    if (!selectedPlaybook) return [];
    return posts.filter((post) => selectedPlaybook.postIds?.includes(post.id));
  }, [posts, selectedPlaybook]);

  const getLinkedGoalsForPlaybook = (playbook: CollectionWithId) => {
    const explicitGoalIds = new Set(playbook.goalIds ?? []);

    return companyGoals.filter((goal) => {
      if (!goal || goal.deleted) return false;
      if (goal.playbookId && goal.playbookId === playbook.id) return true;
      return explicitGoalIds.has(goal.id);
    });
  };

  const linkedGoalsByPlaybookId = useMemo(() => {
    const map = new Map<string, CompanyGoalWithIdType[]>();

    playbooks.forEach((playbook) => {
      map.set(playbook.id, getLinkedGoalsForPlaybook(playbook));
    });

    return map;
  }, [playbooks, companyGoals]);

  const selectedPlaybookUsedGoals = useMemo(() => {
    if (!selectedPlaybook) return [];

    const linkedGoals = linkedGoalsByPlaybookId.get(selectedPlaybook.id) ?? [];

    return linkedGoals.map((goal) => {
      const assignedAccountsCount = goal.accountNumbersForThisGoal?.length ?? 0;
      const completedDisplaysCount = posts.filter(
        (post) => post.companyGoalId === goal.id,
      ).length;

      return {
        goal,
        assignedAccountsCount,
        completedDisplaysCount,
      };
    });
  }, [selectedPlaybook, linkedGoalsByPlaybookId, posts]);

  const handleOpenPlaybook = (playbook: CollectionWithId) => {
    setSelectedPlaybook(playbook);
  };

  const handleUpdatePlaybookPlay = async (
    postId: string,
    input: { playName: string; playDescription?: string },
  ) => {
    if (!selectedPlaybook) return;

    const trimmedName = input.playName.trim();
    const trimmedDescription = input.playDescription?.trim();

    if (!trimmedName) {
      dispatch(showMessage("Play name is required."));
      return;
    }

    const baseSnapshots: PlaybookPostSnapshot[] =
      selectedPlaybook.playbookPostSnapshots?.length
        ? selectedPlaybook.playbookPostSnapshots
        : selectedPlaybookPosts.map((post) => buildPlaybookPostSnapshot(post));

    const nextPlaybookSnapshots = baseSnapshots.map((snapshot) =>
      snapshot.postId === postId
        ? {
            ...snapshot,
            playName: trimmedName,
            playDescription: trimmedDescription || undefined,
          }
        : snapshot,
    );

    const featuredIds = new Set(selectedPlaybook.featuredPostIds ?? []);
    const baseFeaturedSnapshots: PlaybookPostSnapshot[] =
      selectedPlaybook.featuredPostSnapshots?.length
        ? selectedPlaybook.featuredPostSnapshots
        : nextPlaybookSnapshots.filter((snapshot) =>
            featuredIds.has(snapshot.postId),
          );

    const nextFeaturedSnapshots = baseFeaturedSnapshots.map((snapshot) =>
      snapshot.postId === postId
        ? {
            ...snapshot,
            playName: trimmedName,
            playDescription: trimmedDescription || undefined,
          }
        : snapshot,
    );

    try {
      await updateDoc(doc(db, "collections", selectedPlaybook.id), {
        playbookPostSnapshots: nextPlaybookSnapshots,
        featuredPostSnapshots: nextFeaturedSnapshots,
        updatedAt: serverTimestamp(),
      });

      setSelectedPlaybook((prev) =>
        prev
          ? {
              ...prev,
              playbookPostSnapshots: nextPlaybookSnapshots,
              featuredPostSnapshots: nextFeaturedSnapshots,
            }
          : prev,
      );

      dispatch(showMessage("Play updated."));
    } catch (error) {
      console.error("Error updating play details:", error);
      dispatch(showMessage("Could not update play details."));
      throw error;
    }
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
      playbookPostSnapshots: input.playbookPostSnapshots ?? [],
      featuredPostSnapshots: input.featuredPostSnapshots ?? [],
    });

    dispatch(
      showMessage("Playbook created. Start adding plays from proven displays."),
    );
    setIsFormOpen(false);
  };

  if (loading) {
    return <p className="playbooks-loading">Loading playbooks...</p>;
  }

  if (selectedPlaybook) {
    return (
      <PlaybookDetailView
        playbook={selectedPlaybook}
        posts={selectedPlaybookPosts}
        usedGoals={selectedPlaybookUsedGoals}
        onUpdatePlay={handleUpdatePlaybookPlay}
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
          <p className="playbooks-eyebrow">Build from what worked before</p>

          <h2>Playbooks</h2>

          <p>
            Turn proven display photos into reusable game plans. Add
            coach&apos;s notes, execution goals, timing, and featured plays so
            your team can run with examples instead of starting from scratch.
          </p>
        </div>

        {canManagePlaybooks && (
          <button
            type="button"
            className="button-primary"
            onClick={() => setIsFormOpen(true)}
          >
            Create Playbook
          </button>
        )}
      </div>

      <div className="playbooks-info-grid">
        <article className="playbooks-info-card">
          <h3>Game Plan</h3>
          <p>
            Explain what the team is trying to accomplish and how past displays
            should guide the next execution.
          </p>
        </article>

        <article className="playbooks-info-card">
          <h3>Coach&apos;s Notes</h3>
          <p>
            Add manager guidance, timing, account focus, brand priorities, and
            reminders about what made the original displays work.
          </p>
        </article>

        <article className="playbooks-info-card">
          <h3>Run the Play</h3>
          <p>
            Reps use featured displays as a starting point, execute in the
            field, and create new displays that improve future playbooks.
          </p>
        </article>
      </div>

      <div className="playbooks-section-header">
        <div>
          <h3>Your Playbooks</h3>
          <p>Reusable game plans built from display history.</p>
        </div>
      </div>

      {playbooks.length === 0 ? (
        <div className="playbooks-empty-state">
          <h3>No playbooks yet</h3>
          <p>
            Create your first playbook to turn proven displays into a field
            execution guide for your team.
          </p>

          {canManagePlaybooks && (
            <button
              type="button"
              className="button-primary"
              onClick={() => setIsFormOpen(true)}
            >
              Create First Playbook
            </button>
          )}
        </div>
      ) : (
        <div className="playbooks-grid">
          {playbooks.map((playbook) => {
            const previewImages = playbook.previewImages ?? [];
            const featuredPostIds = playbook.featuredPostIds ?? [];
            const displayCount = playbook.postIds?.length ?? 0;
            const status = playbook.playbookStatus ?? "draft";
            const audience = playbook.audience ?? "sales";
            const linkedGoalsCount =
              linkedGoalsByPlaybookId.get(playbook.id)?.length ?? 0;
            const coachNotes =
              playbook.coachNotes ??
              (playbook as CollectionWithId & { managerNotes?: string })
                .managerNotes;

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
                      No plays added yet
                    </div>
                  )}
                </div>

                <div className="playbook-card-body">
                  <div className="playbook-card-topline">
                    <span className="playbook-badge">{status}</span>
                    <span className="playbook-audience">{audience}</span>
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

                    {playbook.gamePlan && (
                      <p>
                        <strong>Game plan:</strong> {playbook.gamePlan}
                      </p>
                    )}

                    {playbook.executionGoal && (
                      <p>
                        <strong>Execution goal:</strong>{" "}
                        {playbook.executionGoal}
                      </p>
                    )}

                    {coachNotes && (
                      <p>
                        <strong>Coach&apos;s notes:</strong>{" "}
                        {coachNotes}
                      </p>
                    )}

                    {playbook.season && (
                      <p>
                        <strong>Season:</strong> {playbook.season}
                      </p>
                    )}

                    {playbook.programName && (
                      <p>
                        <strong>Program:</strong> {playbook.programName}
                      </p>
                    )}
                  </div>

                  <div className="playbook-stats">
                    <span>
                      {displayCount} play{displayCount !== 1 ? "s" : ""}
                    </span>

                    <span>
                      {featuredPostIds.length} featured{" "}
                      {featuredPostIds.length === 1 ? "play" : "plays"}
                    </span>

                    <span>
                      Used in {linkedGoalsCount} goal
                      {linkedGoalsCount === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="playbook-actions">
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => handleOpenPlaybook(playbook)}
                    >
                      Open Playbook
                    </button>
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
