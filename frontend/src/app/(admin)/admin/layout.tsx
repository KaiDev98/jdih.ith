import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin-shell';

export const metadata: Metadata = {
  title: { default: 'Panel Administrasi', template: '%s — Panel Administrasi JDIH ITH' },
  robots: { index: false, follow: false, nocache: true },
};

export default function TataLetakAdmin({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
