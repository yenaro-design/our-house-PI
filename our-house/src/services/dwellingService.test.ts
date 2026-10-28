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
  obtenerIntegrantesVivienda,
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
});
