import {
    arrayUnion,
    arrayRemove,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    setDoc,
    updateDoc,
    where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Dwelling } from '../models/Dwelling';
import type { User } from '../models/User';
import { getUsersByIds, setUserDwelling } from './userService';

interface DatosVivienda {
    nombre: string;
    direccion: string;
}

const STORAGE_KEY = 'our_house_dwellings';

function getLocalDwellings(): Dwelling[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.warn('Error al leer viviendas locales:', e);
    }
    return [];
}

function saveLocalDwellings(dwellings: Dwelling[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dwellings));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('our_house:dwellings_change'));
        }
    } catch (e) {
        console.warn('Error al guardar viviendas locales:', e);
    }
}

function generarCodigoInvitacion(): string {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo = '';
    for (let i = 0; i < 6; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return codigo;
}

/**
 * HU05 — Creación de una nueva vivienda y generación de código único de invitación
 */
export async function crearVivienda(datos: DatosVivienda, userId: string): Promise<Dwelling> {
    const cleanNombre = datos.nombre.trim();
    const cleanDireccion = datos.direccion.trim();

    if (!cleanNombre || !cleanDireccion) {
        throw new Error('El nombre de la vivienda y la dirección son obligatorios.');
    }

    const codigoInvitacion = generarCodigoInvitacion();
    const viviendaId = 'vivienda-' + Date.now();

    const nuevaVivienda: Dwelling = {
        id: viviendaId,
        nombre: cleanNombre,
        direccion: cleanDireccion,
        codigoInvitacion,
        administradorId: userId,
        integrantes: [userId],
        creadoEn: new Date().toISOString(),
    };

    // 1. Guardar localmente
    const local = getLocalDwellings();
    local.push(nuevaVivienda);
    saveLocalDwellings(local);

    // 2. Asociar vivienda al creador
    await setUserDwelling(userId, viviendaId);

    // 3. Guardar en Firestore
    try {
        const viviendaRef = doc(db, 'dwellings', viviendaId);
        await setDoc(viviendaRef, {
            nombre: cleanNombre,
            direccion: cleanDireccion,
            codigoInvitacion,
            administradorId: userId,
            integrantes: [userId],
            creadoEn: new Date().toISOString(),
        });
    } catch (err) {
        console.warn('Aviso: guardando vivienda en almacenamiento local (Firestore no disponible):', err);
    }

    return nuevaVivienda;
}

/**
 * HU06 — Búsqueda de vivienda por código de invitación
 */
export async function buscarViviendaPorCodigo(codigo: string): Promise<Dwelling | null> {
    const cleanCode = codigo.trim().toUpperCase();
    if (!cleanCode) return null;

    // Buscar en Firestore
    try {
        const viviendasRef = collection(db, 'dwellings');
        const busqueda = query(viviendasRef, where('codigoInvitacion', '==', cleanCode));
        const resultado = await getDocs(busqueda);

        if (!resultado.empty) {
            const docSnap = resultado.docs[0];
            const data = docSnap.data();
            return {
                id: docSnap.id,
                nombre: data.nombre,
                direccion: data.direccion,
                codigoInvitacion: data.codigoInvitacion,
                administradorId: data.administradorId,
                integrantes: data.integrantes || [],
                creadoEn: data.creadoEn,
            };
        }
    } catch (err) {
        console.warn('Aviso: consultando vivienda localmente:', err);
    }

    // Fallback a localStorage
    const local = getLocalDwellings();
    const found = local.find((d) => d.codigoInvitacion.toUpperCase() === cleanCode);
    if (found) {
        return found;
    }

    return null;
}

/**
 * Obtener vivienda por ID
 */
export async function obtenerViviendaPorId(viviendaId: string): Promise<Dwelling | null> {
    if (!viviendaId) return null;

    try {
        const docRef = doc(db, 'dwellings', viviendaId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                nombre: data.nombre,
                direccion: data.direccion,
                codigoInvitacion: data.codigoInvitacion,
                administradorId: data.administradorId,
                integrantes: data.integrantes || [],
                creadoEn: data.creadoEn,
            };
        }
    } catch (err) {
        console.warn('Aviso al obtener vivienda por ID en Firestore:', err);
    }

    const local = getLocalDwellings();
    return local.find((d) => d.id === viviendaId) || null;
}

/**
 * HU06 — Vinculación a una vivienda mediante código de invitación
 */
export async function unirseAVivienda(viviendaId: string, userId: string): Promise<void> {
    if (!viviendaId || !userId) {
        throw new Error('Parámetros requeridos inválidos para vincularse a la vivienda.');
    }

    // 1. Actualizar localmente
    const local = getLocalDwellings();
    const index = local.findIndex((d) => d.id === viviendaId);
    if (index !== -1) {
        if (!local[index].integrantes.includes(userId)) {
            local[index].integrantes.push(userId);
            saveLocalDwellings(local);
        }
    }

    // 2. Asociar vivienda al perfil del usuario
    await setUserDwelling(userId, viviendaId);

    // 3. Actualizar Firestore
    try {
        const viviendaRef = doc(db, 'dwellings', viviendaId);
        await updateDoc(viviendaRef, {
            integrantes: arrayUnion(userId),
        });
    } catch (err) {
        console.warn('Aviso: vinculación de vivienda actualizada en almacenamiento local:', err);
    }
}

