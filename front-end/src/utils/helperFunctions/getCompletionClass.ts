export const getCompletionClass = (percentage: number) => {
  const clamped = Math.min(Math.max(percentage, 0), 100); // Clamp between 0 and 100
  const rounded = Math.round(clamped / 10) * 10;
  return `completion-${rounded} completion`;
};
