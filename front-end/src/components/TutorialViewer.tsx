import AddAPhotoRoundedIcon from "@mui/icons-material/AddAPhotoRounded";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CollectionsBookmarkOutlinedIcon from "@mui/icons-material/CollectionsBookmarkOutlined";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import TrackChangesOutlinedIcon from "@mui/icons-material/TrackChangesOutlined";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { selectIsSupplier } from "../Slices/currentCompanySlice";
import { selectUser } from "../Slices/userSlice";
import { TutorialPageHelmet } from "../utils/helmetConfigurations";
import type { DashboardModeType } from "../utils/types";
import "./tutorial.css";

type Track = "start" | "everyday" | "management";
type Audience = "everyone" | "supervisor" | "admin" | "supplier";
type Step = { title: string; body: string; note?: string };
type Action = {
  label: string;
  route?: string;
  dashboardMode?: DashboardModeType;
};
type Module = {
  id: string;
  track: Track;
  audience: Audience[];
  eyebrow: string;
  title: string;
  summary: string;
  duration: string;
  icon: ReactNode;
  image?: string;
  imageAlt?: string;
  imageFit?: "cover" | "contain";
  caption?: string;
  steps: Step[];
  action?: Action;
};

const TRACKS: Array<{ id: Track; label: string; description: string }> = [
  {
    id: "start",
    label: "Start here",
    description: "Capture a display and understand the feed.",
  },
  {
    id: "everyday",
    label: "Everyday work",
    description: "Find, organize, and share the work that matters.",
  },
  {
    id: "management",
    label: "Team management",
    description: "Goals, follow-up, and company operations.",
  },
];

