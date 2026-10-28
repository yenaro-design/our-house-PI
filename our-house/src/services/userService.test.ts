import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAuth, mockUpdateProfile, firestore } = vi.hoisted(() => {
  const mockAuth = {
    currentUser: null as {
      uid: string;
      displayName: string | null;
      email: string | null;
    } | null,
  };

  const mockUpdateProfile = vi.fn();

  const firestore = {
    doc: vi.fn(),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    serverTimestamp: vi.fn(() => 'server-timestamp'),
    onSnapshot: vi.fn(() => vi.fn()),
  };

  return { mockAuth, mockUpdateProfile, firestore };
});

vi.mock('firebase/firestore', () => ({
  doc: firestore.doc,
  getDoc: firestore.getDoc,
  setDoc: firestore.setDoc,
  serverTimestamp: firestore.serverTimestamp,
  onSnapshot: firestore.onSnapshot,
}));

vi.mock('firebase/auth', () => ({
  updateProfile: mockUpdateProfile,
}));

vi.mock('../firebase/config', () => ({
  auth: mockAuth,
  db: {},
}));

import {
  createDefaultProfile,
  getLocalProfile,
  getUserProfile,
  setLocalProfile,
  setUserDwelling,
  getUsersByIds,
  subscribeUserProfile,
  updateUserProfile,
  validateProfileData,
} from './userService';

