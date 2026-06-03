import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import "./libraryView.css";
import PlaybooksPage from "../Playbooks/PlaybooksPage";
import CollectionsViewer from "../CollectionsViewer";
import { DashboardModeType } from "../../utils/types";
import { selectUser } from "../../Slices/userSlice";
import { useCompanyCollections } from "../../hooks/useCompanyCollections";

type LibraryTab = "collections" | "playbooks";

interface LibraryViewProps {
  setDashboardMode: React.Dispatch<React.SetStateAction<DashboardModeType>>;
}

const LibraryView: React.FC<LibraryViewProps> = ({ setDashboardMode }) => {
  const user = useSelector(selectUser);
  const { collections, loading, createCollection, deleteCollection } =
    useCompanyCollections(user);

  const [activeTab, setActiveTab] = useState<LibraryTab>("collections");

  const pageTitle = useMemo(() => {
    if (activeTab === "playbooks") return "Playbooks";
    return "Collections";
  }, [activeTab]);

  const normalCollections = useMemo(() => {
    return collections.filter(
      (collection) =>
        !collection.collectionType ||
        collection.collectionType === "collection",
    );
  }, [collections]);

  const playbooks = useMemo(() => {
    return collections.filter(
      (collection) => collection.collectionType === "playbook",
    );
  }, [collections]);

  return (
    <main className="library-view">
      <header className="library-header">
        <div>
          <p className="library-eyebrow">Display Library</p>
          <h1>{pageTitle}</h1>
          <p className="library-subtitle">
            Save display examples, organize them into collections, and turn your
            best work into reusable playbooks for the team.
          </p>
        </div>
      </header>

      <nav className="library-tabs" aria-label="Library sections">
        <button
          type="button"
          className={`library-tab ${
            activeTab === "collections" ? "active" : ""
          }`}
          onClick={() => setActiveTab("collections")}
        >
          Collections
        </button>

        <button
          type="button"
          className={`library-tab ${activeTab === "playbooks" ? "active" : ""}`}
          onClick={() => setActiveTab("playbooks")}
        >
          Playbooks
        </button>
      </nav>

      <section className="library-content">
        {loading && <p>Loading library...</p>}

        {!loading && activeTab === "collections" && (
          <CollectionsViewer
            setDashboardMode={setDashboardMode}
            collections={normalCollections}
            createCollection={createCollection}
            deleteCollection={deleteCollection}
            loading={loading}
          />
        )}

        {!loading && activeTab === "playbooks" && (
          <PlaybooksPage
            collections={playbooks}
            loading={loading}
            onAddPlaybook={createCollection}
          />
        )}
      </section>
    </main>
  );
};

export default LibraryView;
