import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  authMock,
  createUserWithEmailAndPasswordMock,
  setDocMock,
  docMock,
  serverTimestampMock,
  setLocalProfileMock,
  signInWithEmailAndPasswordMock,
  updateProfileMock,
} = vi.hoisted(() => ({
  authMock: { currentUser: null as { uid: string; displayName: string | null; email: string | null } | null },
  createUserWithEmailAndPasswordMock: vi.fn(),
  signInWithEmailAndPasswordMock: vi.fn(),
  updateProfileMock: vi.fn(),
  setDocMock: vi.fn(),
  docMock: vi.fn((...args: unknown[]) => args.join(':')),
  serverTimestampMock: vi.fn(() => 'server-timestamp'),
  setLocalProfileMock: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: createUserWithEmailAndPasswordMock,
  signInWithEmailAndPassword: signInWithEmailAndPasswordMock,
  updateProfile: updateProfileMock,
}));

vi.mock('firebase/firestore', () => ({
  doc: docMock,
  setDoc: setDocMock,
  serverTimestamp: serverTimestampMock,
}));

vi.mock('../firebase/config', () => ({
  auth: authMock,
  db: {},
  hasFirebaseConfig: true,
}));

vi.mock('./userService', () => ({
  setLocalProfile: setLocalProfileMock,
}));

import { loginUser, registerUser } from './authService';

describe('authService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    authMock.currentUser = null;
  });

  it('registra un usuario con Firebase y guarda su perfil inicial local y remoto', async () => {
    const user = {
      uid: 'user-123',
      email: 'ana@demo.com',
      displayName: 'Ana',
    };

    createUserWithEmailAndPasswordMock.mockResolvedValue({ user });

    const result = await registerUser(' Ana ', 'ana@demo.com', 'supersecret');

    expect(result).toBe(user);
    expect(createUserWithEmailAndPasswordMock).toHaveBeenCalledWith(
      expect.anything(),
      'ana@demo.com',
      'supersecret'
    );
    expect(updateProfileMock).toHaveBeenCalledWith(user, { displayName: 'Ana' });
    expect(setLocalProfileMock).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({
        id: 'user-123',
        nombre: 'Ana',
        email: 'ana@demo.com',
      })
    );
    expect(setDocMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        id: 'user-123',
        nombre: 'Ana',
        email: 'ana@demo.com',
      })
    );
  });

  it('usa una sesión local cuando Firebase no está disponible o falla con api-key inválida', async () => {
    createUserWithEmailAndPasswordMock.mockRejectedValue({ code: 'auth/invalid-api-key' });

    const result = await registerUser(' Bruno ', 'bruno@demo.com', 'pass123');

    expect(result).toMatchObject({
      email: 'bruno@demo.com',
      displayName: 'Bruno',
    });
    expect(localStorage.getItem('our_house_active_session')).toContain('"displayName":"Bruno"');
    expect(setLocalProfileMock).toHaveBeenCalled();
  });

  it('inicia sesión con Firestore autenticado y ofrece fallback local para usuarios demo', async () => {
    const user = {
      uid: 'demo-user-123',
      email: 'test@example.com',
      displayName: 'Valentina Pérez',
      getIdToken: vi.fn(async () => 'demo-token'),
    };

    signInWithEmailAndPasswordMock.mockResolvedValue({ user });

    const result = await loginUser('test@example.com', 'secret');

    expect(result).toBe(user);

    signInWithEmailAndPasswordMock.mockRejectedValue({ code: 'auth/invalid-api-key' });
    const fallback = await loginUser('demo@demo.com', 'pass');

    expect(fallback).toMatchObject({
      email: 'demo@demo.com',
      displayName: 'demo',
    });
    expect(localStorage.getItem('our_house_active_session')).toContain('"displayName":"demo"');
  });
});
