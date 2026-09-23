import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { getLocalProfile, setLocalProfile, createDefaultProfile } from './userService'

/**-------------------------------------------------------------------------------------------------------
 * Guarda o actualiza el ingreso mensual de un usuario dentro de su vivienda.
 *----------------------------------------------------------------------------------------------------------*/
export async function guardarIngresoMensual(
    userId: string,
    ingresoMensual: number
): Promise<void> {
    if (isNaN(ingresoMensual) || ingresoMensual <= 0) {
        throw new Error('El ingreso mensual debe ser un número mayor a cero.')
    }

    const local = getLocalProfile(userId) || createDefaultProfile(userId)
    setLocalProfile(userId, { ...local, ingresoMensual })

    try {
        const userRef = doc(db, 'users', userId)
        await setDoc(
            userRef,
            { ingresoMensual },
            { merge: true } 
        )
    } catch (err) {
        console.warn("Aviso: ingreso mensual actualizado en almacenamiento local:", err)
    }
}

/**-----------------------------------------------------------------------------------------------------------------------
 * Consulta el ingreso mensual actual de un usuario.
 *--------------------------------------------------------------------------------------------------------------------*/
export async function obtenerIngresoMensual(
    userId: string
): Promise<number | null> {
    try {
        const userRef = doc(db, 'users', userId)
        const snapshot = await getDoc(userRef)

        if (snapshot.exists()) {
            const data = snapshot.data()
            return data.ingresoMensual ?? null
        }
    } catch (err) {
        console.warn("Aviso: consultando ingreso desde almacenamiento local:", err)
    }

    const local = getLocalProfile(userId)
    return local?.ingresoMensual ?? null
}