import React from "react";
import CustomConfirmation from "../CustomConfirmation";

interface Props {
  email: string;
  isOpen: boolean;
  onCancel: () => void;

  // When confirmed, the parent will send:
  // - pendingBrands (full objects w/ proposedBy UserType)
  // - fromCompanyId
  // - targetEmail
  onConfirm: () => void;
}

const InviteAndConnectModal: React.FC<Props> = ({
  email,
  isOpen,
  onCancel,
  onConfirm,
}) => {
  return (
    <CustomConfirmation
      isOpen={isOpen}
      title="Invite This Company?"
      message={`This admin (${email}) is not yet on Displaygram.\n\nWhen they join, your pending brand proposals will be included and they'll be prompted to approve the connection.`}
      onConfirm={onConfirm}
      onClose={onCancel}
    />
  );
};

export default InviteAndConnectModal;
