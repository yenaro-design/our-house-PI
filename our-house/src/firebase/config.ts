// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB1TjsLPi2HvhXAljzh6i8JIZMPQPt4s-8",
  authDomain: "our-house-pi.firebaseapp.com",
  projectId: "our-house-pi",
  storageBucket: "our-house-pi.firebasestorage.app",
  messagingSenderId: "1072893888582",
  appId: "1:1072893888582:web:9e5304eb06757e56166247",
  measurementId: "G-WHNZTQP39L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
export { app, analytics, auth, db };