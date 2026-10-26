import { getStorage } from "firebase/storage";
import { app } from "./firebase";

// Storage is only needed by capture and upload flows. Keeping it outside the
// core Firebase module prevents the Storage SDK from joining the app shell.
export const storage = getStorage(app);
