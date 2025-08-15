// onUserNameClick.ts
import { PostWithID } from "../types";
import { AppDispatch } from "../store";
import { openUserModal } from "../../Slices/userModalSlice";

export const onUserNameClick = (post: PostWithID, dispatch: AppDispatch) => {
  if (!post.postUserFirstName || !post.postUserLastName || !post.postUserEmail) return;

  const userData = {
    fullName: `${post.postUserFirstName} ${post.postUserLastName}`,
    userEmail: post.postUserEmail,
    postId: post.id,
    storeName: post.account?.accountName || "a display",
    displayDate: post.displayDate || "",
  };

  dispatch(openUserModal(userData)); 
};
