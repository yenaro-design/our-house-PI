import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  arrayUnionMock,
  collectionMock,
  docMock,
  getDocMock,
  getDocsMock,
  isFirebasePersistenceAvailableMock,
  queryMock,
  setDocMock,
  setUserDwellingMock,
  updateDocMock,
  whereMock,
  getUsersByIdsMock,
} = vi.hoisted(() => ({
  arrayUnionMock: vi.fn((...values: unknown[]) => ({ values })),
  collectionMock: vi.fn(() => 'collection-ref'),
  docMock: vi.fn((...args: unknown[]) => args.join(':')),
  getDocMock: vi.fn(),
  getDocsMock: vi.fn(),
  isFirebasePersistenceAvailableMock: vi.fn(() => true),
  queryMock: vi.fn(() => 'query-ref'),
  setDocMock: vi.fn(),
  setUserDwellingMock: vi.fn(),
  updateDocMock: vi.fn(),
  whereMock: vi.fn(() => 'where-ref'),
  getUsersByIdsMock: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  arrayUnion: arrayUnionMock,
  arrayRemove: vi.fn(),
  collection: collectionMock,
  doc: docMock,
  getDoc: getDocMock,
  getDocs: getDocsMock,
  query: queryMock,
  setDoc: setDocMock,
  updateDoc: updateDocMock,
  where: whereMock,
}));

vi.mock('../firebase/config', () => ({
  db: {},
  isFirebasePersistenceAvailable: isFirebasePersistenceAvailableMock,
}));

vi.mock('./userService', () => ({
  getUsersByIds: getUsersByIdsMock,
  setUserDwelling: setUserDwellingMock,
}));

import {
  buscarViviendaPorCodigo,
  crearVivienda,
  obtenerViviendaPorId,
  obtenerIntegrantesVivienda,
  retirarIntegrante,
  abandonarVivienda,
  unirseAVivienda,
} from './dwellingService';

