import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { unwrapResult } from '@reduxjs/toolkit';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { fetchPostsByIds } from '../thunks/postsThunks';
import { useAppDispatch } from '../utils/store';
import { PostWithID } from '../utils/types';

interface ValidateTokenResponse {
  valid: boolean;
}

export const ViewSharedPost = () => {
  const dispatch = useAppDispatch();
  const functions = getFunctions();
  const validateTheLink = httpsCallable(functions, 'validatePostShareToken');

  const [post, setPost] = useState<PostWithID | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const postId = query.get('id');
  const token = query.get('token');

 
  useEffect(() => {
    const loadAndValidatePost = async () => {

      if (postId && token) {
        console.log("Fetching post with ID:", postId, "and token:", token);
        try {
          const { data: isValid } = await validateTheLink({ token, postId }) as { data: ValidateTokenResponse };
          if (isValid.valid) {
            const resultAction = await dispatch(fetchPostsByIds({ postIds: postId }));
            const posts = unwrapResult(resultAction);  
            if (posts.length > 0) {
              setPost(posts[0]);
            } else {
              setError('Post not found.');
            }
            setLoading(false);
          } else {
            throw new Error("Invalid or expired token.");
          }
        } catch (error) {
          console.error("Error fetching or validating the post:", error);
          setError('Failed to load the post. Please check your link or try again later.');
          setLoading(false);
        }
      }
    };

    loadAndValidatePost();
  }, [postId, token, dispatch, validateTheLink]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      {post ? (
        <div>
          <img src={post.imageUrl} alt="Shared post" />
          <div>{post.description}</div>
        </div>
      ) : (
        <p>Post not found or access denied.</p>
      )}
    </div>
  );
};

export default ViewSharedPost;