const MODULES: Module[] = [
  {
    id: "first-display",
    track: "start",
    audience: ["everyone"],
    eyebrow: "Field workflow",
    title: "Create your first display",
    summary:
      "Move from a store photo to a complete, searchable display record in five focused steps.",
    duration: "4 min",
    icon: <AddAPhotoRoundedIcon />,
    image: "/splash/product/hero-field-audit.jpg",
    imageAlt:
      "A field representative viewing the Displaygram mobile feed beside a retail beverage display.",
    imageFit: "cover",
    caption:
      "Displaygram is designed for the moment the display is finished and ready to document.",
    steps: [
      {
        title: "Start from Create",
        body: "Use the Create button on desktop or the blue camera action on mobile. Both open the same guided post flow.",
      },
      {
        title: "Take or select a clear photo",
        body: "Frame the full display when possible. AI brand detection can suggest brands while you continue.",
        note: "AI suggestions are editable. Confirm them before submitting.",
      },
      {
        title: "Choose the correct account",
        body: "Search by store name or account number. Location helps narrow the list, but the company account is the official record.",
      },
      {
        title: "Confirm display details",
        body: "Review brands and product types, then enter quantity. Matching company and Gallo goals appear for eligible accounts.",
      },
      {
        title: "Review and submit",
        body: "Add an optional description, verify the account, products, quantity, and goal, then keep the page open until upload completes.",
      },
    ],
    action: { label: "Create a display", route: "/create-post" },
  },
  {
    id: "activity-feed",
    track: "start",
    audience: ["everyone"],
    eyebrow: "Home",
    title: "Read the activity feed",
    summary:
      "Use the feed as a live picture of what your team and connected partners are building.",
    duration: "2 min",
    icon: <HomeOutlinedIcon />,
    image: "/splash/product/mobileFeed.PNG",
    imageAlt:
      "Displaygram mobile activity feed showing a filtered retail display post.",
    imageFit: "contain",
    caption:
      "The mobile feed keeps the active-filter state compact so the display remains the focus.",
    steps: [
      {
        title: "Choose Company or Shared",
        body: "Company contains your organization's work. Shared contains displays made available through approved company connections.",
      },
      {
        title: "Read the context",
        body: "Each card connects the image to the account, account number, representative, products, quantity, tags, and matching goal.",
      },
      {
        title: "Open the image",
        body: "Select the display image for a larger view, then close it to return to the same place in the feed.",
      },
      {
        title: "Respond and organize",
        body: "Like, comment, share, or add useful displays to a collection without losing the surrounding post context.",
      },
    ],
    action: { label: "Open the feed", route: "/user-home-page" },
  },
  {
    id: "filters",
    track: "everyday",
    audience: ["everyone"],
    eyebrow: "Find the work",
    title: "Filter with confidence",
    summary:
      "Narrow a large feed by date, product, account, teammate, goal, or tag and keep the active state visible.",
    duration: "2 min",
    icon: <FilterAltOutlinedIcon />,
    image: "/splash/product/desktopFeed.PNG",
    imageAlt:
      "Desktop Displaygram feed with the filter sidebar open and an account type selected.",
    imageFit: "contain",
    caption:
      "Desktop keeps results beside the filters; mobile opens the same controls in a focused sheet.",
    steps: [
      {
        title: "Open Filters",
        body: "Desktop users work in the right sidebar. Mobile users tap Adjust filters and return with Show results.",
      },
      {
        title: "Build a focused question",
        body: "Combine date, product, account, user, company goal, Gallo goal, and tag filters for a precise result set.",
      },
      {
        title: "Read the active state",
        body: "Selected values appear as chips with the matching display count. Selections update the feed automatically.",
      },
      {
        title: "Clear cleanly",
        body: "Remove one chip to broaden the result or use Clear all to return to the full chronological feed.",
      },
    ],
    action: { label: "Try feed filters", route: "/user-home-page" },
  },
  {
    id: "my-goals",
    track: "everyday",
    audience: ["everyone"],
    eyebrow: "Assigned work",
    title: "Understand goals and account progress",
    summary:
      "Know what a goal requires, which accounts remain open, and where to report an account-level blocker.",
    duration: "3 min",
    icon: <TrackChangesOutlinedIcon />,
    steps: [
      {
        title: "Start with active goals",
        body: "My Goals shows work assigned to you. Archived goals preserve completed and expired history outside the active list.",
      },
      {
        title: "Read the requirement",
        body: "Check the date window, accounts, quantity measure, brands, and submissions required per user.",
      },
      {
        title: "Post against the account",
        body: "Select an assigned account during capture. Displaygram offers goals valid for that account and user.",
      },
      {
        title: "Report a real blocker",
        body: "Use Report issue when the account cannot complete the goal or request help when guidance is needed. Include actionable context.",
      },
    ],
    action: { label: "Open My Goals", dashboardMode: "MyGoalsMode" },
  },
  {
    id: "collections-sharing",
    track: "everyday",
    audience: ["everyone"],
    eyebrow: "Reuse the proof",
    title: "Collect and share strong displays",
    summary:
      "Save examples, organize a program story, and export a presentation-ready display card.",
    duration: "2 min",
    icon: <CollectionsBookmarkOutlinedIcon />,
    image: "/splash/product/export-display-card.jpg",
    imageAlt:
      "An exported Displaygram card with a display photo, units, tracked brands, and a public link.",
    imageFit: "contain",
    caption:
      "Export cards preserve the image and essential reporting context in one shareable artifact.",
    steps: [
      {
        title: "Create a focused collection",
        body: "Use collections for a program, brand, account group, market visit, or any displays the team will revisit.",
      },
      {
        title: "Add displays",
        body: "Add a post from its actions while keeping every display connected to its source details.",
      },
      {
        title: "Review without losing your place",
        body: "Open a display, then use Back to collections or click outside the post to return.",
      },
      {
        title: "Share the right format",
        body: "Export a card for image plus context, or share the display link when recipients should open the full post.",
      },
    ],
    action: { label: "Open Collections", dashboardMode: "CollectionsMode" },
  },
  {
    id: "team-feedback",
    track: "management",
    audience: ["supervisor", "admin"],
    eyebrow: "Resolve blockers",
    title: "Move feedback through the team",
    summary:
      "Understand who owns the next decision and keep account issues from disappearing between roles.",
    duration: "3 min",
    icon: <GroupsOutlinedIcon />,
    steps: [
      {
        title: "Needs review",
        body: "A representative submitted an unresolved issue or help request. Administrators can review the company queue.",
      },
      {
        title: "With supervisors",
        body: "An administrator requested follow-up. The report leaves Needs review while the assigned supervisor owns the conversation.",
      },
      {
        title: "Returned",
        body: "The supervisor supplied evidence and returned the report for a new admin decision.",
      },
      {
        title: "Resolved",
        body: "A final decision closed the report. Resolved history remains searchable.",
        note: "Super-admins oversee the full queue; normal workflow ownership stays with the goal creator and assigned supervisor.",
      },
    ],
    action: {
      label: "Open Team Feedback",
      dashboardMode: "SupervisorFeedbackMode",
    },
  },
  {
    id: "manage-goals",
    track: "management",
    audience: ["admin", "supplier"],
    eyebrow: "Plan the work",
    title: "Create and monitor goals",
    summary:
      "Build a measurable company goal and distinguish company-created work from integrated Gallo Axis programs.",
    duration: "5 min",
    icon: <AdminPanelSettingsOutlinedIcon />,
    image: "/splash/product/desktopGoals.PNG",
    imageAlt:
      "Goals Manager showing goal cards, progress, submissions, and feedback actions.",
    imageFit: "contain",
    caption:
      "Managers compare progress, submissions, account coverage, and feedback from the same goal card.",
    steps: [
      {
        title: "Choose the correct source",
        body: "Company Goals are owned inside Displaygram. Gallo Axis goals arrive through the integration without changing inbound automation.",
      },
      {
        title: "Define one decision at a time",
        body: "The wizard moves through audience, measure, products, accounts, dates, and review.",
      },
      {
        title: "Read the natural-language summary",
        body: "Verify what employees must build, where, how many times, and by when before creating the goal.",
      },
      {
        title: "Monitor and respond",
        body: "Use progress, Show submissions, and Feedback to understand completion and blockers. Archive completed work instead of erasing history.",
      },
    ],
    action: { label: "Open Goals Manager", dashboardMode: "GoalManagerMode" },
  },
];

