import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CollectionType {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  posts: string[]; // Array of post IDs
}

interface CollectionsState {
  [id: string]: CollectionType;
}

const initialState: CollectionsState = {};

const collectionsSlice = createSlice({
  name: 'collections',
  initialState,
  reducers: {
    addCollection: (state, action: PayloadAction<CollectionType>) => {
      const collection = action.payload;
      state[collection.id] = collection;
    },
    addPostToCollection: (state, action: PayloadAction<{ collectionId: string; postId: string }>) => {
      const { collectionId, postId } = action.payload;
      const collection = state[collectionId];
      if (collection && !collection.posts.includes(postId)) {
        collection.posts.push(postId);
      }
    },
    removePostFromCollection: (state, action: PayloadAction<{ collectionId: string; postId: string }>) => {
      const { collectionId, postId } = action.payload;
      const collection = state[collectionId];
      if (collection) {
        const index = collection.posts.indexOf(postId);
        if (index > -1) {
          collection.posts.splice(index, 1);
        }
      }
    },
  },
});

export const { addCollection, addPostToCollection, removePostFromCollection } = collectionsSlice.actions;
export default collectionsSlice.reducer;

