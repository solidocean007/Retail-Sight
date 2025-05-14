// viewsharedpost.tsx
// import { useState, useEffect, useMemo } from "react";
// import { useLocation, useNavigate } from "react-router-dom";
// import { getFunctions, httpsCallable } from "firebase/functions";
// import { useAppDispatch } from "../utils/store";
// import { PostWithID } from "../utils/types";
// import "./viewSharedPost.css";
// import HeaderBar from "./HeaderBar";
// import { CircularProgress } from "@mui/material";

// export const ViewSharedPost = () => {
//   const dispatch = useAppDispatch();
//   const navigate = useNavigate();
//   const functions = getFunctions();
//   const validateTheLink = httpsCallable(functions, "validatePostShareToken");

//   const [post, setPost] = useState<PostWithID | null>(null);

//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   const location = useLocation();
//   const query = useMemo(
//     () => new URLSearchParams(location.search),
//     [location.search],
//   );
//   const postId = query.get("id");
//   const token = query.get("token");

//   useEffect(() => {
//     if (!postId || !token) {
//       console.error("Post ID or token is missing from the query parameters.");
//       setError("Invalid link.");
//       setLoading(false);
//       return;
//     }

//     const loadAndValidatePost = async () => {
//       try {
//         // Call the cloud function to validate token and fetch post
//         const { data: response } = (await validateTheLink({
//           token,
//           postId,
//         })) as { data: { valid: boolean; post: PostWithID | null } };

//         if (response.valid) {
//           setPost(response.post); // Use the post directly from the cloud function response
//         } else {
//           console.error("Token is invalid or expired.");
//           throw new Error("Invalid or expired token for this post.");
//         }
//       } catch (error) {
//         console.error("Error fetching or validating the post:", error); // this is what logs
//         setError(
//           "Failed to load the post. Please check your link or try again later.",
//         );
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadAndValidatePost();
//   }, [postId, token, dispatch]); // Only runs when postId and token are available

//   if (loading) {
//     return <CircularProgress />;
//   }

//   if (error) {
//     return <div>Error: {error}</div>;
//   }

//   let formattedDate = "N/A"; // default value
//   if (post?.displayDate) {
//     const jsDate = new Date(post.displayDate); // Creating a Date object from ISO string
//     formattedDate = jsDate.toLocaleDateString();
//   }

//   const noFilter = () => {
//     return;
//   };

//   return (
//     <div className="view-shared-post-container">
//       <HeaderBar toggleFilterMenu={noFilter} />
//       <div className="list-card">
//         {post ? (
//           <div className="post-card dynamic-height">
//             <div className="card-content">
//               <div className="post-header" onClick={() => navigate("/")}>
//                 <h1>Check out this post from Displaygram.com</h1>
//               </div>
//               <div className="header-bottom">
//                 <div className="details-date">
//                   <div className="store-details">
//                     <div className="store-name-number">
//                       <h3>{post.account?.accountName}</h3>
//                     </div>
//                     <div className="store-address-box">
//                       <h5>{post.account?.accountAddress}</h5>
//                     </div>
//                   </div>
//                   <h5>date: {formattedDate}</h5>
//                 </div>

//                 <div className="post-user-details">
//                   {/* <div onClick={handleOnUserNameClick}> */}
//                   <div className="post-user-name">
//                     <p>by:</p>
//                     <h4>
//                       `${post.createdBy.firstName} ${post.createdBy.lastName}`
//                     </h4>
//                   </div>
//                   <div className="user-company-box">
//                     <p>company: </p>
//                     <a href="#" onClick={(e) => e.preventDefault()}>
//                       {/* create a onCompanyNameClick */}
//                       {post.createdBy.company}
//                     </a>
//                   </div>
//                 </div>
//               </div>
//             </div>
//             <div>{post.description}</div>

//             <img src={post.imageUrl} alt="Shared post" />
//           </div>
//         ) : (
//           <p>Post not found or access denied.</p>
//         )}
//       </div>
//     </div>
//   );
// };

// export default ViewSharedPost;

import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAppDispatch } from "../utils/store";
import { PostWithID } from "../utils/types";
import "./viewSharedPost.css";
import HeaderBar from "./HeaderBar";
import { CircularProgress } from "@mui/material";

export const ViewSharedPost = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Target us-central1 where your functions are deployed
  const functions = getFunctions(undefined, "us-central1");
  const validateTheLink = httpsCallable(functions, "validatePostShareToken");

  const [post, setPost] = useState<PostWithID | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const location = useLocation();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const postId = query.get("id");
  const token = query.get("token");

  useEffect(() => {
    if (!postId || !token) {
      console.error("Missing postId or token in URL.");
      setError("Invalid link parameters.");
      setLoading(false);
      return;
    }

    const loadAndValidatePost = async () => {
      try {
        console.log("Calling validatePostShareToken with:", { postId, token });

        const { data: response } = (await validateTheLink({ postId, token })) as {
          data: { valid: boolean; post: PostWithID | null };
        };

        console.log("Response from validatePostShareToken:", response);

        if (response.valid && response.post) {
          setPost(response.post);
        } else {
          console.error("Token validation failed or post not found.");
          setError("Invalid or expired token for this post.");
        }
      } catch (err: any) {
        console.error("Error during validation:", err);
        const message = err?.message || "An unexpected error occurred.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadAndValidatePost();
  }, [postId, token, dispatch]);

  if (loading) {
    return (
      <div className="view-shared-post-container">
        <CircularProgress />
      </div>
    );
  }

  if (error) {
    return (
      <div className="view-shared-post-container">
        <HeaderBar toggleFilterMenu={() => {}} />
        <div className="error-message">{error}</div>
      </div>
    );
  }

  const formattedDate = post?.displayDate
    ? new Date(post.displayDate).toLocaleDateString()
    : "N/A";

  return (
    <div className="view-shared-post-container">
      <HeaderBar toggleFilterMenu={() => {}} />
      <div className="list-card">
        <div className="post-card dynamic-height">
          <div className="card-content">
            <div className="post-header" onClick={() => navigate("/")}>
              <h1>Check out this post from Displaygram.com</h1>
            </div>
            <div className="header-bottom">
              <div className="details-date">
                <div className="store-details">
                  <div className="store-name-number">
                    <h3>{post?.account?.accountName}</h3>
                  </div>
                  <div className="store-address-box">
                    <h5>{post?.account?.accountAddress}</h5>
                  </div>
                </div>
                <h5>date: {formattedDate}</h5>
              </div>

              <div className="post-user-details">
                <div className="post-user-name">
                  <p>by:</p>
                  <h4>
                    {`${post?.createdBy.firstName} ${post?.createdBy.lastName}`}
                  </h4>
                </div>
                <div className="user-company-box">
                  <p>company: </p>
                  <a href="#" onClick={(e) => e.preventDefault()}>
                    {post?.createdBy.company}
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div>{post?.description}</div>
          <img src={post?.imageUrl} alt="Shared post" />
        </div>
      </div>
    </div>
  );
};

export default ViewSharedPost;