describe('userService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    firestore.doc.mockReturnValue('user-doc-ref');
    mockAuth.currentUser = {
      uid: 'user-1',
      displayName: 'Ana',
      email: 'ana@demo.com',
    };
  });

  it('valida correctamente los datos del perfil y bloquea entradas inválidas', () => {
    const valid = validateProfileData({
      nombre: ' Ana López ',
      ingresoMensual: 3500,
      telefono: ' +34 612 345 678 ',
    });

    expect(valid.isValid).toBe(true);
    expect(valid.errors).toEqual({});

    const invalid = validateProfileData({
      nombre: 'A',
      ingresoMensual: -100,
      telefono: 'abc',
    });

    expect(invalid.isValid).toBe(false);
    expect(invalid.errors).toMatchObject({
      nombre: 'El nombre debe tener al menos 2 caracteres.',
      ingresoMensual: 'El ingreso mensual no puede ser un valor negativo.',
      telefono: 'Ingresa un número telefónico válido (entre 7 y 15 dígitos).',
    });
    expect(validateProfileData({ nombre: '', ingresoMensual: NaN })).toMatchObject({
      isValid: false,
      errors: { nombre: 'El nombre completo es requerido.', ingresoMensual: 'Ingresa un valor numérico válido para el ingreso mensual.' },
    });
    expect(validateProfileData({ nombre: 'A'.repeat(81), ingresoMensual: 1_000_000_001 })).toMatchObject({
      isValid: false,
      errors: { nombre: 'El nombre no puede exceder los 80 caracteres.', ingresoMensual: 'El monto ingresado excede el límite permitido.' },
    });
    expect(validateProfileData({ nombre: 'Ana', ingresoMensual: 0, telefono: '' }).isValid).toBe(true);
  });

  it('guarda y recupera el perfil del usuario desde localStorage', () => {
    const profile = {
      id: 'user-2',
      nombre: 'Bruno',
      email: 'bruno@demo.com',
      ingresoMensual: 2800,
      telefono: '+341234567',
      viviendaId: 'vivienda-1',
    };

    const onProfileUpdate = vi.fn();
    window.addEventListener('our_house:profile_update', onProfileUpdate);

    setLocalProfile('user-2', profile);

    expect(getLocalProfile('user-2')).toEqual(profile);
    expect(onProfileUpdate).toHaveBeenCalledTimes(1);

    window.removeEventListener('our_house:profile_update', onProfileUpdate);
  });

  it('crea un perfil por defecto usando la sesión actual cuando no existe información remota', () => {
    mockAuth.currentUser = {
      uid: 'user-3',
      displayName: null,
      email: 'nuevo@demo.com',
    };

    const profile = createDefaultProfile('user-3');

    expect(profile).toMatchObject({
      id: 'user-3',
      nombre: 'nuevo',
      email: 'nuevo@demo.com',
      ingresoMensual: 0,
    });
  });

  it('obtiene el perfil remoto y combina los datos con el perfil local', async () => {
    setLocalProfile('user-2', {
      id: 'user-2',
      nombre: 'Local',
      email: 'local@demo.com',
      ingresoMensual: 1500,
    });

    firestore.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        nombre: 'Remoto',
        ingresoMensual: 3400,
        telefono: '987654321',
        viviendaId: 'vivienda-2',
      }),
    });

    const profile = await getUserProfile('user-2');

    expect(profile).toMatchObject({
      id: 'user-2',
      nombre: 'Remoto',
      email: 'local@demo.com',
      ingresoMensual: 3400,
      telefono: '987654321',
      viviendaId: 'vivienda-2',
    });
  });

  it('sincroniza el perfil desde Firestore y notifica actualizaciones locales', () => {
    const updates: Array<ReturnType<typeof getLocalProfile> | null> = [];
    const unsubscribe = subscribeUserProfile('user-4', (user) => {
      updates.push(user);
    });

    expect(updates[0]).toMatchObject({
      id: 'user-4',
      nombre: 'Ana',
      email: 'ana@demo.com',
      ingresoMensual: 0,
    });

    type SnapshotLike = {
      exists: () => boolean;
      data: () => {
        nombre: string;
        ingresoMensual: number;
        telefono: string;
      };
    };

    const onSnapshotMock = firestore.onSnapshot as unknown as {
      mock: {
        calls: Array<[
          unknown,
          (snapshot: SnapshotLike) => void,
          ((error: Error) => void)?
        ]>;
      };
    };

    const onNext = onSnapshotMock.mock.calls[0]?.[1];
    if (!onNext) {
      throw new Error('No se registró el callback de snapshot de Firestore');
    }

    onNext({
      exists: () => true,
      data: () => ({
        nombre: 'Ana remota',
        ingresoMensual: 5000,
        telefono: '654321987',
      }),
    });

    expect(updates.at(-1)).toMatchObject({
      id: 'user-4',
      nombre: 'Ana remota',
      ingresoMensual: 5000,
      telefono: '654321987',
    });

    unsubscribe();
  });

  it('actualiza el perfil del usuario en local y en Firebase Auth/Firestore', async () => {
    const user = await updateUserProfile('user-1', {
      nombre: '  Laura López  ',
      ingresoMensual: 3500.005,
      telefono: ' 1234567 ',
      viviendaId: 'vivienda-9',
    });

    expect(user).toMatchObject({
      id: 'user-1',
      nombre: 'Laura López',
      ingresoMensual: 3500.01,
      telefono: '1234567',
      viviendaId: 'vivienda-9',
    });

    expect(mockUpdateProfile).toHaveBeenCalledWith(mockAuth.currentUser, {
      displayName: 'Laura López',
    });

    expect(firestore.setDoc).toHaveBeenCalledWith(
      'user-doc-ref',
      expect.objectContaining({
        nombre: 'Laura López',
        ingresoMensual: 3500.01,
        telefono: '1234567',
        viviendaId: 'vivienda-9',
      }),
      { merge: true }
    );
  });

  it('rechaza actualizaciones con identificador o datos inválidos', async () => {
    await expect(updateUserProfile('', { nombre: 'Ana', ingresoMensual: 1000 })).rejects.toThrow(
      'Identificador de usuario inválido.'
    );

    await expect(
      updateUserProfile('user-9', { nombre: '', ingresoMensual: 1000 })
    ).rejects.toThrow('El nombre completo es requerido.');
  });

  it('crea perfiles por defecto cuando no existe remoto ni local y tolera fallos de escritura', async () => {
    mockAuth.currentUser = { uid: 'u', displayName: null, email: null };
    firestore.getDoc.mockResolvedValue({ exists: () => false });
    firestore.setDoc.mockRejectedValueOnce(new Error('permission'));
    await expect(getUserProfile('new-user')).resolves.toMatchObject({ id: 'new-user', nombre: 'Usuario', email: '' });
    await expect(getUserProfile('')).resolves.toBeNull();
    firestore.getDoc.mockRejectedValueOnce(new Error('offline'));
    await expect(getUserProfile('fallback')).resolves.toMatchObject({ id: 'fallback' });
  });

  it('cubre ramas de actualización sin cambio de nombre y con fallos remotos', async () => {
    mockAuth.currentUser = { uid: 'user-1', displayName: 'Ana', email: 'ana@demo.com' };
    firestore.setDoc.mockRejectedValueOnce(new Error('offline'));
    await expect(updateUserProfile('user-1', { nombre: 'Ana', ingresoMensual: 10 })).resolves.toMatchObject({
      nombre: 'Ana', telefono: '',
    });
    mockAuth.currentUser = null;
    await expect(updateUserProfile('user-2', { nombre: 'Luis', ingresoMensual: 20 })).resolves.toMatchObject({ id: 'user-2' });
  });

  it('sincroniza vivienda, valida suscripción vacía y procesa errores remotos', async () => {
    await setUserDwelling('', 'v-1');
    await setUserDwelling('user-5', null);
    expect(firestore.setDoc).toHaveBeenCalled();
    const updates: Array<unknown> = [];
    expect(subscribeUserProfile('', (user) => updates.push(user))).toBeTypeOf('function');
    expect(updates).toEqual([null]);
    const onError = vi.fn();
    const unsubscribe = subscribeUserProfile('user-5', (user) => updates.push(user), onError);
    const callbacks = (firestore.onSnapshot as unknown as { mock: { calls: Array<[unknown, unknown, (error: Error & { code?: string }) => void]> } }).mock.calls;
    callbacks.at(-1)?.[2]({ code: 'permission-denied', message: 'permission denied' } as Error & { code: string });
    expect(onError).not.toHaveBeenCalled();
    callbacks.at(-1)?.[2]({ code: 'other', message: 'boom' } as Error & { code: string });
    expect(onError).toHaveBeenCalled();
    unsubscribe();
  });

  it('obtiene usuarios por ids y omite identificadores vacíos o perfiles con error', async () => {
    await expect(getUsersByIds([])).resolves.toEqual([]);
    firestore.getDoc.mockRejectedValueOnce(new Error('offline'));
    await expect(getUsersByIds(['bad'])).resolves.toHaveLength(1);
  });
});
