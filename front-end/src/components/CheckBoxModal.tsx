import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import { DialogActions } from "@mui/material";
import DialogTitle from "@mui/material/DialogTitle";
// import FormControlLabel from '@mui/material/FormControlLabel';
// import Checkbox from '@mui/material/Checkbox';
// import FilterSection from './FilterSection';
import Button from "@mui/material/Button";
import "./checkBoxModal.css";

// Assuming these types are exported from the 'options' file.
// import { ChannelOptions, CategoryOptions } from '../utils/filterOptions';

// type Option = {
//   id: string;
//   name: string;
// };

interface CheckboxModalProps {
  open: boolean;
  handleClose: () => void;
  applyFilters: (
    selectedChannels: string[],
    selectedCategories: string[],
  ) => void;
}

const CheckBoxModal: React.FC<CheckboxModalProps> = ({
  open,
  handleClose,
  applyFilters,
}) => {
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // const toggleChannel = (channel: string) => {
  //   setSelectedChannels((prev) =>
  //     prev.includes(channel) ? prev.filter((ch) => ch !== channel) : [...prev, channel]
  //   );
  // };

  // const toggleCategory = (category: string) => {
  //   setSelectedCategories((prev) =>
  //     prev.includes(category) ? prev.filter((ct) => ct !== category) : [...prev, category]
  //   );
  // };

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
    <Dialog onClose={handleCloseModal} open={open} className="channel-category-modal-container">
      <DialogTitle className="dialog-title">
        Select Channels and Categories
      </DialogTitle>
      {/* Reuse FilterSection for Channels and Categories */}
      {/* <FilterSection
        title="Channels"
        options={ChannelOptions}
        selected={selectedChannels}
        toggleOption={toggleChannel}
      /> */}

      {/* <FilterSection
        title="Categories"
        options={CategoryOptions}
        selected={selectedCategories}
        toggleOption={toggleCategory}
      /> */}

      {/* Add other sections for Location and Time Frame here */}
      <DialogActions className="dialog-actions">
        <Button onClick={handleCloseModal}>Close</Button>
        <Button onClick={handleClear}>Clear All</Button>
        <Button onClick={handleApply}>Apply Filters</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CheckBoxModal;
