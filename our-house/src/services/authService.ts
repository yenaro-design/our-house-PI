import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";

export const registerUser = async (
  nombre: string,
  email: string,
  password: string
) => {
  const normalizedName = nombre.trim();
  const normalizedEmail = email.trim().toLowerCase();

  const userCredential = await createUserWithEmailAndPassword(
    auth,
    normalizedEmail,
    password
  );

  const user = userCredential.user;

  // ponytail: asigna displayName en Auth y crea documento inicial en users
  try {
    await updateProfile(user, {
      displayName: normalizedName,
    });

    await setDoc(doc(db, "users", user.uid), {
      id: user.uid,
      nombre: normalizedName,
      email: user.email,
      ingresoMensual: 0,
      createdAt: serverTimestamp(),
    });
  } catch (profileError) {
    console.error("No fue posible guardar el perfil del usuario", profileError);
  }

  return user;
};

export const loginUser = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email.trim().toLowerCase(),
    password
  );
  return userCredential.user;
};