import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import { DialogActions } from '@mui/material';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import './checkBoxModal.css'

// Assuming these types are exported from the 'options' file.
import { ChannelOptions, CategoryOptions } from '../utils/filterOptions';

// type Option = {
//   id: string;
//   name: string;
// };

interface CheckboxModalProps {
  open: boolean;
  handleClose: () => void;
  applyFilters: (selectedChannels: string[], selectedCategories: string[]) => void;
}

const CheckBoxModal: React.FC<CheckboxModalProps> = ({ open, handleClose, applyFilters }) => {
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channel) ? prev.filter((ch) => ch !== channel) : [...prev, channel]
    );
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((ct) => ct !== category) : [...prev, category]
    );
  };

  const handleApply = () => {
    applyFilters(selectedChannels, selectedCategories);
    handleClose();
  };

  const handleClear = () => {
    setSelectedChannels([]);
    setSelectedCategories([]);
    applyFilters([], []);
  };

  const handleCloseModal = () => {
    handleClose();
  };

  return (
    <Dialog onClose={handleCloseModal} open={open} className="modal-container">
      <DialogTitle className="dialog-title">Select Channels and Categories</DialogTitle>
      <div className="checkbox-container">
        <div className="checkbox-column">
          <h3>Channels</h3>
          {/* Assuming ChannelOptions is an array of { id, name } objects */}
          {ChannelOptions.map((channel) => (
            <FormControlLabel
              key={channel.id}
              control={
                <Checkbox
                  checked={selectedChannels.includes(channel.id)}
                  onChange={() => toggleChannel(channel.id)}
                />
              }
              label={channel.name}
            />
          ))}
        </div>
        <div className="checkbox-column">
          <h3>Categories</h3>
          {/* Assuming CategoryOptions is an array of { id, name } objects */}
          {CategoryOptions.map((category) => (
            <FormControlLabel
              key={category.id}
              control={
                <Checkbox
                  checked={selectedCategories.includes(category.id)}
                  onChange={() => toggleCategory(category.id)}
                />
              }
              label={category.name}
            />
          ))}
        </div>
      </div>
      <DialogActions className="dialog-actions">
        <Button onClick={handleCloseModal}>Close</Button>
        <Button onClick={handleClear}>Clear All</Button>
        <Button onClick={handleApply}>Apply Filters</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CheckBoxModal;