describe('dwellingService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    isFirebasePersistenceAvailableMock.mockReturnValue(true);
  });

  it('crea una vivienda con código de invitación y la asocia al usuario', async () => {
    const vivienda = await crearVivienda({ nombre: 'Casa Costa', direccion: 'Calle 9' }, 'user-1');

    expect(vivienda).toMatchObject({
      nombre: 'Casa Costa',
      direccion: 'Calle 9',
      administradorId: 'user-1',
      integrantes: ['user-1'],
    });
    expect(vivienda.codigoInvitacion).toHaveLength(6);
    expect(setDocMock).toHaveBeenCalledTimes(1);
    expect(setUserDwellingMock).toHaveBeenCalledWith('user-1', expect.stringContaining('vivienda-'));
  });

  it('busca una vivienda por su código de invitación en Firestore', async () => {
    getDocsMock.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'vivienda-77',
          data: () => ({
            nombre: 'Residencia',
            direccion: 'Avenida Siempre Viva',
            codigoInvitacion: 'ABC123',
            administradorId: 'admin-1',
            integrantes: ['admin-1', 'user-2'],
            creadoEn: '2026-10-01',
          }),
        },
      ],
    });

    const vivienda = await buscarViviendaPorCodigo('abc123');

    expect(vivienda).toMatchObject({
      id: 'vivienda-77',
      nombre: 'Residencia',
      codigoInvitacion: 'ABC123',
      administradorId: 'admin-1',
      integrantes: ['admin-1', 'user-2'],
    });
  });

  it('añade un usuario a una vivienda y actualiza el perfil local del integrante', async () => {
    const payload = [{ id: 'vivienda-1', nombre: 'Casa', direccion: 'Calle 1', codigoInvitacion: 'X9Y2Q1', administradorId: 'admin-1', integrantes: ['admin-1'], creadoEn: '2026-10-03' }];
    localStorage.setItem('our_house_dwellings', JSON.stringify(payload));

    await unirseAVivienda('vivienda-1', 'user-2');

    expect(updateDocMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        integrantes: expect.any(Object),
      })
    );
    expect(setUserDwellingMock).toHaveBeenCalledWith('user-2', 'vivienda-1');

    const stored = JSON.parse(localStorage.getItem('our_house_dwellings') || '[]');
    expect(stored[0].integrantes).toContain('user-2');
  });

  it('obtiene los integrantes de una vivienda a partir de la lista de ids', async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({
        nombre: 'Casa',
        direccion: 'Calle 4',
        codigoInvitacion: 'QWERTY',
        administradorId: 'admin-1',
        integrantes: ['user-1', 'user-2'],
        creadoEn: '2026-10-05',
      }),
    });

    getUsersByIdsMock.mockResolvedValue([
      { id: 'user-1', nombre: 'Ana', email: 'ana@demo.com', ingresoMensual: 2000 },
      { id: 'user-2', nombre: 'Luis', email: 'luis@demo.com', ingresoMensual: 3000 },
    ]);

    const integrantes = await obtenerIntegrantesVivienda('vivienda-2');

    expect(getUsersByIdsMock).toHaveBeenCalledWith(['user-1', 'user-2']);
    expect(integrantes).toHaveLength(2);
    expect(integrantes.map((user) => user.id)).toEqual(['user-1', 'user-2']);
  });

  it('valida creación y usa fallback local para búsquedas y consultas', async () => {
    await expect(crearVivienda({ nombre: ' ', direccion: 'Calle' }, 'u')).rejects.toThrow('obligatorios');
    localStorage.setItem('our_house_dwellings', JSON.stringify([{ id: 'v-1', nombre: 'Casa', direccion: 'Calle', codigoInvitacion: 'ABC123', administradorId: 'u', integrantes: ['u'], creadoEn: 'hoy' }]));
    expect(await buscarViviendaPorCodigo('')).toBeNull();
    getDocsMock.mockRejectedValueOnce(new Error('offline'));
    expect(await buscarViviendaPorCodigo(' abc123 ')).toMatchObject({ id: 'v-1' });
    getDocMock.mockRejectedValueOnce(new Error('offline'));
    expect(await obtenerViviendaPorId('v-1')).toMatchObject({ id: 'v-1' });
    expect(await obtenerViviendaPorId('')).toBeNull();
    getDocMock.mockResolvedValueOnce({ exists: () => false });
    expect(await obtenerIntegrantesVivienda('missing')).toEqual([]);
  });

  it('evita duplicar integrantes y valida parámetros de vinculación', async () => {
    localStorage.setItem('our_house_dwellings', JSON.stringify([{ id: 'v-1', nombre: 'Casa', direccion: 'Calle', codigoInvitacion: 'ABC123', administradorId: 'u', integrantes: ['u'], creadoEn: 'hoy' }]));
    await expect(unirseAVivienda('', 'u')).rejects.toThrow('Parámetros');
    await unirseAVivienda('v-1', 'u');
    expect(setUserDwellingMock).toHaveBeenCalledWith('u', 'v-1');
    expect(JSON.parse(localStorage.getItem('our_house_dwellings')!)[0].integrantes).toEqual(['u']);
  });

  it('retira integrantes con saldo cero y bloquea casos no permitidos', async () => {
    const dwelling = { id: 'v-1', nombre: 'Casa', direccion: 'Calle', codigoInvitacion: 'ABC123', administradorId: 'admin', integrantes: ['admin', 'member'], creadoEn: 'hoy' };
    localStorage.setItem('our_house_dwellings', JSON.stringify([dwelling]));
    getDocMock.mockResolvedValue({ exists: () => true, data: () => dwelling });
    await expect(retirarIntegrante('v-1', 'wrong', 'member', 0)).rejects.toThrow('administrador');
    await expect(retirarIntegrante('v-1', 'admin', 'admin', 0)).rejects.toThrow('sí mismo');
    await expect(retirarIntegrante('v-1', 'admin', 'member', 10)).rejects.toThrow('saldo');
    await expect(retirarIntegrante('v-1', 'admin', 'member', 0)).resolves.toMatchObject({ success: true });
    expect(setUserDwellingMock).toHaveBeenCalledWith('member', null);
    updateDocMock.mockRejectedValueOnce(new Error('offline'));
    await expect(retirarIntegrante('v-1', 'admin', 'member', 0)).resolves.toMatchObject({ success: true });
  });

  it('abandona vivienda validando saldo y tareas, y reasigna administrador', async () => {
    const dwelling = { id: 'v-2', nombre: 'Casa', direccion: 'Calle', codigoInvitacion: 'XYZ789', administradorId: 'admin', integrantes: ['admin', 'member', 'other'], creadoEn: 'hoy' };
    localStorage.setItem('our_house_dwellings', JSON.stringify([dwelling]));
    getDocMock.mockResolvedValue({ exists: () => true, data: () => dwelling });
    await expect(abandonarVivienda('v-2', 'admin', 1, 0)).rejects.toThrow('saldo');
    await expect(abandonarVivienda('v-2', 'admin', 0, 2, ['A', 'B'])).rejects.toThrow('tarea');
    await expect(abandonarVivienda('v-2', 'admin', 0, 0)).resolves.toMatchObject({ success: true });
    expect(JSON.parse(localStorage.getItem('our_house_dwellings')!)[0].administradorId).toBe('member');
    updateDocMock.mockRejectedValueOnce(new Error('offline'));
    await expect(abandonarVivienda('v-2', 'member', 0, 0)).resolves.toMatchObject({ success: true });
  });
});
