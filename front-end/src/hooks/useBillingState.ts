import { useSelector } from "react-redux";
import { RootState } from "../utils/store";

const GRACE_DAYS = 7;

export const useBillingState = () => {
  const company = useSelector(
    (state: RootState) => state.currentCompany.data
  );

  const billing = company?.billing;

  if (!billing) {
    return {
      status: "unknown",
      isPastDue: false,
      isInGrace: false,
      graceDaysRemaining: 0,
    };
  }

  const isPastDue = billing.paymentStatus === "past_due";

  let graceDaysRemaining = 0;
  let isInGrace = false;

  if (isPastDue && billing.pastDueSince) {
    const pastDueDate =
      typeof billing.pastDueSince === "object" && "seconds" in billing.pastDueSince
        ? new Date(billing.pastDueSince.seconds * 1000)
        : new Date(billing.pastDueSince);

    const daysElapsed =
      (Date.now() - pastDueDate.getTime()) / (1000 * 60 * 60 * 24);

    graceDaysRemaining = Math.max(
      0,
      Math.ceil(GRACE_DAYS - daysElapsed)
    );

    isInGrace = graceDaysRemaining > 0;
  }

  return {
    status: billing.paymentStatus,
    isPastDue,
    isInGrace,
    graceDaysRemaining,
  };
};