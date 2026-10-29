/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-optional-chain */
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import type { PenggunaAktif, KonfirmasiDampakPublikasi } from '@jdih/shared';
import {
  skemaBuatDokumen,
  skemaUbahDokumen,
  skemaBuatVersiDokumen,
  skemaUbahVersiDokumen,
  skemaBuatRelasi,
  skemaKesiapanPublikasi,
  skemaKesiapanPengajuan,
  pesanKekuranganPengajuan,
  skemaTerbitkanDokumen,
  skemaTarikDokumen,
  skemaStatusMaster,
  skemaJenisDokumen,
  skemaKategori,
  skemaTag,
  skemaDetailDokumenPublik,
  skemaDetailDokumenAuthorized,
  skemaHalaman,
  skemaDaftarDokumenPanel,
  skemaKemampuanDokumenAdmin,
  skemaNotifikasiDokumen,
  skemaSetujuiDokumen,
  skemaId,
  skemaHapusSemuaNotifikasi,
  skemaPilihanKategoriDokumen,
} from '@jdih/shared';
import { cekBacaPanel, cekIzin, cekPemilikAtauSuperadmin, cekPeruntukanPanel, cekSuperadmin } from '../identity/security.js';
import { AuditService } from '../identity/audit.service.js';
import { DocumentPolicyService } from '../identity/document-policy.service.js';
import { utc } from '../identity/identity.repository.js';
import { CoreBackendRepository } from './core-backend.repository.js';
import type { KonfigurasiApp } from '../../config/configuration.js';
import { DocumentFilesService } from './files/document-files.service.js';
import { bisaDipratinjau } from './storage/file-validation.js';
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
const UNIT_IKUT_KATEGORI =
  'Unit kerja mengikuti kategori SOP. Ubah lewat menu Kategori.';
/**
 * Status hukum dokumen sasaran setelah dokumen pengubah/pencabutnya terbit.
 * Dokumen yang sudah dicabut tetap dicabut walau kemudian ada pengubahnya.
 */
const statusUsulan = (jenis: string, saatIni: string) =>
  jenis === 'MENCABUT' || saatIni === 'DICABUT' ? 'DICABUT' : 'DIUBAH';
/** Peruntukan PERMOHONAN_SK hanya boleh pada dokumen berjenis SOP. */
const jenisSop = (j: { kode?: string | null; nama?: string | null } | undefined) =>
  (j?.kode ?? '').toUpperCase() === 'SOP' || (j?.nama ?? '').toUpperCase() === 'SOP';
