// CollectionForm.tsx
import React, { useState } from 'react';
import { CollectionType, CollectionWithId } from '../utils/types';
import { useSelector } from 'react-redux';
import { selectUser } from '../Slices/userSlice';

interface CollectionFormProps {
  onAddCollection: (newCollection: CollectionType) => Promise<void>
}

const CollectionForm: React.FC<CollectionFormProps> = ({ onAddCollection }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const user = useSelector(selectUser);
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Ensure ownerId is defined. Consider handling the case where user is not available more gracefully.
    if (user && user.uid) {
      onAddCollection({
        name,
        description,
        ownerId: user.uid, // Directly using user.uid here after ensuring it's defined
        posts: [],
        sharedWith: [],
        isShareableOutsideCompany: true
      });
      setName('');
      setDescription('');
    } else {
      console.error("User not defined.");
      // Handle the error case when user is not defined
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Collection Name"
        required
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
      />
      <button type="submit">Add Collection</button>
    </form>
  );
};

export default CollectionForm;
