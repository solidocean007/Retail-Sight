// ChannelSelector.tsx
import React from "react";
import "./channelSelector.css";
// import { ChannelType } from '../utils/types';

interface ChannelSelectorProps {
  selectedChannel?: ChannelType | "";
  onChannelChange: (channel: ChannelType) => void;
}

export type ChannelType =
  | "Grocery"
  | "Convenience"
  | "Restaurant"
  | "Warehouse club"
  | "Department store"
  | "Bar"
  | "Drug store";

// Create an array of channels for mapping in the component
const CHANNELS: ChannelType[] = [
  "Grocery",
  "Convenience",
  "Restaurant",
  "Warehouse club",
  "Department store",
  "Bar",
  "Drug store",
];

const ChannelSelector: React.FC<ChannelSelectorProps> = ({
  selectedChannel,
  onChannelChange,
}) => {
  return (
    <select
      className="channel-selector"
      title="channel selector"
      value={selectedChannel}
      onChange={(e) => onChannelChange(e.target.value as ChannelType)}
    >
      {CHANNELS.map((channel) => (
        <option key={channel} value={channel}>
          {channel}
        </option>
      ))}
    </select>
  );
};

export default ChannelSelector;
