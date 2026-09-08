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
import { setLocalProfile } from "./userService";

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

  // Asigna displayName en Auth y registra perfil inicial tanto localmente como en Firestore
  const initialProfile = {
    id: user.uid,
    nombre: normalizedName,
    email: user.email || normalizedEmail,
    ingresoMensual: 0,
    telefono: "",
    createdAt: new Date().toISOString(),
  };

  setLocalProfile(user.uid, initialProfile);

  try {
    await updateProfile(user, {
      displayName: normalizedName,
    });
  } catch (authErr) {
    console.warn("Aviso al asignar displayName inicial:", authErr);
  }

  try {
    await setDoc(doc(db, "users", user.uid), {
      ...initialProfile,
      createdAt: serverTimestamp(),
    });
  } catch (profileError) {
    console.warn("Perfil registrado localmente; sincronización en la nube pendiente de permisos:", profileError);
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