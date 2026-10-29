'use client';

import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import type { ComponentProps } from 'react';
import { alamatPanel } from '@/lib/panel';
import { useSession } from '@/lib/sesi';

/** Tautan panel memakai namespace peran, termasuk setelah login dan pindah halaman. */
export default function TautanPanel({
  href, disabled, ...props
}: ComponentProps<typeof NextLink> & { disabled?: boolean }) {
  const { pengguna } = useSession();
  const peran = pengguna?.peran ?? [];
  if (disabled) return (
    <span role="link" aria-disabled="true" className={`${props.className ?? ''} cursor-not-allowed opacity-50`} title="Akses baca saja">
      {props.children}
    </span>
  );
  const tujuan = typeof href === 'string'
    ? alamatPanel(peran, href)
    : { ...href, pathname: href.pathname ? alamatPanel(peran, href.pathname) : href.pathname };
  return <NextLink {...props} href={tujuan} />;
}

export function useRouterPanel() {
  const router = useRouter();
  const { pengguna } = useSession();
  const peran = pengguna?.peran ?? [];
  return {
    ...router,
    push: (href: string, options?: Parameters<typeof router.push>[1]) =>
      router.push(alamatPanel(peran, href), options),
    replace: (href: string, options?: Parameters<typeof router.replace>[1]) =>
      router.replace(alamatPanel(peran, href), options),
  };
}
