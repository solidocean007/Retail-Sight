import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";

const db = admin.firestore();
const bucket = admin.storage().bucket();

type ImageEra =
  | "legacy-resized"
  | "original+200-only"
  | "original+multi-size"
  | "unknown";

export const analyzePostImages = onRequest(
  { timeoutSeconds: 540, memory: "1GiB" },
  async (_req, res) => {
    try {
      const snapshot = await db.collection("posts").get();

      const eraStats: Record<
        ImageEra,
        {
          count: number;
          earliest?: string;
          latest?: string;
          examples: string[];
        }
      > = {
        "legacy-resized": { count: 0, examples: [] },
        "original+200-only": { count: 0, examples: [] },
        "original+multi-size": { count: 0, examples: [] },
        unknown: { count: 0, examples: [] },
      };

      for (const doc of snapshot.docs) {
        const post = doc.data();
        const postId = doc.id;

        const imageUrl = post.originalImageUrl || post.imageUrl;
        if (!imageUrl) continue;

        const decodedPath = decodeURIComponent(
          imageUrl.split("/o/")[1]?.split("?")[0]
        );
        if (!decodedPath) continue;

        const folder = decodedPath.substring(
          0,
          decodedPath.lastIndexOf("/") + 1
        );

        const [files] = await bucket.getFiles({ prefix: folder });
        const names = files.map((f) => f.name.split("/").pop()!);

        const has = (n: string) => names.includes(n);

        let era: ImageEra = "unknown";

        if (has("resized.jpg")) {
          era = "legacy-resized";
        } else if (has("original_800x800.jpg")) {
          era = "original+multi-size";
        } else if (has("original.jpg") && has("original_200x200.jpg")) {
          era = "original+200-only";
        }

        const date =
          post.displayDate?.toDate?.() ?? post.createdAt?.toDate?.() ?? null;

        eraStats[era].count++;

        if (date) {
          const iso = date.toISOString();

          if (!eraStats[era].earliest || iso < eraStats[era].earliest!) {
            eraStats[era].earliest = iso;
          }
          if (!eraStats[era].latest || iso > eraStats[era].latest!) {
            eraStats[era].latest = iso;
          }
        }

        // keep a few example IDs per era
        if (eraStats[era].examples.length < 5) {
          eraStats[era].examples.push(postId);
        }
      }

      res.json({
        totalPosts: snapshot.size,
        eras: eraStats,
      });
    } catch (err: any) {
      console.error("analyzePostImages error", err);
      res.status(500).json({ error: err.message || String(err) });
    }
  }
);
