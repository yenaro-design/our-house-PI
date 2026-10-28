import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestore = vi.hoisted(() => ({ doc: vi.fn(), getDoc: vi.fn(), setDoc: vi.fn() }));
const profiles = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), create: vi.fn() }));

vi.mock('firebase/firestore', () => firestore);
vi.mock('../firebase/config', () => ({
  db: {}, isFirebasePersistenceAvailable: vi.fn(() => false),
}));
vi.mock('./userService', () => ({
  getLocalProfile: profiles.get, setLocalProfile: profiles.set, createDefaultProfile: profiles.create,
}));

import { guardarIngresoMensual, obtenerIngresoMensual } from './ingresoService';

describe('ingresoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profiles.create.mockReturnValue({ id: 'u-1', nombre: 'Ana', email: 'a@a.co', ingresoMensual: 0 });
    profiles.get.mockReturnValue(null);
  });

  it('valida ingresos positivos y persiste el perfil local', async () => {
    await expect(guardarIngresoMensual( 'u-1', 0)).rejects.toThrow('mayor a cero');
    await expect(guardarIngresoMensual('u-1', 2500000)).resolves.toBeUndefined();
    expect(profiles.create).toHaveBeenCalledWith('u-1');
    expect(profiles.set).toHaveBeenCalledWith('u-1', expect.objectContaining({ ingresoMensual: 2500000 }));
    expect(firestore.setDoc).not.toHaveBeenCalled();
  });

  it('consulta Firestore y cae al perfil local si no existe o falla', async () => {
    firestore.doc.mockReturnValue('user-ref');
    firestore.getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ ingresoMensual: 3200 }) });
    await expect(obtenerIngresoMensual('u-1')).resolves.toBe(3200);
    firestore.getDoc.mockRejectedValueOnce(new Error('offline'));
    profiles.get.mockReturnValue({ ingresoMensual: 1800 });
    await expect(obtenerIngresoMensual('u-1')).resolves.toBe(1800);
    firestore.getDoc.mockResolvedValueOnce({ exists: () => false });
    await expect(obtenerIngresoMensual('u-1')).resolves.toBe(1800);
  });
});
