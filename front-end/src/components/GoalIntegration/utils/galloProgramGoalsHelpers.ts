import dayjs from "dayjs";
import { GalloProgramType } from "../../../utils/types";

export const isProgramExpired = (program: GalloProgramType) => {
    if (!program.endDate) return false;
    return dayjs(program.endDate).isBefore(dayjs(), "day");
  };