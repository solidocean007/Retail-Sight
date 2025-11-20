// src/utils/date/formatDisplayDate.ts

export function formatDisplayDate(raw: any): string {
  if (!raw) return "";

  try {
    let jsDate: Date;

    // Firestore Timestamp — real object with .toDate()
    if (raw?.toDate && typeof raw.toDate === "function") {
      jsDate = raw.toDate();
    }

    // Firestore Timestamp (plain object: {seconds, nanoseconds})
    else if (typeof raw === "object" && "seconds" in raw) {
      jsDate = new Date(raw.seconds * 1000);
    }

    // ISO string or number
    else {
      jsDate = new Date(raw);
    }

    // Validate date
    if (!isNaN(jsDate.getTime())) {
      return jsDate.toLocaleDateString();
    }

    return "";
  } catch {
    return "";
  }
}
