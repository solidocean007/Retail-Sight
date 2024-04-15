import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { unwrapResult } from '@reduxjs/toolkit';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { fetchPostsByIds } from '../thunks/postsThunks';
import { useAppDispatch } from '../utils/store';
import { PostWithID } from '../utils/types';
import './viewSharedPost.css'
import HeaderBar from './HeaderBar';

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

  let formattedDate = "N/A"; // default value
  if (post?.displayDate) {
    const jsDate = new Date(post.displayDate); // Creating a Date object from ISO string
    formattedDate = jsDate.toLocaleDateString();
  }

  const noFilter = () => {
    return
  }

  return (
    <div >
      <HeaderBar toggleFilterMenu={noFilter} />
      <div className="list-card">
      {post ? (
        <div className='post-card dynamic-height'>
          <div className='card-content'>
            <div className="post-header">
              <h1>Check out this post from Displaygram.com</h1>
            </div>
            <div className="header-bottom">
              <div className="details-date">
                <div className="store-details">
                  <div className="store-name-number">
                    <h3>
                      {post.selectedStore}
                      <span> {post.storeNumber}</span>
                    </h3>
                  </div>
                  <div className="store-address-box">
                    <h5>{post.storeAddress}</h5>
                  </div>
                </div>
                <h5>date: {formattedDate}</h5>
              </div>

              <div className="post-user-details">
                {/* <div onClick={handleOnUserNameClick}> */}
                <div className="post-user-name">
                  <p>by:</p>
                  <h4>
                    {post.postUserName}
                  </h4>
                </div>
                <div className="user-company-box">
                  <p>company: </p>
                  <a href="#" onClick={(e) => e.preventDefault()}>
                    {/* create a onCompanyNameClick */}
                    {post.postUserCompany}
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div>{post.description}</div>

          <img src={post.imageUrl} alt="Shared post" />
        </div>
      ) : (
        <p>Post not found or access denied.</p>
      )}
      </div>
      
    </div>
  );
};

export default ViewSharedPost;






