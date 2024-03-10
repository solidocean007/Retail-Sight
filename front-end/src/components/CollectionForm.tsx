// CollectionForm.tsx
import React, { useState } from 'react';
import { CollectionType } from '../utils/types';
import { useSelector } from 'react-redux';
import { selectUser } from '../Slices/userSlice';
import './collectionForm.css'

interface CollectionFormProps {
  onAddCollection: (newCollection: CollectionType) => Promise<void>
  onClose: () => void;
}

const CollectionForm: React.FC<CollectionFormProps> = ({ onAddCollection, onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const user = useSelector(selectUser);
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!name.trim()) {
      e.preventDefault();
      // Optionally show an error message to the user here
      return;
    }
    e.preventDefault();
    if (user && user.uid) {
      onAddCollection({
        name,
        description,
        ownerId: user.uid,
        posts: [],
        sharedWith: [],
        isShareableOutsideCompany: true
      });
      setName('');
      setDescription('');
      onClose();
    } else {
      console.error("User not defined.");
    }
  };

  // You may want to also call onClose when the user decides not to proceed
  const handleCancel = () => {
    onClose(); // Call the onClose prop function
  };

  return (
    <form className='collection-form' onSubmit={handleSubmit}>
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
      <button type="submit" className={!name.trim() ? 'disabled-button' : ''}>Add Collection</button>
      <button type="button" onClick={handleCancel}>Cancel</button>
    </form>
  );
};

export default CollectionForm;

