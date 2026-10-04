'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PenggunaAktif } from '@jdih/shared';
import { ambilApi, GalatApi } from './api-client';

type SesiHttp = { terautentikasi: false; perluRegistrasi: boolean; csrfToken: string | null } | {
  terautentikasi: true; pengguna: PenggunaAktif; csrfToken: string;
};
interface SesiState {
  state: 'loading' | 'anonymous' | 'registration' | 'authenticated' | 'error';
  pengguna?: PenggunaAktif;
  csrfToken: string | null;
  galat?: string;
  muatUlang: () => Promise<void>;
}
const KonteksSesi = createContext<SesiState | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SesiState['state']>('loading');
  const [pengguna, setPengguna] = useState<PenggunaAktif>();
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [galat, setGalat] = useState<string>();
  const muatUlang = useCallback(async () => {
    setState('loading');
    setGalat(undefined);
    try {
      const result = await ambilApi<SesiHttp>('/auth/me', { cache: 'no-store' });
      setCsrfToken(result.csrfToken);
      if (result.terautentikasi) {
        setPengguna(result.pengguna);
        setState('authenticated');
      } else {
        setPengguna(undefined);
        setState(result.perluRegistrasi ? 'registration' : 'anonymous');
      }
    } catch (error) {
      if (error instanceof GalatApi && (error.status === 401 || error.status === 403)) {
        setPengguna(undefined);
        setCsrfToken(null);
        setState('anonymous');
        return;
      }
      setGalat('Status akun belum dapat dimuat. Coba muat ulang halaman.');
      setState('error');
    }
  }, []);
  useEffect(() => {
    // Bootstrap is an external session synchronization and intentionally writes state after its request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void muatUlang();
  }, [muatUlang]);
  const value = useMemo(() => ({ state, pengguna, csrfToken, galat, muatUlang }), [state, pengguna, csrfToken, galat, muatUlang]);
  return <KonteksSesi.Provider value={value}>{children}</KonteksSesi.Provider>;
}

export function useSession() {
  const value = useContext(KonteksSesi);
  if (!value) throw new Error('useSession harus berada di dalam SessionProvider');
  return value;
}

export function csrfHeaders(token: string | null): Record<string, string> {
  return token ? { 'X-CSRF-Token': token } : {};
}
