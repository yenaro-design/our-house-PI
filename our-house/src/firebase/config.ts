// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// Configuración base verificada y activa del proyecto Our House (PI)
const defaultFirebaseConfig = {
  apiKey: "AIzaSyB1TjsLPi2HvhXAljzh6i8JIZMPQPt4s-8",
  authDomain: "our-house-pi.firebaseapp.com",
  projectId: "our-house-pi",
  storageBucket: "our-house-pi.firebasestorage.app",
  messagingSenderId: "1072893888582",
  appId: "1:1072893888582:web:9e5304eb06757e56166247",
  measurementId: "G-WHNZTQP39L"
};

// Se detectan variables de entorno para proyectos alternativos válidos,
// protegiendo contra el proyecto no configurado our-house-29ddf que carece de Identity Platform.
const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const isUnconfiguredProject =
  !envProjectId ||
  envProjectId === "our-house-29ddf" ||
  import.meta.env.VITE_FIREBASE_API_KEY === "AIzaSyB1Apu4xXe0QM23OJGNS2RV1KAkx6Hwp8k";

const firebaseConfig = isUnconfiguredProject
  ? defaultFirebaseConfig
  : {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
      projectId: envProjectId || defaultFirebaseConfig.projectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
      appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || defaultFirebaseConfig.measurementId
    };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== "undefined") {
  try {
    analytics = getAnalytics(app);
  } catch {
    // Analytics optional in sandbox
  }
}
const auth = getAuth(app);
const db = getFirestore(app);
export { app, analytics, auth, db };