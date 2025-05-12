export const ErrorMessage = ({
  message,
  show,
}: {
  message: string;
  show: boolean;
}) => {
  return show ? <div className="error-message">{message}</div> : <div></div>;
};