/**
 * HU07 — Visualización del listado de integrantes de la vivienda
 */
export async function obtenerIntegrantesVivienda(viviendaId: string): Promise<User[]> {
    const dwelling = await obtenerViviendaPorId(viviendaId);
    if (!dwelling || !dwelling.integrantes || dwelling.integrantes.length === 0) {
        return [];
    }

    return await getUsersByIds(dwelling.integrantes);
}

/**
 * HU08 — Retiro de un integrante por el administrador
 */
export async function retirarIntegrante(
    viviendaId: string,
    adminId: string,
    memberId: string,
    saldoConsolidado: number
): Promise<{ success: boolean; message: string }> {
    const dwelling = await obtenerViviendaPorId(viviendaId);
    if (!dwelling) {
        throw new Error('La vivienda no existe.');
    }

    if (dwelling.administradorId !== adminId) {
        throw new Error('Solo el administrador de la vivienda tiene permisos para retirar integrantes.');
    }

    if (adminId === memberId) {
        throw new Error('El administrador no puede retirarse a sí mismo con esta opción.');
    }

    // Criterio de aceptación estricto HU08: Saldo consolidado igual a $0
    if (Math.abs(saldoConsolidado) > 0.01) {
        const tipoSaldo = saldoConsolidado > 0 ? 'saldo a favor' : 'deuda pendiente';
        const formatted = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Math.abs(saldoConsolidado));
        throw new Error(
            `No es posible retirar al integrante. Tiene un ${tipoSaldo} de ${formatted}. El saldo debe ser exactamente $0 para efectuar el retiro.`
        );
    }

    // 1. Remover de local storage
    const local = getLocalDwellings();
    const dIndex = local.findIndex((d) => d.id === viviendaId);
    if (dIndex !== -1) {
        local[dIndex].integrantes = local[dIndex].integrantes.filter((uid) => uid !== memberId);
        saveLocalDwellings(local);
    }

    // 2. Limpiar vivienda en el perfil del usuario retirado
    await setUserDwelling(memberId, null);

    // 3. Remover de Firestore
    try {
        const viviendaRef = doc(db, 'dwellings', viviendaId);
        await updateDoc(viviendaRef, {
            integrantes: arrayRemove(memberId),
        });
    } catch (err) {
        console.warn('Aviso al retirar integrante en Firestore:', err);
    }

    return {
        success: true,
        message: 'Integrante retirado exitosamente de la vivienda.',
    };
}

/**
 * HU09 — Salida voluntaria de un integrante de la vivienda
 */
export async function abandonarVivienda(
    viviendaId: string,
    userId: string,
    saldoConsolidado: number,
    tareasPendientesCount: number,
    tareasPendientesNombres: string[] = []
): Promise<{ success: boolean; message: string }> {
    const dwelling = await obtenerViviendaPorId(viviendaId);
    if (!dwelling) {
        throw new Error('La vivienda no existe.');
    }

    // Criterio 1: Saldo consolidado exactamente igual a $0
    if (Math.abs(saldoConsolidado) > 0.01) {
        const tipoSaldo = saldoConsolidado > 0 ? 'saldo a favor' : 'deuda pendiente';
        const formatted = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Math.abs(saldoConsolidado));
        throw new Error(
            `No puedes abandonar la vivienda porque posees un ${tipoSaldo} de ${formatted}. Debes liquidar tus obligaciones y quedar en $0 antes de salir.`
        );
    }

    // Criterio 2: 0 tareas domésticas asignadas en estado pendiente
    if (tareasPendientesCount > 0) {
        const nombresTexto = tareasPendientesNombres.length > 0 ? ` (${tareasPendientesNombres.slice(0, 3).join(', ')})` : '';
        throw new Error(
            `No puedes abandonar la vivienda porque tienes ${tareasPendientesCount} tarea(s) pendiente(s) asignada(s)${nombresTexto}. Debes completarlas o reasignarlas antes de salir.`
        );
    }

    // Si el usuario es el administrador, reasignar al siguiente integrante si existe
    let nuevoAdminId = dwelling.administradorId;
    if (dwelling.administradorId === userId) {
        const remainingMembers = dwelling.integrantes.filter((uid) => uid !== userId);
        if (remainingMembers.length > 0) {
            nuevoAdminId = remainingMembers[0];
        }
    }

    // 1. Remover localmente
    const local = getLocalDwellings();
    const dIndex = local.findIndex((d) => d.id === viviendaId);
    if (dIndex !== -1) {
        local[dIndex].integrantes = local[dIndex].integrantes.filter((uid) => uid !== userId);
        local[dIndex].administradorId = nuevoAdminId;
        saveLocalDwellings(local);
    }

    // 2. Limpiar vivienda en perfil
    await setUserDwelling(userId, null);

    // 3. Actualizar Firestore
    try {
        const viviendaRef = doc(db, 'dwellings', viviendaId);
        await updateDoc(viviendaRef, {
            integrantes: arrayRemove(userId),
            administradorId: nuevoAdminId,
        });
    } catch (err) {
        console.warn('Aviso al abandonar vivienda en Firestore:', err);
    }

    return {
        success: true,
        message: 'Has salido de la vivienda exitosamente.',
    };
}