const PERUNTUKAN_BUKAN_SOP = 'SOP Permohonan SK hanya untuk dokumen berjenis SOP';
const cekAksesSop = (peruntukan: unknown, akses: unknown) => {
  if (peruntukan === 'PERMOHONAN_SK' && !['publik', 'internal'].includes(String(akses)))
    throw new UnprocessableEntityException('Akses SOP Permohonan SK harus Publik atau Dosen/Staf');
};
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

  async adminDocuments(actor: Actor, rawQuery: unknown, verificationOnly = false, relationTargets = false) {
    if (verificationOnly) {
      cekBacaPanel(actor, 'documents.read_admin');
    } else this.allow(actor, 'documents.read_admin');
    const query = skemaDaftarDokumenPanel.parse(rawQuery);
    const where = ['d.deleted_at IS NULL'];
    const values: (string | number)[] = [];
    if (!actor.peran.includes('SUPERADMIN')) {
      cekPeruntukanPanel(actor, query.peruntukan);
      where.push('d.peruntukan IS NULL');
      if (!verificationOnly) {
        where.push('d.created_by=?');
        values.push(actor.id);
      }
      if (relationTargets) {
        where.push('v.created_by=?');
        values.push(actor.id);
      }
    }
    if (relationTargets)
      where.push("v.id=d.current_published_version_id AND v.status_workflow='TERBIT' AND d.status_hukum<>'DICABUT'");
    if (!verificationOnly)
      where.push(query.cakupan === 'PENGAJUAN'
        ? "v.status_workflow IN ('DRAF','REVISI','DIAJUKAN')"
        : "v.status_workflow IN ('DISETUJUI','TERBIT','DITARIK')");
    if (verificationOnly) where.push("v.status_workflow='DIAJUKAN'");
    else if (query.statusWorkflow === 'TERBIT')
      where.push("v.status_workflow='TERBIT' AND v.superseded_at IS NULL");
    else if (query.statusWorkflow === 'DIGANTI')
      where.push("v.status_workflow='TERBIT' AND v.superseded_at IS NOT NULL");
    else if (query.statusWorkflow) {
      where.push('v.status_workflow=?');
      values.push(query.statusWorkflow);
    }
    if (query.peruntukan) {
      where.push('d.peruntukan=?');
      values.push(query.peruntukan);
    }
    if (query.kelompok) {
      const sop = "(UPPER(COALESCE(j.kode,''))='SOP' OR UPPER(j.nama)='SOP')";
      where.push('d.peruntukan IS NULL');
      where.push(query.kelompok === 'SOP' ? sop : `NOT ${sop}`);
    }
    if (query.q) {
      where.push("(v.judul LIKE ? ESCAPE '!' OR v.nomor LIKE ? ESCAPE '!' OR d.slug LIKE ? ESCAPE '!')");
      const pattern = `%${query.q.replaceAll('!', '!!').replaceAll('%', '!%').replaceAll('_', '!_')}%`;
      values.push(pattern, pattern, pattern);
    }
    const from = `FROM dokumen d JOIN dokumen_versi v ON v.dokumen_id=d.id JOIN jenis_dokumen j ON j.id=d.jenis_dokumen_id WHERE ${where.join(' AND ')}`;
    return this.halaman(
      `SELECT CAST(d.id AS CHAR) id,CAST(v.id AS CHAR) versionId,v.nomor_versi nomorVersi,d.slug,CAST(d.jenis_dokumen_id AS CHAR) jenisDokumenId,j.nama tipe,v.judul,v.nomor,v.tahun,v.tingkat_akses tingkatAkses,v.status_workflow statusWorkflow,IF(v.superseded_at IS NULL,FALSE,TRUE) diganti,d.status_hukum statusHukum,d.peruntukan,v.published_at publishedAt,v.updated_at diperbarui ${from} ORDER BY v.updated_at DESC,v.id DESC LIMIT ? OFFSET ?`,
      `SELECT COUNT(*) total ${from}`,
      values,
      query.halaman,
      query.perHalaman,
    );
  }

  async relationTargets(actor: Actor, query: unknown) {
    this.allow(actor, 'legal.manage_relations');
    return this.adminDocuments(actor, query, false, true);
  }

  async auditList(actor: Actor, rawQuery: unknown) {
    cekSuperadmin(actor);
    cekIzin(actor, ['audit.read']);
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

  /** Riwayat workflow menjadi notifikasi persisten dalam transaksi yang sama. */
  async notifications(actor: Actor) {
    cekBacaPanel(actor, 'documents.read_admin');
    const rows = await this.repo.notificationList(actor.id, actor.peran.includes('SUPERADMIN'));
    return rows.map((r) => skemaNotifikasiDokumen.parse(r));
  }

  async dismissNotification(actor: Actor, rawId: unknown) {
    cekBacaPanel(actor, 'documents.read_admin');
    return this.dismissNotifications(actor, skemaId.parse(rawId), false);
  }

  async clearNotifications(actor: Actor, raw: unknown) {
    cekBacaPanel(actor, 'documents.read_admin');
    return this.dismissNotifications(actor, skemaHapusSemuaNotifikasi.parse(raw).sampaiId, true);
  }

  private async dismissNotifications(actor: Actor, id: string, all: boolean) {
    const superadmin = actor.peran.includes('SUPERADMIN');
    return this.repo.transaction(async (db) => {
      // Serialisasi penghapusan untuk akun yang sama; daftar akun lain tidak berubah.
      const account = await this.repo.lockNotificationAccount(db, actor.id);
      if (!account.length) throw new ForbiddenException();
      if (!all && !await this.repo.notificationExists(db, actor.id, superadmin, id))
        throw new NotFoundException('Notifikasi tidak ditemukan.');
      const result = await this.repo.insertNotificationDismissals(db, actor.id, superadmin, id, all);
      if (result.affectedRows > 0) await this.audit.recordDomain({
        module: 'settings', action: all ? 'DISMISS_ALL_NOTIFICATIONS' : 'DISMISS_NOTIFICATION',
        entityType: 'notifikasi', entityId: all ? actor.id : id, actorId: actor.id,
        after: { jumlahDihapus: result.affectedRows, ...(all ? { sampaiId: id } : {}) },
      }, db);
      return { jumlahDihapus: result.affectedRows };
    });
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
    cekBacaPanel(actor, table === 'unit_kerja' ? 'units.manage' : 'master.manage');
    const sql: Record<typeof table, string> = {
      unit_kerja: 'SELECT CAST(id AS CHAR) id,CAST(parent_id AS CHAR) parentId,kode,nama,aktif FROM unit_kerja WHERE deleted_at IS NULL ORDER BY nama',
      jenis_dokumen: 'SELECT CAST(id AS CHAR) id,kode,nama,urutan,aktif FROM jenis_dokumen ORDER BY urutan,nama',
      kategori: 'SELECT CAST(id AS CHAR) id,kode,nama,aktif FROM kategori ORDER BY nama',
      tag: 'SELECT CAST(id AS CHAR) id,nama FROM tag ORDER BY nama',
    };
    return this.repo.rows(this.repo.pool, sql[table]);
  }

  /** Pilihan input terpisah dari daftar informasi master yang dapat dibaca semua Admin. */
  async documentOptions(actor: Actor, table: 'jenis_dokumen' | 'kategori') {
    if (!['jenis_dokumen', 'kategori'].includes(table)) throw new NotFoundException();
    if (!actor.peran.includes('SUPERADMIN')) {
      this.allow(actor, 'documents.create');
      if (table === 'kategori') {
        const rows = await this.repo.rows(
          this.repo.pool,
          'SELECT CAST(k.id AS CHAR) id,k.kode,k.nama,k.aktif,IF(k.aktif=1 AND u.aktif=1 AND u.id=?,TRUE,FALSE) bolehPilih FROM kategori k LEFT JOIN unit_kerja u ON u.kode=k.kode AND u.deleted_at IS NULL ORDER BY k.nama',
          [actor.unitKerjaId ?? null],
        );
        return rows.map((r) => skemaPilihanKategoriDokumen.parse({ ...r, aktif: Number(r.aktif) === 1, bolehPilih: Number(r.bolehPilih) === 1 }));
      }
      if (table === 'jenis_dokumen')
        return this.repo.rows(
          this.repo.pool,
          'SELECT CAST(id AS CHAR) id,kode,nama,urutan,aktif FROM jenis_dokumen WHERE aktif=1 ORDER BY urutan,nama',
        );
      throw new NotFoundException();
    }
    this.allow(actor, 'documents.create');
    const sql: Record<typeof table, string> = {
      jenis_dokumen:
        'SELECT CAST(id AS CHAR) id,kode,nama,urutan,aktif FROM jenis_dokumen ORDER BY urutan,nama',
      kategori: 'SELECT CAST(id AS CHAR) id,kode,nama,aktif FROM kategori ORDER BY nama',
    };
    const rows = await this.repo.rows(this.repo.pool, sql[table]);
    return table === 'kategori'
      ? rows.map((r) => skemaPilihanKategoriDokumen.parse({ ...r, aktif: Number(r.aktif) === 1, bolehPilih: Number(r.aktif) === 1 }))
      : rows;
  }
  async masterDetail(
    actor: Actor,
    table: 'unit_kerja' | 'jenis_dokumen' | 'kategori' | 'tag',
    id: string,
  ) {
    if (!['unit_kerja', 'jenis_dokumen', 'kategori', 'tag'].includes(table))
      throw new NotFoundException();
    cekBacaPanel(actor, table === 'unit_kerja' ? 'units.manage' : 'master.manage');
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
    cekSuperadmin(actor);
    this.allow(actor, table === 'unit_kerja' ? 'units.manage' : 'master.manage');
    if (table === 'unit_kerja') throw new ConflictException(UNIT_IKUT_KATEGORI);
    const b = (
      table === 'jenis_dokumen'
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
        if (table === 'jenis_dokumen') {
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
          await this.selaraskanUnit(db, b, before?.kode as string | undefined);
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
  /**
   * Unit kerja mengikuti kategori SOP: setiap kategori punya unit dengan kode,
   * nama, dan status aktif yang sama. Unit tidak pernah dihapus karena dirujuk
   * akun dan versi dokumen; bila kode kategori berganti, unitnya ikut berganti.
   */
  private async selaraskanUnit(
    db: Parameters<CoreBackendRepository['write']>[0],
    b: MasterPayload,
    kodeLama?: string,
  ) {
    if (kodeLama && kodeLama !== b.kode) {
      await this.repo.write(db, 'UPDATE IGNORE unit_kerja SET kode=? WHERE kode=?', [
        b.kode,
        kodeLama,
      ]);
      await this.repo.write(db, 'UPDATE unit_kerja SET aktif=FALSE WHERE kode=?', [kodeLama]);
    }
    await this.repo.write(
      db,
      'INSERT INTO unit_kerja(kode,nama,aktif) VALUES(?,?,?) AS baru ON DUPLICATE KEY UPDATE nama=baru.nama,aktif=baru.aktif,deleted_at=NULL',
      [b.kode, b.nama, b.aktif ?? true],
    );
  }
  async masterStatus(
    actor: Actor,
    table: 'unit_kerja' | 'jenis_dokumen' | 'kategori',
    id: string,
    raw: unknown,
  ) {
    if (!['unit_kerja', 'jenis_dokumen', 'kategori'].includes(table)) throw new NotFoundException();
    cekSuperadmin(actor);
    this.allow(actor, table === 'unit_kerja' ? 'units.manage' : 'master.manage');
    if (table === 'unit_kerja') throw new ConflictException(UNIT_IKUT_KATEGORI);
    const { aktif } = skemaStatusMaster.parse(raw);
    return this.repo.transaction(async (db) => {
      const row = (
        await this.repo.rows(db, `SELECT id,aktif FROM ${table} WHERE id=? FOR UPDATE`, [id])
      )[0] as any;
      if (!row) throw new NotFoundException();
      await this.repo.write(
        db,
        `UPDATE ${table} SET aktif=? WHERE id=?`,
        [aktif, id],
      );
      if (table === 'kategori')
        await this.repo.write(
          db,
          'UPDATE unit_kerja u JOIN kategori k ON k.kode=u.kode SET u.aktif=k.aktif WHERE k.id=?',
          [id],
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
    if (b.peruntukan) cekSuperadmin(actor);
    const v = b.versi;
    cekAksesSop(b.peruntukan, v.tingkatAkses);
    return this.repo
      .transaction(async (db) => {
        const jenis = (
          await this.repo.rows(
            db,
            'SELECT id,kode,nama FROM jenis_dokumen WHERE id=? AND aktif=1 FOR SHARE',
            [b.jenisDokumenId],
          )
        )[0] as any;
        if (!jenis) throw new NotFoundException('Jenis dokumen aktif tidak ditemukan');
        if (b.peruntukan && !jenisSop(jenis))
          throw new UnprocessableEntityException(PERUNTUKAN_BUKAN_SOP);
        await this.repo.write(
          db,
          'INSERT INTO dokumen(kode_dokumen,slug,jenis_dokumen_id,peruntukan,created_by) VALUES(?,?,?,?,?)',
          [b.kodeDokumen, b.slug, b.jenisDokumenId, b.peruntukan ?? null, actor.id],
        );
        const did = await this.repo.id(db);
        const vid = await this.insertVersion(db, did, 1, v, actor);
        await this.bindTerms(db, vid, v.kategoriId ?? [], v.tagId ?? [], actor);
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
            after: { slug: b.slug, ...(b.peruntukan ? { peruntukan: b.peruntukan } : {}) },
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
  private async insertVersion(db: any, did: string, n: number, v: any, actor: Actor) {
    let unitKerjaId = v.unitKerjaId ?? null;
    if (!actor.peran.includes('SUPERADMIN')) {
      if (unitKerjaId && unitKerjaId !== actor.unitKerjaId)
        throw new UnprocessableEntityException('Dokumen hanya dapat dimasukkan untuk unit kerja akun Anda');
      unitKerjaId = actor.unitKerjaId;
      if ((v.kategoriId ?? []).length && !unitKerjaId)
        throw new UnprocessableEntityException('Pilih kategori yang sesuai unit kerja akun Anda');
    }
    if (
      unitKerjaId &&
      !(
        await this.repo.rows(
          db,
          'SELECT id FROM unit_kerja WHERE id=? AND aktif=1 AND deleted_at IS NULL FOR SHARE',
          [unitKerjaId],
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
        unitKerjaId,
        v.tanggalPenetapan ?? null,
        actor.id,
      ],
    );
    return this.repo.id(db);
  }
  private async bindTerms(db: any, vid: string, cats: string[], tags: string[], actor: Actor) {
    for (const id of [...new Set(cats)]) {
      const active = actor.peran.includes('SUPERADMIN')
        ? await this.repo.rows(db, 'SELECT id FROM kategori WHERE id=? AND aktif=1', [id])
        : actor.unitKerjaId
          ? await this.repo.rows(
              db,
              'SELECT k.id FROM kategori k JOIN unit_kerja u ON u.kode=k.kode WHERE k.id=? AND k.aktif=1 AND u.id=? AND u.aktif=1 AND u.deleted_at IS NULL',
              [id, actor.unitKerjaId],
            )
          : [];
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
    cekBacaPanel(actor, 'documents.read_admin');
    const rows = await this.repo.rows(
      this.repo.pool,
      'SELECT CAST(d.id AS CHAR) id,d.created_by documentCreatedBy,d.kode_dokumen kodeDokumen,d.slug,CAST(d.jenis_dokumen_id AS CHAR) jenisDokumenId,d.peruntukan,d.status_hukum statusHukum,CAST(d.current_published_version_id AS CHAR) currentPublishedVersionId,CAST(v.id AS CHAR) versionId,v.created_by versionCreatedBy,v.nomor_versi nomorVersi,v.status_workflow statusWorkflow,v.tingkat_akses tingkatAkses,v.nomor,v.tahun,v.judul,v.deskripsi,v.pic,CAST(v.unit_kerja_id AS CHAR) unitKerjaId,v.tanggal_penetapan tanggalPenetapan FROM dokumen d LEFT JOIN dokumen_versi v ON v.dokumen_id=d.id WHERE d.id=? AND d.deleted_at IS NULL ORDER BY v.nomor_versi DESC',
      [id],
    );
    if (!rows.length) throw new NotFoundException();
    cekPeruntukanPanel(actor, rows[0]?.peruntukan);
    const selected = requestedVersionId
      ? (rows as any[]).find((row) => row.versionId === requestedVersionId)
      : rows[0];
    if (!selected) throw new NotFoundException();
    const ownVersion = String(selected.documentCreatedBy) === actor.id && String(selected.versionCreatedBy) === actor.id;
    const current = rows.find((r) => r.versionId === selected.currentPublishedVersionId);
    return {
      document: {
        ...selected,
        ...skemaKemampuanDokumenAdmin.parse({
          bolehUbah: actor.peran.includes('SUPERADMIN') || (
            String(selected.documentCreatedBy) === actor.id &&
            String(selected.versionCreatedBy) === actor.id
          ),
          bolehRevisi: actor.peran.includes('SUPERADMIN') || (
            String(selected.documentCreatedBy) === actor.id
          ),
          bolehSetujuiLangsung: actor.peran.includes('SUPERADMIN') && ownVersion,
          bolehJadiTargetRelasi: Boolean(current) && selected.statusHukum !== 'DICABUT' && (
            actor.peran.includes('SUPERADMIN') || (String(selected.documentCreatedBy) === actor.id && String(current?.versionCreatedBy) === actor.id)
          ),
        }),
      },
      versions: (rows as any[]).filter((row) => row.versionId !== selected.versionId),
      kategoriId: (await this.repo.rows(this.repo.pool,
        'SELECT CAST(kategori_id AS CHAR) id FROM dokumen_versi_kategori WHERE dokumen_versi_id=?',
        [selected.versionId])).map((r) => String(r.id)),
      riwayatVerifikasi: await this.repo.rows(this.repo.pool,
        "SELECT CAST(id AS CHAR) id,action,catatan,created_at createdAt FROM dokumen_workflow WHERE dokumen_versi_id=? AND action IN ('SUBMIT','RETURN','APPROVE') ORDER BY id DESC",
        [selected.versionId]),
      keteranganStatus:
        selected.statusHukum === 'BERLAKU'
          ? null
          : await this.keteranganStatus(id, selected.statusHukum, actor),
      statusPeraturan: await this.statusPeraturan(id, actor),
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
      'SELECT CAST(id AS CHAR) id,jenis_berkas jenisBerkas,nama_asli namaAsli,mime_type mimeType FROM dokumen_berkas WHERE dokumen_versi_id=? ORDER BY jenis_berkas,urutan,id',
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
      statusPeraturan: await this.statusPeraturan(r.id, actor),
      statistik: await this.statistikDokumen(r.id),
      berkasUtama: {
        id: main.id,
        jenisBerkas: 'UTAMA',
        namaAsli: main.namaAsli,
        kemampuan: { preview: bisaDipratinjau(main.mimeType), download: true },
      },
      lampiran: fileRows.filter((f) => f.jenisBerkas === 'LAMPIRAN').map((f) => ({
        id: f.id,
        jenisBerkas: 'LAMPIRAN',
        namaAsli: f.namaAsli,
        kemampuan: { preview: bisaDipratinjau(f.mimeType), download: true },
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
   * "Status Peraturan" dua arah, seperti JDIH BPK. Hanya hubungan dari versi
   * yang sudah terbit yang dihitung, karena status hukum baru berubah saat
   * dokumen pengubah/pencabut terbit. Dokumen yang ditautkan memakai versi
   * terbit terkininya, dan hanya disebut bila peminta boleh membacanya; yang
   * tertutup dilewati tanpa jejak.
   */
  private async statusPeraturan(dokumenId: string, actor?: Actor) {
    const kolom =
      "CAST(d.id AS CHAR) id,d.slug,CAST(j.nama AS CHAR) tipe,cv.judul,cv.nomor,cv.tahun,cv.tingkat_akses tingkatAkses";
    const masuk = (await this.repo.rows(
      this.repo.pool,
      `SELECT r.jenis_relasi jenisRelasi,${kolom} FROM dokumen_relasi r JOIN dokumen_versi sv ON sv.id=r.source_version_id AND sv.published_at IS NOT NULL JOIN dokumen d ON d.id=sv.dokumen_id AND d.deleted_at IS NULL JOIN dokumen_versi cv ON cv.id=d.current_published_version_id AND cv.status_workflow='TERBIT' JOIN jenis_dokumen j ON j.id=d.jenis_dokumen_id WHERE r.target_document_id=? AND d.id<>? AND r.jenis_relasi IN ('MENGUBAH','MENCABUT') ORDER BY cv.tahun DESC,d.id DESC`,
      [dokumenId, dokumenId],
    )) as any[];
    const keluar = (await this.repo.rows(
      this.repo.pool,
      `SELECT r.jenis_relasi jenisRelasi,${kolom} FROM dokumen_relasi r JOIN dokumen_versi sv ON sv.id=r.source_version_id AND sv.published_at IS NOT NULL AND sv.dokumen_id=? JOIN dokumen d ON d.id=r.target_document_id AND d.deleted_at IS NULL JOIN dokumen_versi cv ON cv.id=d.current_published_version_id AND cv.status_workflow='TERBIT' JOIN jenis_dokumen j ON j.id=d.jenis_dokumen_id WHERE r.jenis_relasi IN ('MENGUBAH','MENCABUT') ORDER BY cv.tahun DESC,d.id DESC`,
      [dokumenId],
    )) as any[];
    const boleh = (x: any) => {
      try {
        this.policy.assertRead(
          { id: x.id, tingkatAkses: x.tingkatAkses, published: true, current: true, deleted: false },
          actor,
        );
        return true;
      } catch {
        return false;
      }
    };
    const baris = (x: any, jenis: string) => ({
      jenis,
      dokumen: {
        id: x.id,
        slug: x.slug,
        tipe: x.tipe,
        judul: x.judul,
        nomor: x.nomor ?? null,
        tahun: x.tahun === null || x.tahun === undefined ? null : Number(x.tahun),
      },
    });
    const urutan = ['DICABUT_DENGAN', 'DIUBAH_DENGAN', 'MENCABUT', 'MENGUBAH'];
    // Satu dokumen bisa berelasi dari beberapa versi terbit; cukup disebut sekali.
    const terlihat = new Set<string>();
    return [
      ...masuk
        .filter(boleh)
        .map((x) => baris(x, x.jenisRelasi === 'MENCABUT' ? 'DICABUT_DENGAN' : 'DIUBAH_DENGAN')),
      ...keluar.filter(boleh).map((x) => baris(x, x.jenisRelasi)),
    ]
      .filter((x) => {
        const kunci = `${x.jenis}:${x.dokumen.id}`;
        if (terlihat.has(kunci)) return false;
        terlihat.add(kunci);
        return true;
      })
      .sort((a, b) => urutan.indexOf(a.jenis) - urutan.indexOf(b.jenis));
  }
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
  /**
   * Keterangan mengapa dokumen berstatus Diubah/Dicabut, dari riwayat status:
   * - tanggal & sumber: baris terakhir yang memindahkan dokumen ke status ini;
   * - alasan: alasan yang ditulis Admin langsung pada dokumen ini (baris
   *   "hanya alasan", tanpa versi sumber) bila ada, selain itu alasan baris
   *   perpindahan tadi.
   * Baris dengan versi sumber selalu dihitung sebagai perpindahan, walau status
   * asal = tujuan (mis. dokumen yang sudah Diubah, diubah lagi oleh dokumen lain).
   * Dokumen pengubah/pencabut hanya disebut bila peminta boleh membacanya. Bila
   * tidak, alasan yang berasal dari catatan relasinya ikut disembunyikan karena
   * ditulis pada dokumen tertutup itu.
   */
  private async keteranganStatus(dokumenId: string, status: string, actor?: Actor) {
    const rows = (await this.repo.rows(
      this.repo.pool,
      "SELECT DATE_FORMAT(h.confirmed_at,'%Y-%m-%d') tanggal,h.alasan,CAST(sv.dokumen_id AS CHAR) sumberId,IF(h.status_asal<=>h.status_tujuan AND h.source_version_id IS NULL,1,0) hanyaAlasan FROM dokumen_status_hukum_riwayat h LEFT JOIN dokumen_versi sv ON sv.id=h.source_version_id WHERE h.dokumen_id=? AND h.status_tujuan=? ORDER BY h.confirmed_at DESC,h.id DESC LIMIT 50",
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
        cekPeruntukanPanel(actor, old.peruntukan);
        if (b.peruntukan !== undefined) cekSuperadmin(actor);
        cekPemilikAtauSuperadmin(actor, old.created_by);
        if (!actor.peran.includes('SUPERADMIN')) {
          const latest = (await this.repo.rows(db,
            'SELECT status_workflow FROM dokumen_versi WHERE dokumen_id=? ORDER BY nomor_versi DESC LIMIT 1 FOR UPDATE', [id]))[0];
          if (old.current_published_version_id || !latest || !['DRAF', 'REVISI'].includes(latest.status_workflow))
            throw new ConflictException('Identitas dokumen hanya dapat diubah sebelum verifikasi');
        }
        const jenis = (
          await this.repo.rows(
            db,
            b.jenisDokumenId
              ? 'SELECT id,kode,nama FROM jenis_dokumen WHERE id=? AND aktif=1 FOR SHARE'
              : 'SELECT id,kode,nama FROM jenis_dokumen WHERE id=?',
            [b.jenisDokumenId ?? old.jenis_dokumen_id],
          )
        )[0] as any;
        if (!jenis) throw new NotFoundException('Jenis dokumen aktif tidak ditemukan');
        const peruntukan = b.peruntukan === undefined ? old.peruntukan : b.peruntukan;
        if (peruntukan && !jenisSop(jenis))
          throw new UnprocessableEntityException(PERUNTUKAN_BUKAN_SOP);
        await this.repo.write(
          db,
          'UPDATE dokumen SET kode_dokumen=COALESCE(?,kode_dokumen),slug=COALESCE(?,slug),jenis_dokumen_id=COALESCE(?,jenis_dokumen_id),peruntukan=? WHERE id=?',
          [b.kodeDokumen ?? null, b.slug ?? null, b.jenisDokumenId ?? null, peruntukan ?? null, id],
        );
        await this.audit.recordDomain(
          {
            module: 'documents',
            action: 'UPDATE',
            entityType: 'dokumen',
            entityId: id,
            actorId: actor.id,
            before: { slug: old.slug, peruntukan: old.peruntukan ?? null },
            after: { slug: b.slug ?? old.slug, peruntukan: peruntukan ?? null },
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
            'SELECT id,created_by,peruntukan FROM dokumen WHERE id=? AND deleted_at IS NULL FOR UPDATE',
            [id],
          )
        )[0];
        if (!d) throw new NotFoundException();
        cekPeruntukanPanel(actor, d.peruntukan);
        cekAksesSop(d.peruntukan, b.tingkatAkses);
        cekPemilikAtauSuperadmin(actor, (d as any).created_by);
        const r = (
          await this.repo.rows(
            db,
            'SELECT COALESCE(MAX(nomor_versi),0)+1 n FROM dokumen_versi WHERE dokumen_id=?',
            [id],
          )
        )[0] as any;
        const vid = await this.insertVersion(db, id, Number(r.n), b, actor);
        await this.bindTerms(db, vid, b.kategoriId ?? [], b.tagId ?? [], actor);
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
        await this.repo.rows(
          db,
          'SELECT v.*,d.created_by document_created_by,d.peruntukan FROM dokumen_versi v JOIN dokumen d ON d.id=v.dokumen_id WHERE v.id=? AND d.deleted_at IS NULL FOR UPDATE',
          [id],
        )
      )[0] as any;
      if (!v) throw new NotFoundException();
      cekPeruntukanPanel(actor, v.peruntukan);
      cekPemilikAtauSuperadmin(actor, v.document_created_by);
      cekAksesSop(v.peruntukan, b.tingkatAkses ?? v.tingkat_akses);
      if (
        !actor.peran.includes('SUPERADMIN') &&
        String(v.created_by) !== actor.id
      )
        throw new NotFoundException();
      if (!['DRAF', 'REVISI'].includes(v.status_workflow))
        throw new ConflictException('Versi yang diajukan tidak dapat diubah');
      if (
        !actor.peran.includes('SUPERADMIN') &&
        b.unitKerjaId !== undefined &&
        b.unitKerjaId !== actor.unitKerjaId
      )
        throw new UnprocessableEntityException('Dokumen hanya dapat dimasukkan untuk unit kerja akun Anda');
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
        await this.bindTerms(db, id, b.kategoriId, [], actor);
      }
      if (b.tagId) {
        await this.repo.write(db, 'DELETE FROM dokumen_versi_tag WHERE dokumen_versi_id=?', [id]);
        await this.bindTerms(db, id, [], b.tagId, actor);
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
    confirmation?: KonfirmasiDampakPublikasi,
  ) {
    const permission = {
      SUBMIT: 'workflow.submit',
      RETURN: 'workflow.return',
      APPROVE: 'workflow.approve',
    } as const;
    this.allow(actor, permission[action]);
    if (action !== 'SUBMIT') cekSuperadmin(actor);
    if (action === 'APPROVE') {
      const data = skemaSetujuiDokumen.parse({ catatan: note, konfirmasi: confirmation });
      note = data.catatan;
      confirmation = data.konfirmasi;
    }
    const preview = confirmation ? await this.impact(actor, id) : undefined;
    if (confirmation && (confirmation.tokenKonfirmasi !== preview?.tokenKonfirmasi || JSON.stringify(confirmation.dampak) !== JSON.stringify(preview.dampak)))
      throw new ConflictException('Dampak berubah; muat ulang preview');
    return this.repo.transaction(async (db) => {
      // Persetujuan SOP mengunci dokumen lebih dahulu, sama seperti penerbitan biasa.
      let publicationDocument: any;
      if (preview) {
        const hint = (await this.repo.rows(db, 'SELECT dokumen_id FROM dokumen_versi WHERE id=?', [id]))[0];
        if (!hint) throw new NotFoundException();
        publicationDocument = (await this.repo.rows(db,
          'SELECT id,current_published_version_id FROM dokumen WHERE id=? FOR UPDATE', [hint.dokumen_id]))[0];
        if (!publicationDocument) throw new NotFoundException();
      }
      const v = (
        await this.repo.rows(
          db,
          'SELECT v.*,d.created_by document_created_by,d.peruntukan FROM dokumen_versi v JOIN dokumen d ON d.id=v.dokumen_id AND d.deleted_at IS NULL WHERE v.id=? FOR UPDATE',
          [id],
        )
      )[0] as any;
      if (!v) throw new NotFoundException();
      cekPeruntukanPanel(actor, v.peruntukan);
      if (action === 'APPROVE' && v.peruntukan === 'PERMOHONAN_SK') {
        this.allow(actor, 'workflow.publish');
        if (!preview || !publicationDocument)
          throw new UnprocessableEntityException('Tinjau dan konfirmasi penerbitan SOP sebelum menyetujui');
        if (!['publik', 'internal'].includes(v.tingkat_akses))
          throw new UnprocessableEntityException('Akses SOP Permohonan SK harus Publik atau Dosen/Staf');
      } else if (preview) {
        throw new ConflictException('Persetujuan sekaligus terbit hanya untuk SOP Permohonan SK');
      }
      if (action === 'SUBMIT') {
        cekPemilikAtauSuperadmin(actor, v.document_created_by);
        if (
          !actor.peran.includes('SUPERADMIN') &&
          String(v.created_by) !== actor.id
        )
          throw new NotFoundException();
      }
      const from = v.status_workflow;
      const ownSuperadmin = actor.peran.includes('SUPERADMIN') && String(v.created_by) === actor.id && String(v.document_created_by) === actor.id;
      if (action === 'SUBMIT' && ownSuperadmin)
        throw new ConflictException('Draf milik Superadmin disetujui langsung tanpa masuk antrean verifikasi');
      const to = action === 'SUBMIT' ? 'DIAJUKAN' : action === 'RETURN' ? 'REVISI' : 'DISETUJUI';
      const valid =
        action === 'SUBMIT'
          ? ['DRAF', 'REVISI'].includes(from)
          : action === 'RETURN'
            ? from === 'DIAJUKAN'
            : from === 'DIAJUKAN' || (ownSuperadmin && ['DRAF', 'REVISI'].includes(from));
      if (!valid) throw new ConflictException('Transisi workflow tidak sah');
      if (action === 'RETURN' && !note?.trim())
        throw new UnprocessableEntityException('Catatan revisi wajib diisi');
      if (action === 'APPROVE' && String(v.created_by) === actor.id && !ownSuperadmin)
        throw new ForbiddenException('Pembuat versi tidak boleh menyetujui versinya sendiri');
      if (action === 'SUBMIT' || action === 'APPROVE') {
        const kategori = await this.repo.rows(db,
          'SELECT CAST(kategori_id AS CHAR) id FROM dokumen_versi_kategori WHERE dokumen_versi_id=?', [id]);
        const ready = skemaKesiapanPengajuan.safeParse({
          judul: v.judul, deskripsi: v.deskripsi, nomor: v.nomor, tahun: v.tahun,
          pic: v.pic, tanggalPenetapan: v.tanggal_penetapan,
          tingkatAkses: v.tingkat_akses, kategoriId: kategori.map((k) => String(k.id)),
        });
        if (!ready.success)
          throw new UnprocessableEntityException(`Lengkapi data pengajuan: ${pesanKekuranganPengajuan(ready.error.issues).join('; ')}`);
        // Kunci versi yang sama dengan unggahan: pengajuan tidak dapat berlomba dengan penggantian file.
        await this.files.assertSubmissionReady(db, id);
        if (action === 'SUBMIT' && !actor.peran.includes('SUPERADMIN')) {
          if (!actor.unitKerjaId || String(v.unit_kerja_id) !== actor.unitKerjaId)
            throw new UnprocessableEntityException('Unit dokumen harus sesuai unit akun Anda');
          for (const k of kategori) {
            const allowed = await this.repo.rows(db,
              'SELECT k.id FROM kategori k JOIN unit_kerja u ON u.kode=k.kode WHERE k.id=? AND k.aktif=1 AND u.id=? AND u.aktif=1 AND u.deleted_at IS NULL FOR SHARE',
              [k.id, actor.unitKerjaId]);
            if (!allowed.length) throw new UnprocessableEntityException('Kategori pengajuan harus sesuai unit akun Anda');
          }
          await this.assertOwnedRelationTargets(db, actor, id);
        }
      }
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
          after: { status: to, ...(note ? { reason: note } : {}), ...(action === 'APPROVE' && from !== 'DIAJUKAN' ? { jalur: 'SUPERADMIN_LANGSUNG' } : {}) },
        },
        db,
      );
      if (preview && action === 'APPROVE')
        return this.publishApprovedVersion(db, actor, id, publicationDocument, v, preview);
      return { id, statusWorkflow: to };
    });
  }
  private async assertOwnedRelationTargets(db: any, actor: Actor, versionId: string) {
    if (actor.peran.includes('SUPERADMIN')) return;
    const denied = await this.repo.rows(db,
      "SELECT r.id FROM dokumen_relasi r JOIN dokumen d ON d.id=r.target_document_id LEFT JOIN dokumen_versi pv ON pv.id=d.current_published_version_id WHERE r.source_version_id=? AND r.jenis_relasi IN ('MENGUBAH','MENCABUT') AND (d.created_by<>? OR pv.created_by IS NULL OR pv.created_by<>? OR d.peruntukan IS NOT NULL OR d.deleted_at IS NOT NULL) LIMIT 1 FOR SHARE",
      [versionId, actor.id, actor.id]);
    if (denied.length) throw new NotFoundException('Dokumen target tidak ditemukan');
  }
  async relations(actor: Actor, id: string) {
    cekBacaPanel(actor, 'documents.read_admin');
    const source = (
      await this.repo.rows(
        this.repo.pool,
        'SELECT d.created_by,d.peruntukan FROM dokumen_versi v JOIN dokumen d ON d.id=v.dokumen_id AND d.deleted_at IS NULL WHERE v.id=?',
        [id],
      )
    )[0] as any;
    if (!source) throw new NotFoundException();
    cekPeruntukanPanel(actor, source.peruntukan);
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
            'SELECT v.dokumen_id,v.status_workflow,v.created_by,d.created_by document_created_by,d.peruntukan FROM dokumen_versi v JOIN dokumen d ON d.id=v.dokumen_id AND d.deleted_at IS NULL WHERE v.id=? FOR UPDATE',
            [id],
          )
        )[0] as any;
        if (!v) throw new NotFoundException();
        cekPeruntukanPanel(actor, v.peruntukan);
        cekPemilikAtauSuperadmin(actor, v.document_created_by);
        if (
          !actor.peran.includes('SUPERADMIN') &&
          String(v.created_by) !== actor.id
        )
          throw new NotFoundException();
        if (!['DRAF', 'REVISI'].includes(v.status_workflow)) throw new ConflictException();
        if (String(v.dokumen_id) === b.targetDocumentId)
          throw new UnprocessableEntityException(
            'Dokumen tidak dapat berelasi dengan dirinya sendiri',
          );
        const target = (
          await this.repo.rows(
            db,
            'SELECT d.id,d.created_by,d.peruntukan,d.status_hukum,d.current_published_version_id,pv.created_by published_version_created_by FROM dokumen d LEFT JOIN dokumen_versi pv ON pv.id=d.current_published_version_id WHERE d.id=? AND d.deleted_at IS NULL FOR SHARE',
            [b.targetDocumentId],
          )
        )[0] as any;
        if (!target) throw new NotFoundException('Dokumen target tidak ditemukan');
        cekPeruntukanPanel(actor, target.peruntukan);
        // Hanya peraturan yang sudah berlaku (terbit) yang dapat diubah atau
        // dicabut, dan peraturan yang sudah dicabut tidak dapat diubah lagi.
        if (b.jenisRelasi === 'MENGUBAH' || b.jenisRelasi === 'MENCABUT') {
          cekPemilikAtauSuperadmin(actor, target.created_by);
          if (!actor.peran.includes('SUPERADMIN') && target.current_published_version_id && String(target.published_version_created_by) !== actor.id)
            throw new NotFoundException('Dokumen target tidak ditemukan');
          if (!target.current_published_version_id)
            throw new UnprocessableEntityException(
              'Dokumen yang belum terbit tidak dapat diubah atau dicabut',
            );
          if (target.status_hukum === 'DICABUT')
            throw new UnprocessableEntityException(
              'Dokumen ini sudah dicabut sehingga tidak dapat diubah atau dicabut lagi',
            );
        }
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
          'SELECT dr.id,v.status_workflow,v.created_by,d.created_by document_created_by,d.peruntukan FROM dokumen_relasi dr JOIN dokumen_versi v ON v.id=dr.source_version_id JOIN dokumen d ON d.id=v.dokumen_id AND d.deleted_at IS NULL WHERE dr.id=? AND dr.source_version_id=? FOR UPDATE',
          [rid, id],
        )
      )[0] as any;
      if (!r) throw new NotFoundException();
      cekPeruntukanPanel(actor, r.peruntukan);
      cekPemilikAtauSuperadmin(actor, r.document_created_by);
      if (
        !actor.peran.includes('SUPERADMIN') &&
        String(r.created_by) !== actor.id
      )
        throw new NotFoundException();
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
    cekSuperadmin(actor);
    this.allow(actor, 'workflow.publish');
    const v = (
      await this.repo.rows(
        this.repo.pool,
        'SELECT v.id,v.status_workflow,d.peruntukan FROM dokumen_versi v JOIN dokumen d ON d.id=v.dokumen_id AND d.deleted_at IS NULL WHERE v.id=?',
        [id],
      )
    )[0] as any;
    if (!v) throw new NotFoundException();
    if (v.status_workflow !== 'DISETUJUI') {
      if (v.peruntukan !== 'PERMOHONAN_SK' || !['DRAF', 'REVISI', 'DIAJUKAN'].includes(v.status_workflow)) throw new ConflictException();
      this.allow(actor, 'workflow.approve');
    }
    const rows = (await this.repo.rows(
      this.repo.pool,
      "SELECT CAST(d.id AS CHAR) targetDocumentId,d.status_hukum statusSaatIni,r.jenis_relasi FROM dokumen_relasi r JOIN dokumen d ON d.id=r.target_document_id WHERE r.source_version_id=? AND r.jenis_relasi IN ('MENGUBAH','MENCABUT') ORDER BY d.id",
      [id],
    )) as any[];
    const dampak = rows.map((r) => ({
      targetDocumentId: r.targetDocumentId,
      statusSaatIni: r.statusSaatIni,
      jenisRelasi: r.jenis_relasi,
      statusUsulan: statusUsulan(r.jenis_relasi, r.statusSaatIni),
    }));
    const snapshot = JSON.stringify({ id, impacts: dampak });
    const token = createHmac('sha256', this.cfgKey()).update(snapshot).digest('base64url');
    return { versiId: id, tokenKonfirmasi: token, dampak, perluKonfirmasi: true as const };
  }
  async publish(actor: Actor, id: string, raw: unknown) {
    cekSuperadmin(actor);
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
      return this.publishApprovedVersion(db, actor, id, doc, v, preview);
    });
  }
  private async publishApprovedVersion(
    db: any, actor: Actor, id: string, doc: any, v: any,
    preview: Awaited<ReturnType<CoreBackendService['impact']>>,
  ) {
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
          statusUsulan: statusUsulan(r.jenis_relasi, r.statusSaatIni),
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
      const next = statusUsulan(r.jenis_relasi, r.statusSaatIni);
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
  }
  async withdraw(actor: Actor, id: string, raw: unknown) {
    cekSuperadmin(actor);
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
