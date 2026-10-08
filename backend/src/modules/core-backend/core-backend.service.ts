/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-optional-chain */
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import type { PenggunaAktif } from '@jdih/shared';
import {
  skemaBuatDokumen,
  skemaUbahDokumen,
  skemaBuatVersiDokumen,
  skemaUbahVersiDokumen,
  skemaBuatRelasi,
  skemaKesiapanPublikasi,
  skemaTerbitkanDokumen,
  skemaTarikDokumen,
  skemaStatusMaster,
  skemaUnitKerja,
  skemaJenisDokumen,
  skemaKategori,
  skemaTag,
  skemaDetailDokumenPublik,
  skemaDetailDokumenAuthorized,
  skemaHalaman,
  skemaKataKunci,
} from '@jdih/shared';
import { cekIzin } from '../identity/security.js';
import { AuditService } from '../identity/audit.service.js';
import { DocumentPolicyService } from '../identity/document-policy.service.js';
import { utc } from '../identity/identity.repository.js';
import { CoreBackendRepository } from './core-backend.repository.js';
import type { KonfigurasiApp } from '../../config/configuration.js';
import { DocumentFilesService } from './files/document-files.service.js';
import { z } from 'zod';
import type { RowDataPacket } from 'mysql2/promise';

type Actor = PenggunaAktif;
interface MasterPayload {
  kode?: string;
  nama: string;
  parentId?: string | null;
  aktif?: boolean;
  urutan?: number;
}
const tr = (e: unknown): never => {
  if ((e as { code?: string })?.code === 'ER_DUP_ENTRY')
    throw new ConflictException('Data sudah digunakan.');
  throw e;
};
@Injectable()
export class CoreBackendService {
  constructor(
    private readonly repo: CoreBackendRepository,
    private readonly audit: AuditService,
    private readonly config: ConfigService<KonfigurasiApp, true>,
    private readonly policy: DocumentPolicyService,
    private readonly files: DocumentFilesService,
  ) {}
  private allow(actor: Actor, permission: Parameters<typeof cekIzin>[1][number]) {
    cekIzin(actor, [permission]);
  }
  private cfgKey() {
    return this.config.get('identitas', { infer: true }).key;
  }

  private async halaman<T extends RowDataPacket>(
    rowsSql: string,
    countSql: string,
    values: (string | number)[],
    halaman: number,
    perHalaman: number,
  ) {
    const count = (await this.repo.rows(this.repo.pool, countSql, values))[0] as any;
    const totalButir = Number(count?.total ?? 0);
    const offset = (halaman - 1) * perHalaman;
    const data = await this.repo.rows<T>(this.repo.pool, rowsSql, [
      ...values,
      perHalaman,
      offset,
    ]);
    const totalHalaman = Math.ceil(totalButir / perHalaman);
    // Sudah berbentuk tanggapan baku (`sukses`), agar BungkusTanggapanInterceptor
    // tidak membungkusnya lagi; `meta` harus berada di tingkat atas.
    return {
      sukses: true as const,
      data,
      meta: {
        halaman,
        perHalaman,
        totalButir,
        totalHalaman,
        adaSebelumnya: halaman > 1,
        adaBerikutnya: halaman < totalHalaman,
      },
    };
  }

  async adminDocuments(actor: Actor, rawQuery: unknown, verificationOnly = false) {
    if (verificationOnly)
      cekIzin(actor, ['workflow.approve', 'workflow.return', 'documents.read_admin'], true);
    else this.allow(actor, 'documents.read_admin');
    const query = z
      .strictObject({
        halaman: skemaHalaman.shape.halaman,
        perHalaman: skemaHalaman.shape.perHalaman,
        q: skemaKataKunci,
        statusWorkflow: z
          .enum(['DRAF', 'DIAJUKAN', 'REVISI', 'DISETUJUI', 'TERBIT', 'DITARIK'])
          .optional(),
      })
      .parse(rawQuery);
    const where = ['d.deleted_at IS NULL'];
    const values: (string | number)[] = [];
    if (verificationOnly) where.push("v.status_workflow='DIAJUKAN'");
    else if (query.statusWorkflow) {
      where.push('v.status_workflow=?');
      values.push(query.statusWorkflow);
    }
    if (query.q) {
      where.push("(v.judul LIKE ? ESCAPE '!' OR v.nomor LIKE ? ESCAPE '!' OR d.slug LIKE ? ESCAPE '!')");
      const pattern = `%${query.q.replaceAll('!', '!!').replaceAll('%', '!%').replaceAll('_', '!_')}%`;
      values.push(pattern, pattern, pattern);
    }
    const from = `FROM dokumen d JOIN dokumen_versi v ON v.dokumen_id=d.id JOIN jenis_dokumen j ON j.id=d.jenis_dokumen_id WHERE ${where.join(' AND ')}`;
    return this.halaman(
      `SELECT CAST(d.id AS CHAR) id,CAST(v.id AS CHAR) versionId,d.slug,CAST(d.jenis_dokumen_id AS CHAR) jenisDokumenId,j.nama tipe,v.judul,v.nomor,v.tahun,v.tingkat_akses tingkatAkses,v.status_workflow statusWorkflow,d.status_hukum statusHukum,v.published_at publishedAt ${from} ORDER BY v.updated_at DESC,v.id DESC LIMIT ? OFFSET ?`,
      `SELECT COUNT(*) total ${from}`,
      values,
      query.halaman,
      query.perHalaman,
    );
  }

