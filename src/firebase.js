import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAStLWD-NghJWkb3N26P4mCOcr78Ahx39I",
  authDomain: "chat-6f883.firebaseapp.com",
  projectId: "chat-6f883",
  storageBucket: "chat-6f883.firebasestorage.app",
  messagingSenderId: "82386140912",
  appId: "1:82386140912:web:4dba9a57769330cd0e0c35",
  measurementId: "G-2ZF3CDDQDE"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const storage = getStorage(app);
export { app, storage };
