import {
  START_UPDATE_POST,
  UPDATE_POST_OPTIMISTICALLY,
  UPDATE_POST_SUCCESS,
  UPDATE_POST_FAILURE,
} from "./actionTypes";

export const updatePostOptimistically = (post) => ({
  type: UPDATE_POST_OPTIMISTICALLY,
  payload: post,
});

export const startUpdatePost = () => ({
  type: START_UPDATE_POST,
});

export const updatePostSuccess = (post) => ({
  type: UPDATE_POST_SUCCESS,
  payload: post,
});

export const updatePostFailure = (error) => ({
  type: UPDATE_POST_FAILURE,
  payload: error,
});

export const updatePost = (post) => async (dispatch, getState) => {
  dispatch(updatePostOptimistically(post));
  dispatch(startUpdatePost());

  try {
    // Mock API call to update the database
    await fakeApiUpdatePost(post);
    // const handleSavePost = async (updatedPost: PostType) => {
    //   const postRef = doc(collection(db, "posts"), updatedPost.id);
    //   try {
    //     const { id, ...restOfUpdatedPost } = updatedPost; // id is assigned but value never used
    //     await updateDoc(postRef, restOfUpdatedPost);
    //     dispatch(updatePost(updatedPost));
    //     console.log("Post updated successfully");
    //     handleCloseEditModal();
    //   } catch (error) {
    //     console.error("Error updating post: ", error);
    //   }
    // };

    dispatch(updatePostSuccess(post));
  } catch (error) {
    dispatch(updatePostFailure(error));
    // Revert changes in the store if necessary.
  }
};