  async auditList(actor: Actor, rawQuery: unknown) {
    this.allow(actor, 'audit.read');
    const query = z
      .strictObject({
        halaman: skemaHalaman.shape.halaman,
        perHalaman: skemaHalaman.shape.perHalaman,
        module: z.string().trim().min(1).max(64).optional(),
        action: z.string().trim().min(1).max(100).optional(),
      })
      .parse(rawQuery);
    const where: string[] = [];
    const values: string[] = [];
    if (query.module) { where.push('a.module=?'); values.push(query.module); }
    if (query.action) { where.push('a.action=?'); values.push(query.action); }
    const clause = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    return this.halaman(
      `SELECT CAST(a.id AS CHAR) id,COALESCE(p.nama,'Sistem') actor,a.module,a.action,a.entity_type entityType,CAST(a.entity_id AS CHAR) entityId,a.created_at createdAt FROM audit_log a LEFT JOIN pengguna p ON p.id=a.actor_id${clause} ORDER BY a.created_at DESC,a.id DESC LIMIT ? OFFSET ?`,
      `SELECT COUNT(*) total FROM audit_log a${clause}`,
      values,
      query.halaman,
      query.perHalaman,
    );
  }

  async publicMaster(table: 'jenis_dokumen' | 'kategori' | 'unit_kerja') {
    const sql = {
      jenis_dokumen: 'SELECT CAST(id AS CHAR) id,kode,nama FROM jenis_dokumen WHERE aktif=1 ORDER BY urutan,nama',
      kategori: 'SELECT CAST(id AS CHAR) id,kode,nama FROM kategori WHERE aktif=1 ORDER BY nama',
      unit_kerja: 'SELECT CAST(id AS CHAR) id,nama FROM unit_kerja WHERE aktif=1 AND deleted_at IS NULL ORDER BY nama',
    } as const;
    if (!Object.hasOwn(sql, table)) throw new NotFoundException();
    return this.repo.rows(this.repo.pool, sql[table]);
  }

  async masterList(actor: Actor, table: 'unit_kerja' | 'jenis_dokumen' | 'kategori' | 'tag') {
    if (!['unit_kerja', 'jenis_dokumen', 'kategori', 'tag'].includes(table))
      throw new NotFoundException();
    this.allow(actor, table === 'unit_kerja' ? 'units.manage' : 'master.manage');
    const sql: Record<typeof table, string> = {
      unit_kerja:
        'SELECT CAST(id AS CHAR) id,CAST(parent_id AS CHAR) parentId,kode,nama,aktif FROM unit_kerja WHERE deleted_at IS NULL ORDER BY nama',
      jenis_dokumen:
        'SELECT CAST(id AS CHAR) id,kode,nama,urutan,aktif FROM jenis_dokumen ORDER BY urutan,nama',
      kategori: 'SELECT CAST(id AS CHAR) id,kode,nama,aktif FROM kategori ORDER BY nama',
      tag: 'SELECT CAST(id AS CHAR) id,nama FROM tag ORDER BY nama',
    };
    return this.repo.rows(this.repo.pool, sql[table]);
  }
  async masterDetail(
    actor: Actor,
    table: 'unit_kerja' | 'jenis_dokumen' | 'kategori' | 'tag',
    id: string,
  ) {
    if (!['unit_kerja', 'jenis_dokumen', 'kategori', 'tag'].includes(table))
      throw new NotFoundException();
    this.allow(actor, table === 'unit_kerja' ? 'units.manage' : 'master.manage');
    const row = (
      await this.repo.rows(
        this.repo.pool,
        `SELECT * FROM ${table} WHERE id=?${table === 'unit_kerja' ? ' AND deleted_at IS NULL' : ''}`,
        [id],
      )
    )[0];
    if (!row) throw new NotFoundException();
    return row;
  }
  async masterSave(
    actor: Actor,
    table: 'unit_kerja' | 'jenis_dokumen' | 'kategori' | 'tag',
    id: string | null,
    input: any,
  ) {
    if (!['unit_kerja', 'jenis_dokumen', 'kategori', 'tag'].includes(table))
      throw new NotFoundException();
    this.allow(actor, table === 'unit_kerja' ? 'units.manage' : 'master.manage');
    const b = (
      table === 'unit_kerja'
        ? skemaUnitKerja.parse(input)
        : table === 'jenis_dokumen'
          ? skemaJenisDokumen.parse(input)
          : table === 'kategori'
            ? skemaKategori.parse(input)
            : skemaTag.parse(input)
    ) as MasterPayload;
    return this.repo
      .transaction(async (db) => {
        let before: Record<string, unknown> | undefined;
        if (id) {
          before = (
            await this.repo.rows(db, `SELECT * FROM ${table} WHERE id=? FOR UPDATE`, [id])
          )[0] as any;
          if (!before) throw new NotFoundException();
        }
        if (table === 'unit_kerja') {
          if (id)
            await this.repo.write(
              db,
              'UPDATE unit_kerja SET kode=?,nama=?,parent_id=?,aktif=?,deleted_at=IF(?,NULL,deleted_at) WHERE id=?',
              [b.kode, b.nama, b.parentId ?? null, b.aktif ?? true, b.aktif === true, id],
            );
          else
            await this.repo.write(
              db,
              'INSERT INTO unit_kerja(kode,nama,parent_id,aktif) VALUES(?,?,?,?)',
              [b.kode, b.nama, b.parentId ?? null, b.aktif ?? true],
            );
        } else if (table === 'jenis_dokumen') {
          if (id)
            await this.repo.write(
              db,
              'UPDATE jenis_dokumen SET kode=?,nama=?,urutan=?,aktif=? WHERE id=?',
              [b.kode, b.nama, b.urutan ?? 0, b.aktif ?? true, id],
            );
          else
            await this.repo.write(
              db,
              'INSERT INTO jenis_dokumen(kode,nama,urutan,aktif) VALUES(?,?,?,?)',
              [b.kode, b.nama, b.urutan ?? 0, b.aktif ?? true],
            );
        } else if (table === 'kategori') {
          if (id)
            await this.repo.write(db, 'UPDATE kategori SET kode=?,nama=?,aktif=? WHERE id=?', [
              b.kode,
              b.nama,
              b.aktif ?? true,
              id,
            ]);
          else
            await this.repo.write(db, 'INSERT INTO kategori(kode,nama,aktif) VALUES(?,?,?)', [
              b.kode,
              b.nama,
              b.aktif ?? true,
            ]);
        } else {
          if (id) await this.repo.write(db, 'UPDATE tag SET nama=? WHERE id=?', [b.nama, id]);
          else await this.repo.write(db, 'INSERT INTO tag(nama) VALUES(?)', [b.nama]);
        }
        const entityId = id ?? (await this.repo.id(db));
        await this.audit.recordDomain(
          {
            module: 'master',
            action: id ? 'UPDATE' : 'CREATE',
            entityType: table,
            entityId,
            actorId: actor.id,
            before: before as any,
            after: { ...b },
          },
          db,
        );
        return { id: entityId, ...b };
      })
      .catch(tr);
  }
  async masterStatus(
    actor: Actor,
    table: 'unit_kerja' | 'jenis_dokumen' | 'kategori',
    id: string,
    raw: unknown,
  ) {
    if (!['unit_kerja', 'jenis_dokumen', 'kategori'].includes(table)) throw new NotFoundException();
    this.allow(actor, table === 'unit_kerja' ? 'units.manage' : 'master.manage');
    const { aktif } = skemaStatusMaster.parse(raw);
    return this.repo.transaction(async (db) => {
      const row = (
        await this.repo.rows(db, `SELECT id,aktif FROM ${table} WHERE id=? FOR UPDATE`, [id])
      )[0] as any;
      if (!row) throw new NotFoundException();
      await this.repo.write(
        db,
        `UPDATE ${table} SET aktif=?${table === 'unit_kerja' ? ' ,deleted_at=IF(?,NULL,IF(?=0,UTC_TIMESTAMP(6),deleted_at))' : ''} WHERE id=?`,
        table === 'unit_kerja' ? [aktif, aktif, aktif, id] : [aktif, id],
      );
      await this.audit.recordDomain(
        {
          module: 'master',
          action: aktif ? 'ACTIVATE' : 'DEACTIVATE',
          entityType: table,
          entityId: id,
          actorId: actor.id,
          before: { status: row.aktif ? 'aktif' : 'nonaktif' },
          after: { status: aktif ? 'aktif' : 'nonaktif' },
        },
        db,
      );
      return { id, aktif };
    });
  }

