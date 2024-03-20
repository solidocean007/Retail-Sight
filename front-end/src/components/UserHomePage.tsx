// userHomePage.tsx
import React, { useEffect, useRef, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { AppBar, Toolbar } from "@mui/material";
import ActivityFeed from "./ActivityFeed";
// import { useSelector } from "react-redux";
import "./userHomePage.css";
// import { RootState } from "../utils/store";
import SideBar from "./SideBar";
import { AppDispatch, RootState } from "../utils/store";
// import { ChannelType } from "./ChannelSelector";
// import { CategoryType } from "./CategorySelector";
import { useDispatch, useSelector } from "react-redux";
import { fetchLocationOptions } from "../Slices/locationSlice";
import HeaderBar from "./HeaderBar";
// import LeftSideBar from "./LeftSideBar";
import { UserHomePageHelmet } from "../utils/helmetConfigurations";
import { PostType, PostWithID } from "../utils/types";
import { addPostsToIndexedDB, deleteUserCreatedPostInIndexedDB, getPostsFromIndexedDB, removePostFromIndexedDB, updatePostInIndexedDB } from "../utils/database/indexedDBUtils";
import { deletePost, mergeAndSetPosts } from "../Slices/postsSlice";
import { fetchInitialPostsBatch } from "../thunks/postsThunks";
import { DocumentChange, QuerySnapshot, collection, getDocs, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../utils/firebase";
import { VariableSizeList } from "react-window";
import useScrollToTopOnChange from "../hooks/scrollToTopOnChjange";
// import CheckBoxModal from "./CheckBoxModal";

export const UserHomePage = () => {
  const listRef = useRef<VariableSizeList>(null);
  const dispatch = useDispatch<AppDispatch>();
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const currentUserCompanyId = currentUser?.companyId;
  const [currentHashtag, setCurrentHashtag] = React.useState<string | null>(
    null
  );
 
  const [activePostSet, setActivePostSet] = useState("posts"); // 'posts', 'filtered', 'hashtag', 'starTag'
  const POSTS_BATCH_SIZE = 5;
  const posts = useSelector((state: RootState) => state.posts.posts); // this is the current redux store of posts
  const filteredPosts = useSelector(
    (state: RootState) => state.posts.filteredPosts
  );

  const hashtagPosts = useSelector(
    (state: RootState) => state.posts.hashtagPosts
  );

  const starTagPosts = useSelector(
    (state: RootState) => state.posts.starTagPosts
  );

  useScrollToTopOnChange(listRef, activePostSet);

 // Decide which posts to display based on the activePostSet state
let displayPosts: PostWithID[];
switch (activePostSet) {
  case "filtered":
    displayPosts = filteredPosts;
    break;
  case "hashtag":
    displayPosts = hashtagPosts;
    break;
  case "starTag": 
    displayPosts = starTagPosts;
    break;
  default:
    displayPosts = posts; // Fallback to the default posts if none of the above conditions are met
}


  const toggleFilterMenu = () => {
    setIsFilterMenuOpen(!isFilterMenuOpen);
  };

  const clearSearch = async () => {
    setCurrentHashtag(null);
    setActivePostSet("posts");
    // Reload posts from IndexedDB
    const cachedPosts = await getPostsFromIndexedDB();
    if (cachedPosts && cachedPosts.length > 0) {
      dispatch(mergeAndSetPosts(cachedPosts));
    }
  };

    // load indexDB posts or fetch from firestore
    useEffect(() => {
      const fetchPostsForLoggedInUser = async (currentUserCompanyId: string) => {
        try {
          const indexedDBPosts = await getPostsFromIndexedDB();
          if (indexedDBPosts.length > 0) {
            dispatch(mergeAndSetPosts(indexedDBPosts)); // Update Redux store with posts from IndexedDB
          } else {
            const action = await dispatch(
              fetchInitialPostsBatch({ POSTS_BATCH_SIZE, currentUserCompanyId })
            );
            if (fetchInitialPostsBatch.fulfilled.match(action)) {
              const fetchedPosts = action.payload.posts;
              dispatch(mergeAndSetPosts(fetchedPosts));
              addPostsToIndexedDB(fetchedPosts); // Add fetched posts to IndexedDB
            }
          }
        } catch (error) {
          console.error("Error fetching posts from IndexedDB:", error);
        }
      };
  
      const fetchPublicPosts = async () => {
        try {
          const publicPostsQuery = query(
            collection(db, "posts"),
            where("visibility", "==", "public"),
            orderBy("displayDate", "desc"),
            limit(4)
          );
          const querySnapshot = await getDocs(publicPostsQuery);
          const publicPosts = querySnapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() } as PostWithID))
            .filter((post) => post.visibility === "public");
          dispatch(mergeAndSetPosts(publicPosts));
        } catch (error) {
          console.error("Error fetching public posts:", error);
        }
      };
  
      if (currentUser === null) {
        fetchPublicPosts();
      } else if (currentUserCompanyId) {
        fetchPostsForLoggedInUser(currentUserCompanyId);
      }
    }, [currentUser, dispatch, currentUserCompanyId]);
  
    // setup listener
    useEffect(() => {
      // Function to process document changes
      const processDocChanges = (snapshot: QuerySnapshot) => {
        const changes = snapshot.docChanges();
        changes.forEach((change: DocumentChange) => {
          const postData = {
            id: change.doc.id,
            ...(change.doc.data() as PostType),
          };
          if (change.type === "added" || change.type === "modified") {
            dispatch(mergeAndSetPosts([postData]));
            updatePostInIndexedDB(postData);
          } else if (change.type === "removed") {
            dispatch(deletePost(change.doc.id));
            removePostFromIndexedDB(change.doc.id);
            deleteUserCreatedPostInIndexedDB(change.doc.id);
          }
        });
      };
  
      // Subscribe to public posts
      const publicPostsQuery = query(
        collection(db, "posts"),
        where("visibility", "==", "public"),
        orderBy("timestamp", "desc"),
        // where("timestamp", ">", mountTime)
      );
      const unsubscribePublic = onSnapshot(publicPostsQuery, processDocChanges);
  
      let unsubscribeCompany = () => {};
  
      // If the user's company ID is available, set up an additional listener
      if (currentUser?.companyId) {
        const companyPostsQuery = query(
          collection(db, "posts"),
          where("postUserCompanyId", "==", currentUser.companyId),
          orderBy("timestamp", "desc"),
          // where("timestamp", ">", mountTime)
        );
        unsubscribeCompany = onSnapshot(companyPostsQuery, processDocChanges);
      } else {
        console.log(
          "No companyId available, skipping setup for company posts listener"
        ); // even though i'm logged in, this line logs.  this could be a clue to the problem.
      }
  
      // Cleanup function to unsubscribe from both listeners
      return () => {
        unsubscribePublic();
        unsubscribeCompany();
      };
    }, [currentUser?.companyId]);

  useEffect(() => {
    // I need to check if location options are in indexedDb before doing this next line.
    dispatch(fetchLocationOptions());
  }, [dispatch]);

  return (
    <>
      <UserHomePageHelmet />
      <div className="user-home-page-container">
        <div className="header-bar-container">
          <HeaderBar toggleFilterMenu={toggleFilterMenu} />
        </div>
        <div className="home-page-content">
          <div className="activity-feed-container">
            <ActivityFeed
              listRef={listRef}
              posts={displayPosts}
              currentHashtag={currentHashtag}
              setCurrentHashtag={setCurrentHashtag}
              clearSearch={clearSearch}
              activePostSet={activePostSet}
              setActivePostSet={setActivePostSet}
              isSearchActive={isSearchActive}
              setIsSearchActive={setIsSearchActive}
            />
          </div>

          <div
            className={`side-bar-container ${
              isFilterMenuOpen ? "sidebar-fullscreen" : ""
            }`}
          >
            <SideBar
              // setSearchResults={setSearchResults}
              currentHashtag={currentHashtag}
              setCurrentHashtag={setCurrentHashtag}
              clearSearch={clearSearch}
              toggleFilterMenu={toggleFilterMenu}
              setActivePostSet={setActivePostSet}
            />
          </div>
        </div>
      </div>
    </>
  );
};
