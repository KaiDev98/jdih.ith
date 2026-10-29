'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Mail,
  UserRound,
} from 'lucide-react';
import { skemaDaftarEmail, skemaLengkapiRegistrasi, type MuatanDaftarEmail } from '@jdih/shared';
import { ambilApi, GalatApi } from '@/lib/api-client';
import { useSession } from '@/lib/sesi';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { StateMessage } from '@/components/ui';
import { PemilihUnitRegistrasi } from './pemilih-unit-registrasi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Unit = { id: string; nama: string };

export function FormDaftarEmail({ onStepChange }: { onStepChange?: (step: number) => void } = {}) {
  const router = useRouter();
  const { muatUlang } = useSession();
  const [units, setUnits] = useState<Unit[]>([]);
  const [pilihanUnit, setPilihanUnit] = useState('');
  const unitManual = pilihanUnit === 'manual';
  const [konfirmasi, setKonfirmasi] = useState<MuatanDaftarEmail>();
  const [sibuk, setSibuk] = useState(false);
  const [selesai, setSelesai] = useState(false);
  const [galat, setGalat] = useState('');
  const [langkah, setLangkah] = useState(0);
  const [tampilPassword, setTampilPassword] = useState(false);
  const proses = useRef(false);
  const batal = useRef<HTMLButtonElement>(null);
  const {
    control,
    register,
    handleSubmit,
    reset,
    trigger,
    unregister,
    getValues,
    setError,
    clearErrors,
    setFocus,
    formState: { errors },
  } = useForm<MuatanDaftarEmail>({
    resolver: zodResolver(skemaDaftarEmail),
    shouldUnregister: false,
  });
  const judulLangkah = useRef<HTMLHeadingElement>(null);
  const langkahSebelumnya = useRef(langkah);
  useEffect(() => {
    onStepChange?.(langkah);
    if (langkahSebelumnya.current === langkah) return;
    langkahSebelumnya.current = langkah;
    judulLangkah.current?.focus({ preventScroll: true });
  }, [langkah, onStepChange]);

  async function lanjut() {
    if (langkah === 1) {
      const result = skemaLengkapiRegistrasi.safeParse({
        unitKerjaId: getValues('unitKerjaId'),
        unitManual: getValues('unitManual'),
      });
      if (!result.success) {
        const field = unitManual ? 'unitManual' : 'unitKerjaId';
        setError(field, { type: 'validate', message: 'Pilih unit kerja atau isi nama unit Anda.' });
        setFocus(field);
        return;
      }
      clearErrors(['unitKerjaId', 'unitManual']);
      setLangkah(2);
    } else if (await trigger(['nama', 'email'], { shouldFocus: true })) setLangkah(1);
  }

  useEffect(() => {
    let aktif = true;
    void ambilApi<Unit[]>('/public/units')
      .then((data) => {
        if (aktif) setUnits(data);
      })
      .catch(() => undefined);
    return () => {
      aktif = false;
    };
  }, []);

  async function kirim() {
    if (proses.current || !konfirmasi) return;
    proses.current = true;
    setSibuk(true);
    setGalat('');
    try {
      await ambilApi('/auth/register/email', { method: 'POST', muatan: konfirmasi });
      setSelesai(true);
      setKonfirmasi(undefined);
      reset();
      await muatUlang();
      router.replace('/akun');
    } catch (error) {
      setGalat(
        error instanceof GalatApi ? error.message : 'Pendaftaran belum dapat dikirim. Coba lagi.',
      );
    } finally {
      proses.current = false;
      setSibuk(false);
    }
  }

  if (selesai)
    return (
      <StateMessage title="Pendaftaran berhasil">
        Akun Anda menunggu verifikasi Superadmin. Anda dapat menjelajahi dokumen publik selama
        menunggu.
      </StateMessage>
    );

  return (
    <>
      <form
        noValidate
        onSubmit={(event) => {
          if (langkah < 2) {
            event.preventDefault();
            void lanjut();
            return;
          }
          void handleSubmit(
            (data) => {
              setGalat('');
              setKonfirmasi(data);
            },
            (invalid) => {
              if (invalid.nama || invalid.email) setLangkah(0);
              else if (invalid.unitKerjaId || invalid.unitManual || invalid.root) setLangkah(1);
            },
          )(event);
        }}
        className="auth-register-form"
        data-step={langkah}
      >
        <ol className="auth-steps" aria-label="Langkah pendaftaran">
          {['Identitas', 'Unit kerja', 'Keamanan'].map((label, index) => (
            <li
              key={label}
              aria-current={index === langkah ? 'step' : undefined}
              data-done={index < langkah}
            >
              <span aria-hidden>
                {index < langkah ? <Check className="size-3" /> : `0${index + 1}`}
              </span>
              {label}
            </li>
          ))}
        </ol>
        <h2 ref={judulLangkah} tabIndex={-1} className="auth-step-heading">
          {['Perkenalkan diri Anda', 'Tentukan unit kerja', 'Amankan akun Anda'][langkah]}
        </h2>
        <div className="auth-fields">
          {(
            [
              { name: 'nama', label: 'Nama lengkap', type: 'text', autoComplete: 'name' },
              { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
              {
                name: 'password',
                label: 'Password',
                type: 'password',
                autoComplete: 'new-password',
              },
              {
                name: 'konfirmasiPassword',
                label: 'Konfirmasi password',
                type: 'password',
                autoComplete: 'new-password',
              },
            ] as const
          )
            .filter((field) =>
              langkah === 0
                ? field.name === 'nama' || field.name === 'email'
                : langkah === 2 &&
                  (field.name === 'password' || field.name === 'konfirmasiPassword'),
            )
            .map((field) => (
              <div key={field.name} className="auth-field">
                <Label htmlFor={`daftar-${field.name}`}>
                  {field.name === 'nama' ? (
                    <UserRound size={13} aria-hidden />
                  ) : field.name === 'email' ? (
                    <Mail size={13} aria-hidden />
                  ) : (
                    <KeyRound size={13} aria-hidden />
                  )}
                  {field.label}
                </Label>
                <div className="relative">
                  <Input
                    id={`daftar-${field.name}`}
                    type={field.type === 'password' && tampilPassword ? 'text' : field.type}
                    className={field.type === 'password' ? 'pr-12' : ''}
                    autoComplete={field.autoComplete}
                    placeholder={
                      field.name === 'nama'
                        ? 'Nama sesuai identitas Anda'
                        : field.name === 'email'
                          ? 'nama@contoh.com'
                          : field.name === 'password'
                            ? 'Buat password Anda'
                            : 'Ulangi password Anda'
                    }
                    maxLength={field.name === 'nama' ? 200 : field.name === 'email' ? 254 : 128}
                    aria-invalid={!!errors[field.name]}
                    aria-describedby={
                      errors[field.name]
                        ? `galat-${field.name}`
                        : field.name === 'password'
                          ? 'petunjuk-password'
                          : undefined
                    }
                    {...register(field.name)}
                  />
                  {field.type === 'password' && (
                    <button
                      type="button"
                      aria-label={`${tampilPassword ? 'Sembunyikan' : 'Tampilkan'} ${field.name === 'password' ? 'password' : 'konfirmasi password'}`}
                      aria-pressed={tampilPassword}
                      aria-controls={`daftar-${field.name}`}
                      className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-lg text-slate-400 hover:text-slate-700"
                      onClick={() => setTampilPassword((x) => !x)}
                    >
                      {tampilPassword ? (
                        <EyeOff className="size-4" aria-hidden />
                      ) : (
                        <Eye className="size-4" aria-hidden />
                      )}
                    </button>
                  )}
                </div>
                {field.name === 'password' && (
                  <p id="petunjuk-password" className="text-[0.65rem] text-slate-500">
                    Minimal 10 karakter, memuat huruf dan angka.
                  </p>
                )}
                {errors[field.name] && (
                  <p id={`galat-${field.name}`} role="alert" className="text-xs text-red-700">
                    {errors[field.name]?.message}
                  </p>
                )}
              </div>
            ))}
          {langkah === 1 && (
            <>
              <div className="auth-field">
                <Label htmlFor="daftar-unit">Unit kerja</Label>
                <Controller
                  name="unitKerjaId"
                  control={control}
                  render={({ field }) => (
                    <PemilihUnitRegistrasi
                      id="daftar-unit"
                      value={pilihanUnit}
                      units={units}
                      buttonRef={field.ref}
                      onBlur={field.onBlur}
                      invalid={!!errors.unitKerjaId}
                      describedBy={errors.unitKerjaId ? 'galat-unit-kerja' : undefined}
                      onValueChange={(value) => {
                        setPilihanUnit(value);
                        field.onChange(value === 'manual' ? undefined : value);
                        if (value !== 'manual') unregister('unitManual');
                        clearErrors(['unitKerjaId', 'unitManual']);
                      }}
                    />
                  )}
                />
              </div>
              {unitManual && (
                <div className="auth-field">
                  <Label htmlFor="daftar-unit-manual">Nama unit kerja</Label>
                  <Input id="daftar-unit-manual" maxLength={200} {...register('unitManual')} />
                  {errors.unitManual && (
                    <p role="alert" className="auth-error">
                      {errors.unitManual.message}
                    </p>
                  )}
                </div>
              )}
              {errors.unitKerjaId && (
                <p id="galat-unit-kerja" role="alert" className="auth-error">
                  Pilih unit kerja atau usulkan unit Anda.
                </p>
              )}
            </>
          )}
          {Object.keys(errors).length > 0 && (
            <p role="alert" className="sr-only">
              Periksa isian formulir dan pilih unit kerja atau isi nama unit Anda.
            </p>
          )}
          <div className="auth-step-actions">
            {langkah > 0 && (
              <button
                type="button"
                className="auth-step-back"
                aria-label="Langkah sebelumnya"
                onClick={() => setLangkah((x) => x - 1)}
              >
                <ArrowLeft size={16} aria-hidden />
              </button>
            )}
            <Button type="submit" size="lg" className="auth-primary">
              {langkah < 2 ? (
                <>
                  Lanjutkan <ArrowRight size={15} className="auth-submit-arrow" aria-hidden />
                </>
              ) : (
                <>
                  Daftar akun <ArrowRight size={15} className="auth-submit-arrow" aria-hidden />
                </>
              )}
            </Button>
          </div>
        </div>
        <p className="auth-policy auth-secondary">
          Akun Dosen/Staf memerlukan verifikasi Superadmin untuk akses internal.
        </p>
      </form>
      <Dialog
        open={!!konfirmasi}
        onOpenChange={(open) => {
          if (!open && !proses.current) setKonfirmasi(undefined);
        }}
      >
        <DialogContent
          closeDisabled={sibuk}
          aria-busy={sibuk}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            batal.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Kirim pendaftaran akun?</DialogTitle>
            <DialogDescription>
              Data Anda akan dikirim untuk verifikasi Superadmin. Akses internal tersedia setelah
              akun disetujui.
            </DialogDescription>
          </DialogHeader>
          <dl className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm [overflow-wrap:anywhere]">
            {[
              ['Nama', konfirmasi?.nama],
              ['Email', konfirmasi?.email],
              [
                'Unit kerja',
                konfirmasi?.unitManual ||
                  units.find((unit) => unit.id === konfirmasi?.unitKerjaId)?.nama,
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="mb-1 text-xs text-slate-500">{label}</dt>
                <dd className="font-medium text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
          {galat && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {galat}
            </p>
          )}
          <DialogFooter>
            <Button
              ref={batal}
              type="button"
              variant="outline"
              disabled={sibuk}
              onClick={() => setKonfirmasi(undefined)}
            >
              Batal
            </Button>
            <Button type="button" disabled={sibuk} onClick={() => void kirim()}>
              {sibuk && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
              {sibuk ? 'Mengirim…' : 'Ya, daftar akun'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
