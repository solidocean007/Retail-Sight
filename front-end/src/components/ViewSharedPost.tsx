import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom'; // Assuming you're using React Router for routing
import { getFunctions, httpsCallable } from 'firebase/functions';

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

  useEffect(() => {
    if (!postId || !token) {
      setError('Missing post ID or token.');
      setLoading(false);
      return;
    }

    const validateToken = async () => {
      const functions = getFunctions();
      const validatePostShareToken = httpsCallable(functions, 'validatePostShareToken');

      try {
        const result = await validatePostShareToken({ postId, token });
        if ((result.data as ValidateTokenResponse).valid) {
          // Fetch and display the post content if the token is valid
          // Assuming you have a function or method to fetch the post by ID
          fetchPostById(postId).then(postData => {
            setPost(postData);
            setLoading(false);
          }).catch(error => {
            setError('Failed to load post.');
            setLoading(false);
          });
        } else {
          setError('This share link is no longer valid.');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error validating token:', error);
        setError('Error validating access to this post.');
        setLoading(false);
      }
    };

    validateToken();
  }, [postId, token]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
      {/* Render other post details as needed */}
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
