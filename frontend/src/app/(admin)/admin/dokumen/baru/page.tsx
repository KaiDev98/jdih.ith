import { AdminDocumentCreate } from '@/components/admin-documents';

type Params = Promise<Record<string, string | string[] | undefined>>;
const id = (nilai: string | string[] | undefined) =>
  typeof nilai === 'string' && /^[1-9][0-9]{0,19}$/.test(nilai) ? nilai : undefined;

/**
 * Upload dokumen. `?mengubah=<id>` atau `?mencabut=<id>` (dari detail peraturan
 * lama) mengisi hubungan dengan peraturan tersebut sejak awal.
 */
export default async function Page({ searchParams }: { searchParams: Params }) {
  const p = await searchParams;
  const mencabut = id(p.mencabut);
  const mengubah = id(p.mengubah);
  return (
    <AdminDocumentCreate
      hubunganAwal={
        mencabut
          ? { jenis: 'MENCABUT', targetId: mencabut }
          : mengubah
            ? { jenis: 'MENGUBAH', targetId: mengubah }
            : undefined
      }
    />
  );
}
