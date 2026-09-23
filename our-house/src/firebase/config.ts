import { getAnalytics } from 'firebase/analytics'
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyMockKeyForDevEnvironment12345678',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'our-house-app.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'our-house-app',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'our-house-app.appspot.com',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789012:web:abcdef1234567890',
}

const app = initializeApp(firebaseConfig)
let analytics: ReturnType<typeof getAnalytics> | null = null
if (typeof window !== 'undefined') {
    try {
        analytics = getAnalytics(app)
    } catch {
        analytics = null
    }
}

const auth = getAuth(app)
const db = getFirestore(app)

export { app, analytics, auth, db }