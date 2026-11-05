'use client';

import { Info } from 'lucide-react';
import type { PencabutanTemplate } from '@jdih/shared';
import { tanggalPanjang } from '@/lib/waktu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

export function KeteranganPencabutanFormat({ nama, pencabutan }: { nama: string; pencabutan: PencabutanTemplate }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" aria-label={`Keterangan pencabutan ${nama}`} className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg px-2 text-xs font-semibold text-red-700 outline-none hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-sky-300">
          <Info aria-hidden className="size-3.5" /> Keterangan
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Format Dicabut</DialogTitle>
          <DialogDescription className="[overflow-wrap:anywhere]">{nama}</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-slate-600">Sejak {tanggalPanjang(new Date(`${pencabutan.tanggal}T00:00:00+08:00`))}</p>
        <div tabIndex={0} className="max-h-[50dvh] overflow-y-auto overscroll-contain rounded-xl bg-red-50 p-4 text-sm leading-6 text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
          <p className="font-semibold">Alasan Pencabutan</p>
          <p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{pencabutan.alasan}</p>
        </div>
        <p className="text-xs leading-5 text-slate-500">Berkas tetap tersedia sebagai dokumentasi sesuai hak aksesnya.</p>
      </DialogContent>
    </Dialog>
  );
}
