import { getAnalytics } from 'firebase/analytics'
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
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