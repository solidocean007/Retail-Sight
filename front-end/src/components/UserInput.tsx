import { ComponentProps } from "react";

export const UserInput = ({
  labelText,
  inputProps,
  onToggleVisibility,
  isPasswordField, // New prop to indicate if this is a password field
}: {
  labelText: string;
  inputProps: ComponentProps<"input">;
  onToggleVisibility?: () => void;
  isPasswordField?: boolean; // New prop
}) => {
  return (
    <>
      <label htmlFor="">{labelText}</label>
      {isPasswordField && (
        <button type="button" onClick={onToggleVisibility}>
          Show/Hide
        </button>
      )}
      <input {...inputProps} />
    </>
  );
};
