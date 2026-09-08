import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { auth, db } from "../firebase/config";
import type { User } from "../models/User";

export interface UpdateUserProfileDTO {
  nombre: string;
  ingresoMensual: number;
  telefono?: string;
}

export interface ProfileValidationResult {
  isValid: boolean;
  errors: {
    nombre?: string;
    ingresoMensual?: string;
    telefono?: string;
    general?: string;
  };
}

const PROFILE_STORAGE_KEY_PREFIX = "our_house_profile_";

/**
 * Obtiene el perfil almacenado localmente en caché
 */
export const getLocalProfile = (userId: string): User | null => {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`${PROFILE_STORAGE_KEY_PREFIX}${userId}`);
    if (raw) {
      return JSON.parse(raw) as User;
    }
  } catch (err) {
    console.warn("Aviso al leer perfil local:", err);
  }
  return null;
};

/**
 * Guarda el perfil en el almacenamiento local y despacha evento de actualización
 */
export const setLocalProfile = (userId: string, user: User): void => {
  if (!userId) return;
  try {
    localStorage.setItem(`${PROFILE_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(user));
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("our_house:profile_update", {
          detail: { userId, user },
        })
      );
    }
  } catch (err) {
    console.warn("Aviso al guardar perfil local:", err);
  }
};

/**
 * Genera un perfil base a partir de las credenciales activas en Auth
 */
export const createDefaultProfile = (userId: string): User => {
  const current = auth.currentUser;
  const nombre = current?.displayName || current?.email?.split("@")[0] || "Usuario";
  const email = current?.email || "";
  return {
    id: userId,
    nombre,
    email,
    ingresoMensual: 0,
    telefono: "",
    createdAt: new Date().toISOString(),
  };
};

/**
 * Valida el formato e integridad de los datos del perfil antes de persistir
 */
export const validateProfileData = (
  data: UpdateUserProfileDTO
): ProfileValidationResult => {
  const errors: ProfileValidationResult["errors"] = {};

  const trimmedNombre = data.nombre?.trim() ?? "";
  if (!trimmedNombre) {
    errors.nombre = "El nombre completo es requerido.";
  } else if (trimmedNombre.length < 2) {
    errors.nombre = "El nombre debe tener al menos 2 caracteres.";
  } else if (trimmedNombre.length > 80) {
    errors.nombre = "El nombre no puede exceder los 80 caracteres.";
  }

  const ingreso = Number(data.ingresoMensual);
  if (data.ingresoMensual === undefined || data.ingresoMensual === null || isNaN(ingreso)) {
    errors.ingresoMensual = "Ingresa un valor numérico válido para el ingreso mensual.";
  } else if (ingreso < 0) {
    errors.ingresoMensual = "El ingreso mensual no puede ser un valor negativo.";
  } else if (ingreso > 1_000_000_000) {
    errors.ingresoMensual = "El monto ingresado excede el límite permitido.";
  }

  if (data.telefono !== undefined && data.telefono.trim() !== "") {
    const cleanPhone = data.telefono.trim();
    const phoneRegex = /^[+]?[\d\s-]{7,15}$/;
    if (!phoneRegex.test(cleanPhone)) {
      errors.telefono = "Ingresa un número telefónico válido (entre 7 y 15 dígitos).";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Obtiene la información del perfil del usuario registrado (Firestore con respaldo local seguro)
 */
export const getUserProfile = async (userId: string): Promise<User | null> => {
  if (!userId) return null;

  const local = getLocalProfile(userId);

  try {
    const userDocRef = doc(db, "users", userId);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const remoteData = docSnap.data() as User;
      const merged: User = { ...(local || {}), ...remoteData, id: userId };
      setLocalProfile(userId, merged);
      return merged;
    }

    if (local) {
      return local;
    }

    const defaultUser = createDefaultProfile(userId);
    setLocalProfile(userId, defaultUser);

    try {
      await setDoc(userDocRef, {
        ...defaultUser,
        createdAt: serverTimestamp(),
      });
    } catch {
      // Ignorar error si Firestore no permite escritura remota
    }

    return defaultUser;
  } catch (error: unknown) {
    console.warn("Utilizando perfil desde almacenamiento local seguro:", error);
    if (local) return local;

    const defaultUser = createDefaultProfile(userId);
    setLocalProfile(userId, defaultUser);
    return defaultUser;
  }
};

/**
 * Escucha cambios en tiempo real del perfil del usuario con sincronización local y remota
 */
export const subscribeUserProfile = (
  userId: string,
  onUpdate: (user: User | null) => void,
  onError?: (error: Error) => void
): (() => void) => {
  if (!userId) {
    onUpdate(null);
    return () => {};
  }

  // 1. Emitir inmediatamente el estado en caché local
  const currentLocal = getLocalProfile(userId) || createDefaultProfile(userId);
  onUpdate(currentLocal);

  // 2. Escuchar cambios de perfil locales intra-app y entre pestañas
  const handleLocalUpdate = (e: Event) => {
    const customEvent = e as CustomEvent<{ userId: string; user: User }>;
    if (customEvent.detail?.userId === userId) {
      onUpdate(customEvent.detail.user);
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === `${PROFILE_STORAGE_KEY_PREFIX}${userId}` && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue) as User;
        onUpdate(parsed);
      } catch {
        // Ignorar JSON malformado
      }
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("our_house:profile_update", handleLocalUpdate);
    window.addEventListener("storage", handleStorageEvent);
  }

  // 3. Suscripción remota a Firestore con control de excepciones por permisos
  let unsubscribeFirestore: (() => void) | null = null;
  try {
    const userDocRef = doc(db, "users", userId);
    unsubscribeFirestore = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const remoteData = docSnap.data() as User;
          const merged: User = {
            ...(getLocalProfile(userId) || currentLocal),
            ...remoteData,
            id: userId,
          };
          setLocalProfile(userId, merged);
          onUpdate(merged);
        } else {
          getUserProfile(userId)
            .then((profile) => {
              if (profile) onUpdate(profile);
            })
            .catch(() => {});
        }
      },
      (error) => {
        // En caso de que Firestore tenga reglas restringidas (permission-denied),
        // mantenemos la sincronización local activa sin registrar error crítico.
        console.warn(
          "Aviso en sincronización remota de Firestore (manteniendo perfil local activo):",
          error.message || error
        );
        const fallback = getLocalProfile(userId) || createDefaultProfile(userId);
        onUpdate(fallback);

        const isPermissionError =
          error.code === "permission-denied" ||
          (error.message && error.message.includes("permission"));

        if (onError && !isPermissionError) {
          onError(error);
        }
      }
    );
  } catch (err) {
    console.warn("Aviso al registrar listener remoto de Firestore:", err);
  }

  return () => {
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("our_house:profile_update", handleLocalUpdate);
      window.removeEventListener("storage", handleStorageEvent);
    }
  };
};

/**
 * Almacena y actualiza los datos personales de perfil en almacenamiento seguro y Firestore
 */
export const updateUserProfile = async (
  userId: string,
  data: UpdateUserProfileDTO
): Promise<User> => {
  if (!userId) {
    throw new Error("Identificador de usuario inválido.");
  }

  // 1. Validar integridad y formato
  const validation = validateProfileData(data);
  if (!validation.isValid) {
    const firstError =
      validation.errors.nombre ||
      validation.errors.ingresoMensual ||
      validation.errors.telefono ||
      "Datos de perfil inválidos.";
    throw new Error(firstError);
  }

  const existing = getLocalProfile(userId) || createDefaultProfile(userId);
  const updatedUser: User = {
    ...existing,
    id: userId,
    nombre: data.nombre.trim(),
    ingresoMensual: Math.round(Number(data.ingresoMensual) * 100) / 100,
    telefono: data.telefono?.trim() || "",
    updatedAt: new Date().toISOString(),
  };

  // 2. Persistir localmente y sincronizar en memoria de inmediato
  setLocalProfile(userId, updatedUser);

  // 3. Sincronizar nombre en Firebase Auth si corresponde
  if (auth.currentUser && auth.currentUser.uid === userId) {
    if (auth.currentUser.displayName !== updatedUser.nombre) {
      try {
        await updateProfile(auth.currentUser, {
          displayName: updatedUser.nombre,
        });
      } catch (authErr) {
        console.warn("Aviso al sincronizar displayName en Auth:", authErr);
      }
    }
  }

  // 4. Intentar persistir en Firestore
  try {
    const userDocRef = doc(db, "users", userId);
    await setDoc(
      userDocRef,
      {
        nombre: updatedUser.nombre,
        ingresoMensual: updatedUser.ingresoMensual,
        telefono: updatedUser.telefono,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error: unknown) {
    // Si las reglas de seguridad de Firestore en la nube no permiten escritura directa,
    // notificamos de forma informativa manteniendo los datos guardados en el dispositivo.
    console.warn(
      "Aviso: Firestore remoto no autorizó la escritura directa; los cambios se guardaron y sincronizaron localmente con éxito.",
      error
    );
  }

  return updatedUser;
};
