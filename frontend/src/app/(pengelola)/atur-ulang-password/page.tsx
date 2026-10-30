import type { Metadata } from 'next';
import { FormPemulihanPassword } from '@/components/form-pemulihan-password';
export const metadata: Metadata = {
  title: 'Atur Ulang Password Dosen/Staf',
  robots: { index: false, follow: false },
};
export default function AturUlangPassword() {
  return <FormPemulihanPassword mode="reset" />;
}
