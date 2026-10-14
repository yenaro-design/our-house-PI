import { getAnalytics } from 'firebase/analytics'
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyB1TjsLPi2HvhXAljzh6i8JIZMPQPt4s-8',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'our-house-pi.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'our-house-pi',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'our-house-pi.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1072893888582',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1072893888582:web:9e5304eb06757e56166247',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-WHNZTQP39L',
}

const hasFirebaseConfig = Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
)

const app = initializeApp(firebaseConfig)
let analytics: ReturnType<typeof getAnalytics> | null = null
if (typeof window !== 'undefined') {
    if (!hasFirebaseConfig) {
        analytics = null
    } else {
    try {
        analytics = getAnalytics(app)
    } catch {
        analytics = null
    }
    }
}

const auth = getAuth(app)
const db = getFirestore(app)

const isFirebasePersistenceAvailable = (userId?: string) =>
    hasFirebaseConfig &&
    auth.currentUser !== null &&
    (!userId || auth.currentUser.uid === userId)

export { app, analytics, auth, db, hasFirebaseConfig, isFirebasePersistenceAvailable }