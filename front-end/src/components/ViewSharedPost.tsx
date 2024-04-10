import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom'; // Assuming you're using React Router for routing
import { getFunctions, httpsCallable } from 'firebase/functions';
import MemoizedPostCard from './PostCard';

interface ValidateTokenResponse {
  valid: boolean;
  // Include other properties if your function returns more information
}

export const ViewSharedPost = () => {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const location = useLocation();

  // Function to parse query parameters
  const query = new URLSearchParams(location.search);
  const postId = query.get('postId');
  const token = query.get('token');

  // In the ViewSharedPost component

useEffect(() => {
  const loadAndValidatePost = async () => {
    const postId = new URLSearchParams(window.location.search).get('id');
    
    if (postId) {
      try {
        const postData = await fetchPostData(postId); // Fetch post data from Firestore
        const isValid = await validateShareToken(postData.token.sharedToken, postId); // Validate token

        if (isValid) {
          setPost(postData); // Set post data to state if valid
        } else {
          console.error("Invalid or expired token.");
          // Redirect to error page or show error message
        }
      } catch (error) {
        console.error("Error fetching or validating the post:", error);
        // Handle error, e.g., show a message to the user
      }
    }
  };

  loadAndValidatePost();
}, []);


  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      {post ? (
        <MemoizedPostCard post={post} />
      ) : (
        <p>Loading post...</p> // Or any other placeholder
      )}
    </div>
  );
};

export default ViewSharedPost;

// Mock function to simulate fetching a post by ID
// Replace this with your actual method to fetch post data
async function fetchPostById(postId) {
  // Implement the fetch logic here, e.g., querying Firestore
  return {
    title: 'Sample Post Title',
    content: 'This is the content of the post.',
    // Add other post fields as necessary
  };
}
