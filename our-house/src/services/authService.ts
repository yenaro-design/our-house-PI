import {
  createUserWithEmailAndPassword,
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

  try {
    await updateProfile(user, {
      displayName: normalizedName,
    });

    await setDoc(doc(db, "users", user.uid), {
      id: user.uid,
      nombre: normalizedName,
      email: user.email,
      createdAt: serverTimestamp(),
    });
  } catch (profileError) {
    console.error("No fue posible guardar el perfil del usuario", profileError);
  }

  return user;
};