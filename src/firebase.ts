// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA7yETo7qPK1Db4EeR5I6fDZibdyYIa5Hk",
  authDomain: "beanswap-1b171.firebaseapp.com",
  projectId: "beanswap-1b171",
  storageBucket: "beanswap-1b171.firebasestorage.app",
  messagingSenderId: "679076968708",
  appId: "1:679076968708:web:6aa6a6128095f9e016f851",
  measurementId: "G-4HR84QENBK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, analytics, auth, db, storage }; 