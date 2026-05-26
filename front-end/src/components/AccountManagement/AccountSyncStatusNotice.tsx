import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../utils/firebase";
import "./styles/accountSyncStatusNotice.css";

type SyncStatus = "loading" | "not-configured" | "enabled" | "disabled";

interface Props {
  companyId: string | undefined;
}

export default function AccountSyncStatusNotice({ companyId }: Props) {
  const [status, setStatus] = useState<SyncStatus>("loading");
  const [provider, setProvider] = useState<string>("");

  useEffect(() => {
    if (!companyId) return;

    const load = async () => {
      try {
        const q = query(
          collection(db, "accountSyncConfigs"),
          where("companyId", "==", companyId),
        );

        const snap = await getDocs(q);

        if (snap.empty) {
          setStatus("not-configured");
          return;
        }

        const data = snap.docs[0].data();
        setProvider(data.provider || "account sync");
        setStatus(data.enabled ? "enabled" : "disabled");
      } catch (err) {
        console.warn("Failed to load account sync status:", err);
        setStatus("not-configured");
      }
    };

    load();
  }, [companyId]);

  if (status === "loading") return null;

  if (status === "enabled") {
    return (
      <section className="account-sync-notice success">
        <strong>Automated account sync is enabled.</strong>
        <span>
          Displaygram will detect account changes from {provider} and create
          reviewable imports when changes are found.
        </span>
      </section>
    );
  }

  if (status === "disabled") {
    return (
      <section className="account-sync-notice warning">
        <strong>Automated account sync is configured but currently disabled.</strong>
        <span>Contact Displaygram support if you want this turned back on.</span>
      </section>
    );
  }

  return (
    <section className="account-sync-notice info">
      <strong>Want automated account updates?</strong>
      <span>
        Displaygram can sync account changes from supported systems like
        Encompass. Contact support to get account sync configured.
      </span>
    </section>
  );
}