  async createDocument(actor: Actor, raw: unknown) {
    this.allow(actor, 'documents.create');
    const b = skemaBuatDokumen.parse(raw);
    const v = b.versi;
    return this.repo
      .transaction(async (db) => {
        if (
          !(
            await this.repo.rows(
              db,
              'SELECT id FROM jenis_dokumen WHERE id=? AND aktif=1 FOR SHARE',
              [b.jenisDokumenId],
            )
          ).length
        )
          throw new NotFoundException('Jenis dokumen aktif tidak ditemukan');
        await this.repo.write(
          db,
          'INSERT INTO dokumen(kode_dokumen,slug,jenis_dokumen_id,created_by) VALUES(?,?,?,?)',
          [b.kodeDokumen, b.slug, b.jenisDokumenId, actor.id],
        );
        const did = await this.repo.id(db);
        const vid = await this.insertVersion(db, did, 1, v, actor.id);
        await this.bindTerms(db, vid, v.kategoriId ?? [], v.tagId ?? []);
        await this.repo.write(
          db,
          "INSERT INTO dokumen_workflow(dokumen_versi_id,status_asal,status_tujuan,action,actor_id) VALUES(?,NULL,'DRAF','CREATE',?)",
          [vid, actor.id],
        );
        await this.audit.recordDomain(
          {
            module: 'documents',
            action: 'CREATE',
            entityType: 'dokumen',
            entityId: did,
            actorId: actor.id,
            after: { slug: b.slug },
          },
          db,
        );
        await this.audit.recordDomain(
          {
            module: 'documents',
            action: 'CREATE_VERSION',
            entityType: 'dokumen_versi',
            entityId: vid,
            actorId: actor.id,
            after: { status: 'DRAF', nomorVersi: 1, judul: v.judul },
          },
          db,
        );
        return { id: did, versionId: vid, nomorVersi: 1, statusWorkflow: 'DRAF' };
      })
      .catch(tr);
  }
  private async insertVersion(db: any, did: string, n: number, v: any, actor: string) {
    if (
      v.unitKerjaId &&
      !(
        await this.repo.rows(
          db,
          'SELECT id FROM unit_kerja WHERE id=? AND aktif=1 AND deleted_at IS NULL FOR SHARE',
          [v.unitKerjaId],
        )
      ).length
    )
      throw new NotFoundException('Unit kerja aktif tidak ditemukan');
    await this.repo.write(
      db,
      "INSERT INTO dokumen_versi(dokumen_id,nomor_versi,status_workflow,tingkat_akses,nomor,tahun,judul,deskripsi,pic,unit_kerja_id,tanggal_penetapan,created_by) VALUES(?,?,'DRAF',?,?,?,?,?,?,?,?,?)",
      [
        did,
        n,
        v.tingkatAkses,
        v.nomor ?? null,
        v.tahun ?? null,
        v.judul,
        v.deskripsi ?? null,
        v.pic ?? null,
        v.unitKerjaId ?? null,
        v.tanggalPenetapan ?? null,
        actor,
      ],
    );
    return this.repo.id(db);
  }
  private async bindTerms(db: any, vid: string, cats: string[], tags: string[]) {
    for (const id of [...new Set(cats)]) {
      const active = await this.repo.rows(db, 'SELECT id FROM kategori WHERE id=? AND aktif=1', [
        id,
      ]);
      if (!active.length) throw new NotFoundException('Kategori aktif tidak ditemukan');
      await this.repo.write(db, 'INSERT INTO dokumen_versi_kategori VALUES(?,?)', [vid, id]);
    }
    for (const id of [...new Set(tags)]) {
      const found = await this.repo.rows(db, 'SELECT id FROM tag WHERE id=?', [id]);
      if (!found.length) throw new NotFoundException('Tag tidak ditemukan');
      await this.repo.write(db, 'INSERT INTO dokumen_versi_tag VALUES(?,?)', [vid, id]);
    }
  }
  async document(actor: Actor, id: string, requestedVersionId?: string) {
    this.allow(actor, 'documents.read_admin');
    const rows = await this.repo.rows(
      this.repo.pool,
      'SELECT CAST(d.id AS CHAR) id,d.kode_dokumen kodeDokumen,d.slug,CAST(d.jenis_dokumen_id AS CHAR) jenisDokumenId,d.status_hukum statusHukum,CAST(d.current_published_version_id AS CHAR) currentPublishedVersionId,CAST(v.id AS CHAR) versionId,v.nomor_versi nomorVersi,v.status_workflow statusWorkflow,v.tingkat_akses tingkatAkses,v.nomor,v.tahun,v.judul,v.deskripsi,v.pic,CAST(v.unit_kerja_id AS CHAR) unitKerjaId,v.tanggal_penetapan tanggalPenetapan FROM dokumen d LEFT JOIN dokumen_versi v ON v.dokumen_id=d.id WHERE d.id=? AND d.deleted_at IS NULL ORDER BY v.nomor_versi DESC',
      [id],
    );
    if (!rows.length) throw new NotFoundException();
    const selected = requestedVersionId
      ? (rows as any[]).find((row) => row.versionId === requestedVersionId)
      : rows[0];
    if (!selected) throw new NotFoundException();
    return {
      document: selected,
      versions: (rows as any[]).filter((row) => row.versionId !== selected.versionId),
      keteranganStatus:
        selected.statusHukum === 'BERLAKU'
          ? null
          : await this.keteranganStatus(id, selected.statusHukum, actor),
      // Yang dilihat pengunjung tanpa masuk; bisa lebih sedikit bila sumbernya Internal.
      keteranganPublik:
        selected.statusHukum === 'BERLAKU'
          ? null
          : await this.keteranganStatus(id, selected.statusHukum),
    };
  }
  async publicDetail(slug: string, actor?: Actor) {
    const r = (
      await this.repo.rows(
        this.repo.pool,
        "SELECT CAST(d.id AS CHAR) id,CAST(v.id AS CHAR) versionId,d.slug,CAST(j.nama AS CHAR) tipe,v.tingkat_akses,d.status_hukum statusHukum,v.status_workflow,IF(d.current_published_version_id=v.id,1,0) current,IF(d.deleted_at IS NULL,0,1) deleted,v.judul,v.deskripsi,v.nomor,v.tanggal_penetapan tanggalPenetapan,v.pic FROM dokumen d JOIN dokumen_versi v ON v.id=d.current_published_version_id JOIN jenis_dokumen j ON j.id=d.jenis_dokumen_id WHERE d.slug=? AND v.status_workflow='TERBIT' AND d.deleted_at IS NULL",
        [slug],
      )
    )[0] as any;
    if (!r) throw new NotFoundException();
    this.policy.assertRead(
      {
        id: r.id,
        tingkatAkses: r.tingkat_akses,
        published: r.status_workflow === 'TERBIT',
        current: Number(r.current) === 1,
        deleted: Number(r.deleted) === 1,
      },
      actor,
    );
    const fileRows = (await this.repo.rows(
      this.repo.pool,
      'SELECT CAST(id AS CHAR) id,jenis_berkas jenisBerkas,nama_asli namaAsli FROM dokumen_berkas WHERE dokumen_versi_id=? ORDER BY jenis_berkas,urutan,id',
      [r.versionId],
    )) as any[];
    const main = fileRows.find((f) => f.jenisBerkas === 'UTAMA');
    if (!main) throw new NotFoundException();
    const response = {
      id: r.id,
      slug: r.slug,
      tipe: r.tipe,
      judul: r.judul,
      deskripsi: r.deskripsi ?? null,
      nomor: r.nomor,
      tanggalPenetapan: r.tanggalPenetapan,
      statusHukum: r.statusHukum,
      pic: r.pic,
      keteranganStatus:
        r.statusHukum === 'BERLAKU' ? null : await this.keteranganStatus(r.id, r.statusHukum, actor),
      statistik: await this.statistikDokumen(r.id),
      berkasUtama: {
        id: main.id,
        jenisBerkas: 'UTAMA',
        namaAsli: main.namaAsli,
        kemampuan: { preview: true, download: true },
      },
      lampiran: fileRows.filter((f) => f.jenisBerkas === 'LAMPIRAN').map((f) => ({
        id: f.id,
        jenisBerkas: 'LAMPIRAN',
        namaAsli: f.namaAsli,
        kemampuan: { preview: true, download: true },
      })),
    };
    // Tingkat akses hanya disebut kepada yang berhak melihat dokumen Internal.
    // Pengunjung anonim membaca dokumen publik tanpa tahu ada tingkat lain.
    // Lolos assertRead atas dokumen non-publik berarti memang berhak tahu.
    const bolehTahuTingkat =
      r.tingkat_akses !== 'publik' ||
      (actor?.status === 'AKTIF' &&
        (actor.peran.includes('DOSEN_STAF') || actor.izin.includes('documents.read_admin')));
    return bolehTahuTingkat
      ? skemaDetailDokumenAuthorized.parse({ ...response, tingkatAkses: r.tingkat_akses })
      : skemaDetailDokumenPublik.parse(response);
  }
  /**
   * Keterangan mengapa dokumen berstatus Diubah/Dicabut, dari riwayat status:
   * - tanggal & sumber: baris terakhir yang memindahkan dokumen ke status ini;
   * - alasan: alasan yang ditulis Admin langsung pada dokumen ini (baris
   *   "hanya alasan") bila ada, selain itu alasan baris perpindahan tadi.
   * Dokumen pengubah/pencabut hanya disebut bila peminta boleh membacanya. Bila
   * tidak, alasan yang berasal dari catatan relasinya ikut disembunyikan karena
   * ditulis pada dokumen tertutup itu.
   */
  /** Jumlah orang yang melihat dan mengunduh dokumen ini. */
  private async statistikDokumen(dokumenId: string) {
    const r = (
      await this.repo.rows(
        this.repo.pool,
        'SELECT jumlah_lihat,jumlah_unduh FROM dokumen_statistik WHERE dokumen_id=?',
        [dokumenId],
      )
    )[0] as any;
    return { dilihat: Number(r?.jumlah_lihat ?? 0), diunduh: Number(r?.jumlah_unduh ?? 0) };
  }
  private async keteranganStatus(dokumenId: string, status: string, actor?: Actor) {
    const rows = (await this.repo.rows(
      this.repo.pool,
      "SELECT DATE_FORMAT(h.confirmed_at,'%Y-%m-%d') tanggal,h.alasan,CAST(sv.dokumen_id AS CHAR) sumberId,IF(h.status_asal<=>h.status_tujuan,1,0) hanyaAlasan FROM dokumen_status_hukum_riwayat h LEFT JOIN dokumen_versi sv ON sv.id=h.source_version_id WHERE h.dokumen_id=? AND h.status_tujuan=? ORDER BY h.confirmed_at DESC,h.id DESC LIMIT 50",
      [dokumenId, status],
    )) as any[];
    const iPindah = rows.findIndex((h) => Number(h.hanyaAlasan) === 0);
    const pindah = iPindah >= 0 ? rows[iPindah] : undefined;
    // Baris sebelum perpindahan (lebih baru) hanya berisi alasan; yang terbaru dipakai.
    const alasanAdmin: string | null = (iPindah >= 0 ? rows.slice(0, iPindah) : rows)[0]?.alasan ?? null;
    if (!rows.length) return null;
    let sumber: { judul: string; slug: string; nomor: string | null } | null = null;
    if (pindah?.sumberId) {
      const s = (
        await this.repo.rows(
          this.repo.pool,
          "SELECT CAST(d.id AS CHAR) id,d.slug,v.judul,v.nomor,v.tingkat_akses FROM dokumen d JOIN dokumen_versi v ON v.id=d.current_published_version_id WHERE d.id=? AND v.status_workflow='TERBIT' AND d.deleted_at IS NULL",
          [pindah.sumberId],
        )
      )[0] as any;
      if (s)
        try {
          this.policy.assertRead(
            { id: s.id, tingkatAkses: s.tingkat_akses, published: true, current: true, deleted: false },
            actor,
          );
          sumber = { judul: s.judul, slug: s.slug, nomor: s.nomor ?? null };
        } catch {
          sumber = null;
        }
    }
    const alasanPindah = pindah && (!pindah.sumberId || sumber) ? pindah.alasan : null;
    return {
      tanggal: (pindah ?? rows[0]).tanggal,
      alasan: alasanAdmin ?? alasanPindah ?? null,
      sumber,
    };
  }
  async updateDocument(actor: Actor, id: string, raw: unknown) {
    this.allow(actor, 'documents.edit');
    const b = skemaUbahDokumen.parse(raw);
    return this.repo
      .transaction(async (db) => {
        const old = (
          await this.repo.rows(
            db,
            'SELECT * FROM dokumen WHERE id=? AND deleted_at IS NULL FOR UPDATE',
            [id],
          )
        )[0] as any;
        if (!old) throw new NotFoundException();
        if (
          b.jenisDokumenId &&
          !(
            await this.repo.rows(
              db,
              'SELECT id FROM jenis_dokumen WHERE id=? AND aktif=1 FOR SHARE',
              [b.jenisDokumenId],
            )
          ).length
        )
          throw new NotFoundException('Jenis dokumen aktif tidak ditemukan');
        await this.repo.write(
          db,
          'UPDATE dokumen SET kode_dokumen=COALESCE(?,kode_dokumen),slug=COALESCE(?,slug),jenis_dokumen_id=COALESCE(?,jenis_dokumen_id) WHERE id=?',
          [b.kodeDokumen ?? null, b.slug ?? null, b.jenisDokumenId ?? null, id],
        );
        await this.audit.recordDomain(
          {
            module: 'documents',
            action: 'UPDATE',
            entityType: 'dokumen',
            entityId: id,
            actorId: actor.id,
            before: { slug: old.slug },
            after: { slug: b.slug ?? old.slug },
          },
          db,
        );
        return { id, ...b };
      })
      .catch(tr);
  }
  async newVersion(actor: Actor, id: string, raw: unknown) {
    this.allow(actor, 'documents.revise');
    const b = skemaBuatVersiDokumen.parse(raw);
    return this.repo
      .transaction(async (db) => {
        const d = (
          await this.repo.rows(
            db,
            'SELECT id FROM dokumen WHERE id=? AND deleted_at IS NULL FOR UPDATE',
            [id],
          )
        )[0];
        if (!d) throw new NotFoundException();
        const r = (
          await this.repo.rows(
            db,
            'SELECT COALESCE(MAX(nomor_versi),0)+1 n FROM dokumen_versi WHERE dokumen_id=?',
            [id],
          )
        )[0] as any;
        const vid = await this.insertVersion(db, id, Number(r.n), b, actor.id);
        await this.bindTerms(db, vid, b.kategoriId ?? [], b.tagId ?? []);
        await this.repo.write(
          db,
          "INSERT INTO dokumen_workflow(dokumen_versi_id,status_asal,status_tujuan,action,actor_id) VALUES(?,NULL,'DRAF','CREATE',?)",
          [vid, actor.id],
        );
        await this.audit.recordDomain(
          {
            module: 'documents',
            action: 'CREATE_VERSION',
            entityType: 'dokumen_versi',
            entityId: vid,
            actorId: actor.id,
            after: { nomorVersi: Number(r.n), status: 'DRAF' },
          },
          db,
        );
        return { id: vid, dokumenId: id, nomorVersi: Number(r.n), statusWorkflow: 'DRAF' };
      })
      .catch(tr);
  }
  async updateVersion(actor: Actor, id: string, raw: unknown) {
    this.allow(actor, 'documents.edit');
    const b = skemaUbahVersiDokumen.parse(raw);
    return this.repo.transaction(async (db) => {
      const v = (
        await this.repo.rows(db, 'SELECT * FROM dokumen_versi WHERE id=? FOR UPDATE', [id])
      )[0] as any;
      if (!v) throw new NotFoundException();
      if (!['DRAF', 'REVISI'].includes(v.status_workflow))
        throw new ConflictException('Versi yang diajukan tidak dapat diubah');
      const keys: Record<string, string> = {
        judul: 'judul',
        deskripsi: 'deskripsi',
        nomor: 'nomor',
        tahun: 'tahun',
        pic: 'pic',
        tanggalPenetapan: 'tanggal_penetapan',
        tingkatAkses: 'tingkat_akses',
        unitKerjaId: 'unit_kerja_id',
      };
      const pairs = Object.entries(b).filter(([k]) => keys[k]);
      if (pairs.length)
        await this.repo.write(
          db,
          `UPDATE dokumen_versi SET ${pairs.map(([k]) => `${keys[k]}=?`).join(',')} WHERE id=?`,
          [...pairs.map(([, v]) => v), id],
        );
      if (b.kategoriId) {
        await this.repo.write(db, 'DELETE FROM dokumen_versi_kategori WHERE dokumen_versi_id=?', [
          id,
        ]);
        await this.bindTerms(db, id, b.kategoriId, []);
      }
      if (b.tagId) {
        await this.repo.write(db, 'DELETE FROM dokumen_versi_tag WHERE dokumen_versi_id=?', [id]);
        await this.bindTerms(db, id, [], b.tagId);
      }
      await this.audit.recordDomain(
        {
          module: 'documents',
          action: 'UPDATE_VERSION',
          entityType: 'dokumen_versi',
          entityId: id,
          actorId: actor.id,
          after: { status: v.status_workflow, judul: b.judul ?? v.judul },
        },
        db,
      );
      return { id, ...b };
    });
  }

