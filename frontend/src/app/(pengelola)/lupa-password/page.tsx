import type { Metadata } from 'next';
import { FormPemulihanPassword } from '@/components/form-pemulihan-password';
export const metadata: Metadata = {
  title: 'Lupa Password Dosen/Staf',
  robots: { index: false, follow: false },
};
export default function LupaPassword() {
  return <FormPemulihanPassword mode="request" />;
}
