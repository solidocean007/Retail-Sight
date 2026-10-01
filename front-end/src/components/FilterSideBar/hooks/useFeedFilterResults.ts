import { useCallback, useRef, useState } from "react";

import {
  setFilteredPostFetchedAt,
  setFilteredPosts,
} from "../../../Slices/postsSlice";
import {
  setFilteredSharedPostFetchedAt,
  setFilteredSharedPosts,
} from "../../../Slices/sharedPostsSlice";
import { showMessage } from "../../../Slices/snackbarSlice";
import { fetchFilteredPostsBatch } from "../../../thunks/postsThunks";
import { fetchFilteredSharedPostsBatch } from "../../../thunks/sharedPostsThunks";
import {
  getFetchDate,
  getFilteredSet,
  shouldRefetch,
  storeFilteredSet,
} from "../../../utils/database/indexedDBUtils";
import { normalizePost } from "../../../utils/normalize";
import { useAppDispatch } from "../../../utils/store";
import { PostQueryFilters } from "../../../utils/types";

type FeedType = "company" | "shared";

type UseFeedFilterResultsOptions = {
  companyId?: string | null;
  feedType: FeedType;
  newestPostDate?: string | null;
  onApplied: (filters: PostQueryFilters) => void;
  onApplyingChange?: (feedType: FeedType, applying: boolean) => void;
};

export const useFeedFilterResults = ({
  companyId,
  feedType,
  newestPostDate,
  onApplied,
  onApplyingChange,
}: UseFeedFilterResultsOptions) => {
  const dispatch = useAppDispatch();
  const [isApplying, setIsApplying] = useState(false);
  const applyingRef = useRef(false);
  const queuedFiltersRef = useRef<PostQueryFilters | null>(null);

  const setApplying = useCallback(
    (applying: boolean) => {
      setIsApplying(applying);
      onApplyingChange?.(feedType, applying);
    },
    [feedType, onApplyingChange],
  );

  const applyFilters = useCallback(
    async (draftFilters: PostQueryFilters): Promise<boolean> => {
      if (!companyId) return false;

      const filters: PostQueryFilters = {
        ...draftFilters,
        feedType,
      };

      // Keep only the newest requested state. If a Firestore/cache request is
      // already running, the loop below processes this state next instead of
      // silently dropping a fast follow-up selection.
      queuedFiltersRef.current = filters;
      if (applyingRef.current) return true;

      applyingRef.current = true;
      setApplying(true);
      let allRequestsSucceeded = true;

      try {
        while (queuedFiltersRef.current) {
          const requestedFilters = queuedFiltersRef.current;
          queuedFiltersRef.current = null;

          try {
            const cached = await getFilteredSet(requestedFilters);
            const needsNetworkResult =
              !cached ||
              (await shouldRefetch(
                requestedFilters,
                newestPostDate ?? null,
              ));

            if (!needsNetworkResult && cached) {
              const fetchedAt = await getFetchDate(requestedFilters);

              if (feedType === "shared") {
                dispatch(setFilteredSharedPosts(cached));
                dispatch(
                  setFilteredSharedPostFetchedAt(
                    fetchedAt?.toISOString() ?? new Date().toISOString(),
                  ),
                );
              } else {
                dispatch(setFilteredPosts(cached));
                dispatch(
                  setFilteredPostFetchedAt(
                    fetchedAt?.toISOString() ?? new Date().toISOString(),
                  ),
                );
              }
            } else if (feedType === "shared") {
              const result = await dispatch(
                fetchFilteredSharedPostsBatch({
                  companyId,
                  filters: requestedFilters,
                }),
              );

              if (!fetchFilteredSharedPostsBatch.fulfilled.match(result)) {
                throw new Error("Shared display filtering failed");
              }

              const fresh = result.payload.posts.map(normalizePost);
              await storeFilteredSet(requestedFilters, fresh);
            } else {
              const result = await dispatch(
                fetchFilteredPostsBatch({
                  filters: requestedFilters,
                  companyId,
                }),
              );

              if (!fetchFilteredPostsBatch.fulfilled.match(result)) {
                throw new Error("Company display filtering failed");
              }

              const fresh = result.payload.posts.map(normalizePost);
              dispatch(setFilteredPostFetchedAt(new Date().toISOString()));
              await storeFilteredSet(requestedFilters, fresh);
            }

            // Avoid hydrating the panel with an intermediate selection when a
            // newer request arrived while this one was loading.
            if (!queuedFiltersRef.current) onApplied(requestedFilters);
          } catch (error) {
            allRequestsSucceeded = false;
            console.error("Could not apply feed filters:", error);
            dispatch(
              showMessage({
                text: "We could not apply those filters. Your current feed has not changed.",
                severity: "error",
              }),
            );
          }
        }
      } finally {
        applyingRef.current = false;
        setApplying(false);
      }

      return allRequestsSucceeded;
    },
    [
      companyId,
      dispatch,
      feedType,
      newestPostDate,
      onApplied,
      setApplying,
    ],
  );

  return { applyFilters, isApplying };
};
