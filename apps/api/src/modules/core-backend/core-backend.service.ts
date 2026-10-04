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
import type { PenggunaAktif } from '@jdih/shared';
import {
  skemaBuatDokumen,
  skemaUbahDokumen,
  skemaBuatVersiDokumen,
  skemaUbahVersiDokumen,
  skemaBuatRelasi,
  skemaGrantRahasia,
  skemaRevokeRahasia,
  skemaKesiapanPublikasi,
  skemaTerbitkanDokumen,
  skemaTarikDokumen,
  skemaStatusMaster,
  skemaUnitKerja,
  skemaJenisDokumen,
  skemaKategori,
  skemaTag,
} from '@jdih/shared';
import { cekIzin } from '../identity/security.js';
import { AuditService } from '../identity/audit.service.js';
import { DocumentPolicyService } from '../identity/document-policy.service.js';
import { utc } from '../identity/identity.repository.js';
import { CoreBackendRepository } from './core-backend.repository.js';
import type { KonfigurasiApp } from '../../config/configuration.js';

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
  ) {}
  private allow(actor: Actor, permission: Parameters<typeof cekIzin>[1][number]) {
    cekIzin(actor, [permission]);
  }
  private cfgKey() {
    return this.config.get('identitas', { infer: true }).key;
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
      "INSERT INTO dokumen_versi(dokumen_id,nomor_versi,status_workflow,tingkat_akses,nomor,tahun,judul,pic,unit_kerja_id,tanggal_penetapan,created_by) VALUES(?,?,'DRAF',?,?,?,?,?,?,?,?)",
      [
        did,
        n,
        v.tingkatAkses,
        v.nomor ?? null,
        v.tahun ?? null,
        v.judul,
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
  async document(actor: Actor, id: string) {
    this.allow(actor, 'documents.read_admin');
    const rows = await this.repo.rows(
      this.repo.pool,
      'SELECT CAST(d.id AS CHAR) id,d.kode_dokumen kodeDokumen,d.slug,CAST(d.jenis_dokumen_id AS CHAR) jenisDokumenId,d.status_hukum statusHukum,CAST(d.current_published_version_id AS CHAR) currentPublishedVersionId,CAST(v.id AS CHAR) versionId,v.nomor_versi nomorVersi,v.status_workflow statusWorkflow,v.tingkat_akses tingkatAkses,v.nomor,v.tahun,v.judul,v.pic,CAST(v.unit_kerja_id AS CHAR) unitKerjaId,v.tanggal_penetapan tanggalPenetapan FROM dokumen d LEFT JOIN dokumen_versi v ON v.dokumen_id=d.id WHERE d.id=? AND d.deleted_at IS NULL ORDER BY v.nomor_versi DESC',
      [id],
    );
    if (!rows.length) throw new NotFoundException();
    if (
      (rows as any[]).some((r) => r.tingkatAkses === 'rahasia') &&
      !actor.izin.includes('secret.read_admin')
    )
      throw new NotFoundException();
    return { document: rows[0], versions: rows.slice(1) };
  }
  async publicDetail(slug: string, actor?: Actor) {
    const r = (
      await this.repo.rows(
        this.repo.pool,
        "SELECT CAST(d.id AS CHAR) id,CAST(j.nama AS CHAR) tipe,v.tingkat_akses,d.status_hukum statusHukum,v.status_workflow,IF(d.current_published_version_id=v.id,1,0) current,IF(d.deleted_at IS NULL,0,1) deleted,v.judul,v.nomor,v.tanggal_penetapan tanggalPenetapan,v.pic FROM dokumen d JOIN dokumen_versi v ON v.id=d.current_published_version_id JOIN jenis_dokumen j ON j.id=d.jenis_dokumen_id WHERE d.slug=? AND v.status_workflow='TERBIT' AND d.deleted_at IS NULL",
        [slug],
      )
    )[0] as any;
    if (!r) throw new NotFoundException();
    await this.policy.assertRead(
      {
        id: r.id,
        tingkatAkses: r.tingkat_akses,
        published: r.status_workflow === 'TERBIT',
        current: Boolean(r.current),
        deleted: Boolean(r.deleted),
      },
      actor,
    );
    return {
      tipe: r.tipe,
      judul: r.judul,
      nomor: r.nomor,
      tanggalPenetapan: r.tanggalPenetapan,
      statusHukum: r.statusHukum,
      pic: r.pic,
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
      if (action === 'APPROVE' && String(v.created_by) === actor.id)
        throw new ForbiddenException('Pembuat versi tidak dapat menyetujui versinya sendiri');
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
      // The version row is the serialization point for publish and future file-metadata writes.
      // Phase 3 checks metadata readiness only; storage-object validation belongs to Phase 4.
      const mainFile = (
        await this.repo.rows(
          db,
          "SELECT id FROM dokumen_berkas WHERE dokumen_versi_id=? AND jenis_berkas='UTAMA' LIMIT 1 FOR UPDATE",
          [id],
        )
      )[0];
      if (!mainFile) throw new UnprocessableEntityException('Metadata file UTAMA wajib tersedia');
      const fresh = (await this.repo.rows(
        db,
        "SELECT CAST(d.id AS CHAR) targetDocumentId,d.status_hukum statusSaatIni,r.jenis_relasi FROM dokumen_relasi r JOIN dokumen d ON d.id=r.target_document_id WHERE r.source_version_id=? AND r.jenis_relasi IN ('MENGUBAH','MENCABUT') ORDER BY d.id FOR UPDATE",
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
            'Dampak relasi hukum saat publikasi',
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
  async grants(actor: Actor, id: string) {
    this.allow(actor, 'secret.manage');
    return this.repo.rows(
      this.repo.pool,
      'SELECT CAST(g.id AS CHAR) id,CAST(g.pengguna_id AS CHAR) penggunaId,CAST(g.granted_by AS CHAR) grantedBy,g.granted_at grantedAt,g.expires_at expiresAt,g.revoked_at revokedAt,g.grant_reason grantReason,g.revoke_reason revokeReason FROM dokumen_akses_rahasia g WHERE g.dokumen_id=? ORDER BY g.id DESC',
      [id],
    );
  }
  async grant(actor: Actor, id: string, raw: unknown) {
    this.allow(actor, 'secret.manage');
    const b = skemaGrantRahasia.parse(raw);
    return this.repo.transaction(async (db) => {
      const d = (await this.repo.rows(db, 'SELECT id FROM dokumen WHERE id=? FOR UPDATE', [id]))[0];
      if (!d) throw new NotFoundException();
      if (
        !(
          await this.repo.rows(
            db,
            "SELECT id FROM dokumen_versi WHERE dokumen_id=? AND tingkat_akses='rahasia' LIMIT 1 FOR SHARE",
            [id],
          )
        ).length
      )
        throw new ConflictException('Grant hanya berlaku untuk dokumen dengan versi Rahasia');
      const u = (
        await this.repo.rows(
          db,
          "SELECT p.id FROM pengguna p JOIN pengguna_peran pp ON pp.pengguna_id=p.id JOIN peran r ON r.id=pp.peran_id WHERE p.id=? AND p.status='AKTIF' AND p.deleted_at IS NULL AND r.kode='DOSEN_STAF' FOR UPDATE",
          [b.penggunaId],
        )
      )[0];
      if (!u) throw new NotFoundException('Pengguna Dosen/Staf aktif tidak ditemukan');
      const prev = (
        await this.repo.rows(
          db,
          'SELECT id,expires_at FROM dokumen_akses_rahasia WHERE dokumen_id=? AND pengguna_id=? AND revoked_at IS NULL FOR UPDATE',
          [id, b.penggunaId],
        )
      )[0] as any;
      if (
        prev &&
        (!prev.expires_at || new Date(String(prev.expires_at).replace(' ', 'T') + 'Z') > new Date())
      )
        throw new ConflictException('Grant aktif sudah ada');
      if (prev)
        await this.repo.write(
          db,
          "UPDATE dokumen_akses_rahasia SET revoked_at=UTC_TIMESTAMP(6),revoke_reason='Masa grant berakhir' WHERE id=?",
          [prev.id],
        );
      await this.repo.write(
        db,
        'INSERT INTO dokumen_akses_rahasia(dokumen_id,pengguna_id,granted_by,expires_at,grant_reason) VALUES(?,?,?,?,?)',
        [id, b.penggunaId, actor.id, b.expiresAt ?? null, b.alasan],
      );
      const gid = await this.repo.id(db);
      await this.audit.recordDomain(
        {
          module: 'secret-access',
          action: 'GRANT',
          entityType: 'dokumen_akses_rahasia',
          entityId: gid,
          actorId: actor.id,
          after: { targetId: b.penggunaId },
        },
        db,
      );
      return { id: gid, dokumenId: id, penggunaId: b.penggunaId, expiresAt: b.expiresAt ?? null };
    });
  }
  async revoke(actor: Actor, id: string, gid: string, raw: unknown) {
    this.allow(actor, 'secret.manage');
    const b = skemaRevokeRahasia.parse(raw);
    return this.repo.transaction(async (db) => {
      const g = (
        await this.repo.rows(
          db,
          'SELECT id FROM dokumen_akses_rahasia WHERE id=? AND dokumen_id=? AND revoked_at IS NULL FOR UPDATE',
          [gid, id],
        )
      )[0];
      if (!g) throw new NotFoundException();
      await this.repo.write(
        db,
        'UPDATE dokumen_akses_rahasia SET revoked_at=UTC_TIMESTAMP(6),revoked_by=?,revoke_reason=? WHERE id=?',
        [actor.id, b.alasan, gid],
      );
      await this.audit.recordDomain(
        {
          module: 'secret-access',
          action: 'REVOKE',
          entityType: 'dokumen_akses_rahasia',
          entityId: gid,
          actorId: actor.id,
          after: { reason: b.alasan },
        },
        db,
      );
      return { id: gid, revoked: true };
    });
  }
}
