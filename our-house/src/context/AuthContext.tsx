/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import type { User as FirebaseUser } from "firebase/auth";
import { auth } from "../firebase/config";
import type { User as AppUser } from "../models/User";
import { subscribeUserProfile, getUserProfile } from "../services/userService";

export interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: AppUser | null;
  token: string | null;
  loading: boolean;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  token: null,
  loading: true,
  profileLoading: false,
  refreshProfile: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Escucha el estado de autenticación y vincula en tiempo real el perfil de Firestore
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setProfileLoading(true);
        try {
          const jwt = await currentUser.getIdToken();
          setToken(jwt);
        } catch (tokenErr) {
          console.warn("Aviso al obtener token:", tokenErr);
        }

        // Suscripción reactiva en tiempo real al documento del usuario en Firestore
        unsubscribeProfile = subscribeUserProfile(
          currentUser.uid,
          (profile) => {
            setUserProfile(profile);
            setProfileLoading(false);
          },
          (err) => {
            console.warn("Aviso al escuchar perfil:", err);
            setProfileLoading(false);
          }
        );
      } else {
        setToken(null);
        setUserProfile(null);
        setProfileLoading(false);
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      setProfileLoading(true);
      try {
        const fresh = await getUserProfile(user.uid);
        setUserProfile(fresh);
      } finally {
        setProfileLoading(false);
      }
    }
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setUserProfile(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        token,
        loading,
        profileLoading,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

