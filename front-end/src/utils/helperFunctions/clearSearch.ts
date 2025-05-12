export const clearSearch = async () => {
  setCurrentHashtag(null);
  setCurrentStarTag(null);
  setActivePostSet("posts");
  // Clear filteredPosts in Redux
  dispatch(setFilteredPosts([]));
  const cachedPosts = await getPostsFromIndexedDB();
  if (cachedPosts && cachedPosts.length > 0) {
    dispatch(mergeAndSetPosts(cachedPosts));
  }
};