const TutorialViewer = () => {
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const isSupplier = useSelector(selectIsSupplier);
  const role = user?.role;
  const isAdmin =
    role === "admin" || role === "super-admin" || role === "developer";
  const isSupervisor = role === "supervisor" || isAdmin;
  const visibleModules = useMemo(
    () =>
      MODULES.filter((module) =>
        module.audience.some((audience) => {
          if (audience === "everyone") return true;
          if (audience === "supplier") return isSupplier;
          if (audience === "admin") return isAdmin || isSupplier;
          return audience === "supervisor" && isSupervisor && !isSupplier;
        }),
      ),
    [isAdmin, isSupervisor, isSupplier],
  );
  const visibleTracks = useMemo(
    () =>
      TRACKS.filter((track) =>
        visibleModules.some((module) => module.track === track.id),
      ),
    [visibleModules],
  );
  const [activeTrack, setActiveTrack] = useState<Track>("start");
  const [activeModuleId, setActiveModuleId] = useState("first-display");
  const progressKey = `displaygram:tutorial-progress:v2:${user?.uid ?? "guest"}`;
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [loadedProgressKey, setLoadedProgressKey] = useState<string | null>(
    null,
  );

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(progressKey);
      setCompletedIds(stored ? JSON.parse(stored) : []);
    } catch {
      setCompletedIds([]);
    }
    setLoadedProgressKey(progressKey);
  }, [progressKey]);
  useEffect(() => {
    if (loadedProgressKey !== progressKey) return;
    try {
      window.localStorage.setItem(progressKey, JSON.stringify(completedIds));
    } catch {
      // Completion tracking is optional; the guides remain usable without storage.
    }
  }, [completedIds, loadedProgressKey, progressKey]);

  const trackModules = useMemo(
    () => visibleModules.filter((module) => module.track === activeTrack),
    [activeTrack, visibleModules],
  );
  useEffect(() => {
    if (!trackModules.length && visibleTracks.length) {
      setActiveTrack(visibleTracks[0].id);
      return;
    }
    if (!trackModules.some((module) => module.id === activeModuleId))
      setActiveModuleId(trackModules[0]?.id ?? "");
  }, [activeModuleId, trackModules, visibleTracks]);

  const activeModule =
    trackModules.find((module) => module.id === activeModuleId) ??
    trackModules[0];
  const completedVisible = visibleModules.filter((module) =>
    completedIds.includes(module.id),
  ).length;
  const progress = visibleModules.length
    ? Math.round((completedVisible / visibleModules.length) * 100)
    : 0;
  const toggleComplete = (id: string) =>
    setCompletedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  const openAction = (action?: Action) => {
    if (!action) return;
    if (action.dashboardMode) {
      window.sessionStorage.setItem("dashboardMode", action.dashboardMode);
      window.location.assign("/dashboard");
      return;
    }
    if (action.route) navigate(action.route);
  };

  return (
    <>
      <TutorialPageHelmet />
      <main className="tutorial-hub">
        <section className="tutorial-hero">
          <div className="tutorial-hero__copy">
            <span className="tutorial-kicker">Displaygram learning center</span>
            <h1>Learn the work by doing the work.</h1>
            <p>
              Short, role-aware guides show where to start, what each state
              means, and what should happen next.
            </p>
            <div
              className="tutorial-progress"
              aria-label={`${progress}% complete`}
            >
              <div className="tutorial-progress__meta">
                <span>
                  {completedVisible} of {visibleModules.length} guides complete
                </span>
                <strong>{progress}%</strong>
              </div>
              <div className="tutorial-progress__track" aria-hidden="true">
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
          <div className="tutorial-hero__image" aria-hidden="true">
            <img src="/splash/product/hero-field-audit.jpg" alt="" />
            <span>Built for the field</span>
          </div>
        </section>

        <nav className="tutorial-tracks" aria-label="Tutorial tracks">
          {visibleTracks.map((track) => {
            const count = visibleModules.filter(
              (module) => module.track === track.id,
            ).length;
            return (
              <button
                type="button"
                key={track.id}
                className={activeTrack === track.id ? "is-active" : ""}
                aria-pressed={activeTrack === track.id}
                onClick={() => setActiveTrack(track.id)}
              >
                <span>{track.label}</span>
                <small>{track.description}</small>
                <strong>
                  {count} guide{count === 1 ? "" : "s"}
                </strong>
              </button>
            );
          })}
        </nav>

        {activeModule && (
          <section className="tutorial-workspace">
            <aside
              className="tutorial-module-list"
              aria-label="Guides in this track"
            >
              {trackModules.map((module, index) => (
                <button
                  type="button"
                  key={module.id}
                  className={activeModule.id === module.id ? "is-active" : ""}
                  aria-current={
                    activeModule.id === module.id ? "step" : undefined
                  }
                  onClick={() => setActiveModuleId(module.id)}
                >
                  <span className="tutorial-module-list__number">
                    {completedIds.includes(module.id) ? (
                      <CheckCircleRoundedIcon />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span>
                    <strong>{module.title}</strong>
                    <small>
                      <ScheduleRoundedIcon /> {module.duration}
                    </small>
                  </span>
                </button>
              ))}
            </aside>

            <article className="tutorial-guide">
              <header className="tutorial-guide__header">
                <span className="tutorial-guide__icon" aria-hidden="true">
                  {activeModule.icon}
                </span>
                <div>
                  <span className="tutorial-kicker">
                    {activeModule.eyebrow}
                  </span>
                  <h2>{activeModule.title}</h2>
                  <p>{activeModule.summary}</p>
                </div>
              </header>
              {activeModule.image && (
                <figure
                  className={`tutorial-media is-${activeModule.imageFit ?? "cover"}`}
                >
                  <img
                    src={activeModule.image}
                    alt={activeModule.imageAlt ?? ""}
                  />
                  {activeModule.caption && (
                    <figcaption>{activeModule.caption}</figcaption>
                  )}
                </figure>
              )}
              <ol className="tutorial-steps">
                {activeModule.steps.map((step, index) => (
                  <li key={step.title}>
                    <span className="tutorial-step__number">{index + 1}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.body}</p>
                      {step.note && <aside>{step.note}</aside>}
                    </div>
                  </li>
                ))}
              </ol>
              <footer className="tutorial-guide__actions">
                <button
                  type="button"
                  className={`tutorial-complete ${completedIds.includes(activeModule.id) ? "is-complete" : ""}`}
                  onClick={() => toggleComplete(activeModule.id)}
                >
                  <CheckCircleRoundedIcon />
                  {completedIds.includes(activeModule.id)
                    ? "Completed"
                    : "Mark complete"}
                </button>
                {activeModule.action && (
                  <button
                    type="button"
                    className="tutorial-open-action"
                    onClick={() => openAction(activeModule.action)}
                  >
                    {activeModule.action.label}
                    <ArrowForwardRoundedIcon />
                  </button>
                )}
              </footer>
            </article>
          </section>
        )}
      </main>
    </>
  );
};

export default TutorialViewer;
