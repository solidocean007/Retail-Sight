// ChannelSelector.tsx
import React from 'react';
// import { ChannelType } from '../utils/types';

interface ChannelSelectorProps {
  selectedChannel?: ChannelType;
  onChannelChange: (channel: ChannelType) => void;
}

export type ChannelType = 'Grocery' | 'Convenience' | 'Restaurant' | 'Warehouse Club' | 'Department Store';

// Create an array of channels for mapping in the component
const CHANNELS: ChannelType[] = ['Grocery', 'Convenience', 'Restaurant', 'Warehouse Club', 'Department Store'];

interface ChannelSelectorProps {
  selectedChannel?: ChannelType;
  onChannelChange: (channel: ChannelType) => void;
}

const ChannelSelector: React.FC<ChannelSelectorProps> = ({ selectedChannel, onChannelChange }) => {
  return (
    <select 
      value={selectedChannel}
      onChange={(e) => onChannelChange(e.target.value as ChannelType)}
    >
      {CHANNELS.map(channel => (
        <option key={channel} value={channel}>
          {channel}
        </option>
      ))}
    </select>
  );
};

export default ChannelSelector;