  async transition(
    actor: Actor,
    id: string,
    action: 'SUBMIT' | 'RETURN' | 'APPROVE',
    note?: string,
  ) {
    const permission = {
      SUBMIT: 'workflow.submit',
      RETURN: 'workflow.return',
      APPROVE: 'workflow.approve',
    } as const;
    this.allow(actor, permission[action]);
    return this.repo.transaction(async (db) => {
      const v = (
        await this.repo.rows(db, 'SELECT * FROM dokumen_versi WHERE id=? FOR UPDATE', [id])
      )[0] as any;
      if (!v) throw new NotFoundException();
      const from = v.status_workflow;
      const to = action === 'SUBMIT' ? 'DIAJUKAN' : action === 'RETURN' ? 'REVISI' : 'DISETUJUI';
      const valid =
        action === 'SUBMIT'
          ? ['DRAF', 'REVISI'].includes(from)
          : action === 'RETURN'
            ? from === 'DIAJUKAN'
            : from === 'DIAJUKAN';
      if (!valid) throw new ConflictException('Transisi workflow tidak sah');
      if (action === 'RETURN' && !note?.trim())
        throw new UnprocessableEntityException('Catatan revisi wajib diisi');
      // Pembuat versi boleh menyetujui versinya sendiri: langkah ajukan lalu
      // setujui tetap terpisah sebagai pengecekan ulang (keputusan pemilik proyek).
      await this.repo.write(
        db,
        action === 'APPROVE'
          ? 'UPDATE dokumen_versi SET status_workflow=?,verified_by=?,approved_at=? WHERE id=?'
          : 'UPDATE dokumen_versi SET status_workflow=? WHERE id=?',
        action === 'APPROVE' ? [to, actor.id, utc(), id] : [to, id],
      );
      await this.repo.write(
        db,
        'INSERT INTO dokumen_workflow(dokumen_versi_id,status_asal,status_tujuan,action,catatan,actor_id) VALUES(?,?,?,?,?,?)',
        [id, from, to, action, note ?? null, actor.id],
      );
      await this.audit.recordDomain(
        {
          module: 'workflow',
          action,
          entityType: 'dokumen_versi',
          entityId: id,
          actorId: actor.id,
          before: { status: from },
          after: { status: to, ...(note ? { reason: note } : {}) },
        },
        db,
      );
      return { id, statusWorkflow: to };
    });
  }
  async relations(actor: Actor, id: string) {
    this.allow(actor, 'documents.read_admin');
    return this.repo.rows(
      this.repo.pool,
      'SELECT CAST(id AS CHAR) id,CAST(source_version_id AS CHAR) sourceVersionId,CAST(target_document_id AS CHAR) targetDocumentId,jenis_relasi jenisRelasi,catatan FROM dokumen_relasi WHERE source_version_id=?',
      [id],
    );
  }
  async addRelation(actor: Actor, id: string, raw: unknown) {
    this.allow(actor, 'legal.manage_relations');
    const b = skemaBuatRelasi.parse(raw);
    return this.repo
      .transaction(async (db) => {
        const v = (
          await this.repo.rows(
            db,
            'SELECT dokumen_id,status_workflow FROM dokumen_versi WHERE id=? FOR UPDATE',
            [id],
          )
        )[0] as any;
        if (!v) throw new NotFoundException();
        if (!['DRAF', 'REVISI'].includes(v.status_workflow)) throw new ConflictException();
        if (String(v.dokumen_id) === b.targetDocumentId)
          throw new UnprocessableEntityException(
            'Dokumen tidak dapat berelasi dengan dirinya sendiri',
          );
        if (
          !(
            await this.repo.rows(
              db,
              'SELECT id FROM dokumen WHERE id=? AND deleted_at IS NULL FOR SHARE',
              [b.targetDocumentId],
            )
          ).length
        )
          throw new NotFoundException('Dokumen target tidak ditemukan');
        await this.repo.write(
          db,
          'INSERT INTO dokumen_relasi(source_version_id,target_document_id,jenis_relasi,catatan) VALUES(?,?,?,?)',
          [id, b.targetDocumentId, b.jenisRelasi, b.catatan ?? null],
        );
        const rid = await this.repo.id(db);
        await this.audit.recordDomain(
          {
            module: 'legal-relations',
            action: 'CREATE',
            entityType: 'dokumen_relasi',
            entityId: rid,
            actorId: actor.id,
            after: { targetId: b.targetDocumentId },
          },
          db,
        );
        return { id: rid, sourceVersionId: id, ...b };
      })
      .catch(tr);
  }
  async removeRelation(actor: Actor, id: string, rid: string) {
    this.allow(actor, 'legal.manage_relations');
    return this.repo.transaction(async (db) => {
      const r = (
        await this.repo.rows(
          db,
          'SELECT dr.id,v.status_workflow FROM dokumen_relasi dr JOIN dokumen_versi v ON v.id=dr.source_version_id WHERE dr.id=? AND dr.source_version_id=? FOR UPDATE',
          [rid, id],
        )
      )[0] as any;
      if (!r) throw new NotFoundException();
      if (!['DRAF', 'REVISI'].includes(r.status_workflow)) throw new ConflictException();
      await this.repo.write(db, 'DELETE FROM dokumen_relasi WHERE id=?', [rid]);
      await this.audit.recordDomain(
        {
          module: 'legal-relations',
          action: 'DELETE',
          entityType: 'dokumen_relasi',
          entityId: rid,
          actorId: actor.id,
        },
        db,
      );
      return { deleted: true };
    });
  }
  async impact(actor: Actor, id: string) {
    this.allow(actor, 'workflow.publish');
    const v = (
      await this.repo.rows(
        this.repo.pool,
        'SELECT id,status_workflow FROM dokumen_versi WHERE id=?',
        [id],
      )
    )[0] as any;
    if (!v) throw new NotFoundException();
    if (v.status_workflow !== 'DISETUJUI') throw new ConflictException();
    const rows = (await this.repo.rows(
      this.repo.pool,
      "SELECT CAST(d.id AS CHAR) targetDocumentId,d.status_hukum statusSaatIni,r.jenis_relasi FROM dokumen_relasi r JOIN dokumen d ON d.id=r.target_document_id WHERE r.source_version_id=? AND r.jenis_relasi IN ('MENGUBAH','MENCABUT') ORDER BY d.id",
      [id],
    )) as any[];
    const dampak = rows.map((r) => ({
      targetDocumentId: r.targetDocumentId,
      statusSaatIni: r.statusSaatIni,
      jenisRelasi: r.jenis_relasi,
      statusUsulan: r.jenis_relasi === 'MENGUBAH' ? 'DIUBAH' : 'DICABUT',
    }));
    const snapshot = JSON.stringify({ id, impacts: dampak });
    const token = createHmac('sha256', this.cfgKey()).update(snapshot).digest('base64url');
    return { versiId: id, tokenKonfirmasi: token, dampak, perluKonfirmasi: true as const };
  }
  async publish(actor: Actor, id: string, raw: unknown) {
    this.allow(actor, 'workflow.publish');
    const confirmation = skemaTerbitkanDokumen.parse(raw).konfirmasi;
    const preview = await this.impact(actor, id);
    const given = confirmation.tokenKonfirmasi;
    const impacts = confirmation.dampak;
    if (!confirmation.disetujui) throw new UnprocessableEntityException('Konfirmasi dampak wajib');
    if (
      given !== preview.tokenKonfirmasi ||
      JSON.stringify(impacts) !== JSON.stringify(preview.dampak)
    )
      throw new ConflictException('Dampak berubah; muat ulang preview');
    const body = skemaKesiapanPublikasi.safeParse(
      (
        await this.repo.rows(
          this.repo.pool,
          'SELECT judul,nomor,tahun,pic,tanggal_penetapan tanggalPenetapan,tingkat_akses tingkatAkses,CAST(unit_kerja_id AS CHAR) unitKerjaId FROM dokumen_versi WHERE id=?',
          [id],
        )
      )[0],
    );
    if (!body.success) throw new UnprocessableEntityException('Metadata publikasi belum lengkap');
    return this.repo.transaction(async (db) => {
      const hint = (
        await this.repo.rows(db, 'SELECT dokumen_id FROM dokumen_versi WHERE id=?', [id])
      )[0] as any;
      if (!hint) throw new NotFoundException();
      const doc = (
        await this.repo.rows(
          db,
          'SELECT id,current_published_version_id FROM dokumen WHERE id=? FOR UPDATE',
          [hint.dokumen_id],
        )
      )[0] as any;
      if (!doc) throw new NotFoundException();
      const v = (
        await this.repo.rows(db, 'SELECT * FROM dokumen_versi WHERE id=? FOR UPDATE', [id])
      )[0] as any;
      if (!v || v.status_workflow !== 'DISETUJUI' || String(v.dokumen_id) !== String(doc.id))
        throw new ConflictException();
      // The locked version row serializes publish against file metadata writes; object bytes are
      // verified before moving the current publication pointer.
      await this.files.assertPublishReady(db, id);
      const fresh = (await this.repo.rows(
        db,
        "SELECT CAST(d.id AS CHAR) targetDocumentId,d.status_hukum statusSaatIni,r.jenis_relasi,r.catatan FROM dokumen_relasi r JOIN dokumen d ON d.id=r.target_document_id WHERE r.source_version_id=? AND r.jenis_relasi IN ('MENGUBAH','MENCABUT') ORDER BY d.id FOR UPDATE",
        [id],
      )) as any[];
      if (
        JSON.stringify(
          fresh.map((r) => ({
            targetDocumentId: r.targetDocumentId,
            statusSaatIni: r.statusSaatIni,
            jenisRelasi: r.jenis_relasi,
            statusUsulan: r.jenis_relasi === 'MENGUBAH' ? 'DIUBAH' : 'DICABUT',
          })),
        ) !== JSON.stringify(preview.dampak)
      )
        throw new ConflictException('Dampak hukum berubah');
      const now = utc();
      if (doc.current_published_version_id)
        await this.repo.write(
          db,
          "UPDATE dokumen_versi SET superseded_at=? WHERE id=? AND status_workflow='TERBIT'",
          [now, doc.current_published_version_id],
        );
      await this.repo.write(
        db,
        "UPDATE dokumen_versi SET status_workflow='TERBIT',published_by=?,published_at=? WHERE id=?",
        [actor.id, now, id],
      );
      await this.repo.write(db, 'UPDATE dokumen SET current_published_version_id=? WHERE id=?', [
        id,
        v.dokumen_id,
      ]);
      await this.repo.write(
        db,
        "INSERT INTO dokumen_workflow(dokumen_versi_id,status_asal,status_tujuan,action,actor_id) VALUES(?,'DISETUJUI','TERBIT','PUBLISH',?)",
        [id, actor.id],
      );
      for (const r of fresh) {
        const next = r.jenis_relasi === 'MENGUBAH' ? 'DIUBAH' : 'DICABUT';
        await this.repo.write(db, 'UPDATE dokumen SET status_hukum=? WHERE id=?', [
          next,
          r.targetDocumentId,
        ]);
        await this.repo.write(
          db,
          'INSERT INTO dokumen_status_hukum_riwayat(dokumen_id,status_asal,status_tujuan,source_version_id,alasan,actor_id,confirmed_at) VALUES(?,?,?,?,?,?,?)',
          [
            r.targetDocumentId,
            r.statusSaatIni,
            next,
            id,
            // Catatan relasi menjadi alasan yang dibaca publik; opsional.
            String(r.catatan ?? '').trim() || null,
            actor.id,
            now,
          ],
        );
        await this.audit.recordDomain(
          {
            module: 'legal-relations',
            action: 'STATUS_IMPACT',
            entityType: 'dokumen',
            entityId: r.targetDocumentId,
            actorId: actor.id,
            before: { statusHukum: r.statusSaatIni },
            after: { statusHukum: next },
          },
          db,
        );
      }
      await this.audit.recordDomain(
        {
          module: 'workflow',
          action: 'PUBLISH',
          entityType: 'dokumen_versi',
          entityId: id,
          actorId: actor.id,
          before: { status: 'DISETUJUI' },
          after: { status: 'TERBIT' },
        },
        db,
      );
      return { id, statusWorkflow: 'TERBIT', currentPublishedVersionId: id };
    });
  }
  async withdraw(actor: Actor, id: string, raw: unknown) {
    this.allow(actor, 'workflow.withdraw');
    const reason = skemaTarikDokumen.parse(raw).alasan;
    return this.repo.transaction(async (db) => {
      const d = (
        await this.repo.rows(
          db,
          'SELECT id,current_published_version_id FROM dokumen WHERE id=? FOR UPDATE',
          [id],
        )
      )[0] as any;
      if (!d) throw new NotFoundException();
      const vid = String(d.current_published_version_id ?? '');
      if (!vid) throw new ConflictException('Tidak ada versi terbit aktif');
      const v = (
        await this.repo.rows(
          db,
          "SELECT * FROM dokumen_versi WHERE id=? AND status_workflow='TERBIT' FOR UPDATE",
          [vid],
        )
      )[0] as any;
      if (!v) throw new ConflictException();
      const now = utc();
      await this.repo.write(
        db,
        "UPDATE dokumen_versi SET status_workflow='DITARIK',withdrawn_at=?,withdrawal_reason=? WHERE id=?",
        [now, reason, vid],
      );
      await this.repo.write(
        db,
        'UPDATE dokumen SET current_published_version_id=NULL WHERE id=? AND current_published_version_id=?',
        [id, vid],
      );
      await this.repo.write(
        db,
        "INSERT INTO dokumen_workflow(dokumen_versi_id,status_asal,status_tujuan,action,catatan,actor_id) VALUES(?,'TERBIT','DITARIK','WITHDRAW',?,?)",
        [vid, reason, actor.id],
      );
      await this.audit.recordDomain(
        {
          module: 'workflow',
          action: 'WITHDRAW',
          entityType: 'dokumen_versi',
          entityId: vid,
          actorId: actor.id,
          before: { status: 'TERBIT' },
          after: { status: 'DITARIK', reason },
        },
        db,
      );
      return { id, versionId: vid, currentPublishedVersionId: null, statusWorkflow: 'DITARIK' };
    });
  }

}
