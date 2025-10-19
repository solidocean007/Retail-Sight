import { useEffect, useState } from "react";
import { collection, limit, getDocs, query } from "firebase/firestore";
import { db } from "../utils/firebase";
import { PostWithID } from "../utils/types";
import { normalizePost } from "../utils/normalizePost";

export const usePostsTest = () => {
  const [testPosts, setTestPosts] = useState<PostWithID[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      setError(null);

      try {
        const q = query(
          collection(db, "posts"),
          limit(10) // ✅ Fetch any 10 posts
        );

        const snap = await getDocs(q);
        const results = snap.docs.map((doc) =>
          normalizePost({ id: doc.id, ...doc.data() } as PostWithID)
        );

        console.log("[usePostsTest] Raw Firestore posts:", results);
        setTestPosts(results);
      } catch (err) {
        console.error("[usePostsTest] Firestore error:", err);
        setError("Failed to fetch posts.");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  return { testPosts, loading, error };
};
