import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export async function shouldSendNotification({
  senderId,
  recipientId,
  postId,
  type,
}: {
  senderId: string;
  recipientId: string;
  postId: string;
  type: string;
}) {
  const recentQuery = query(
    collection(db, "notifications"),
    where("senderId", "==", senderId),
    where("recipientUserIds", "array-contains", recipientId),
    where("postId", "==", postId),
    where("type", "==", type)
  );
  const snap = await getDocs(recentQuery);
  return snap.empty;
}
