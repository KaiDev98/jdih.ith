import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { pipeline } from 'node:stream/promises';
import { Transform, type Readable } from 'node:stream';
import type { KonfigurasiApp } from '../../../config/configuration.js';

export interface BerkasDisimpanSementara {
  storageKey: string;
  byte: number;
  checksum: Buffer;
}
export interface AliranBerkas {
  stream: Readable;
  size: number;
}

/** Storage abstraction. Domain services never receive a filesystem path. */
export abstract class StorageService {
  abstract stage(source: Readable): Promise<BerkasDisimpanSementara>;
  abstract finalize(staged: BerkasDisimpanSementara): Promise<void>;
  abstract discard(staged: BerkasDisimpanSementara): Promise<void>;
  abstract open(storageKey: string): Promise<AliranBerkas>;
  abstract exists(storageKey: string): Promise<boolean>;
  abstract verify(storageKey: string, size: number, checksum: Buffer): Promise<boolean>;
  abstract delete(storageKey: string): Promise<void>;
}

@Injectable()
export class LocalStorageDriver extends StorageService {
  private readonly root: string;
  private readonly staging: string;

  constructor(config: ConfigService<KonfigurasiApp, true>) {
    super();
    this.root = resolve(config.get('penyimpanan', { infer: true }).jalurLokal);
    this.staging = resolve(this.root, '.staging');
  }

  private objectPath(key: string) {
    if (!/^objects\/[a-f0-9]{2}\/[a-f0-9-]{36}$/.test(key)) throw new NotFoundException();
    const path = resolve(this.root, key);
    if (!path.startsWith(resolve(this.root) + '\\') && !path.startsWith(resolve(this.root) + '/'))
      throw new NotFoundException();
    return path;
  }

  private stagePath(key: string) {
    const id = key.split('/').at(-1);
    if (!id || !/^[a-f0-9-]{36}$/.test(id)) throw new NotFoundException();
    return resolve(this.staging, `${id}.part`);
  }

  async stage(source: Readable): Promise<BerkasDisimpanSementara> {
    await mkdir(this.staging, { recursive: true, mode: 0o700 });
    const id = randomUUID();
    const storageKey = `objects/${id.slice(0, 2)}/${id}`;
    const temporary = this.stagePath(storageKey);
    const hash = createHash('sha256');
    let byte = 0;
    const digest = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        byte += chunk.length;
        hash.update(chunk);
        callback(null, chunk);
      },
    });
    try {
      await pipeline(source, digest, createWriteStream(temporary, { flags: 'wx', mode: 0o600 }));
      if (byte === 0) throw new Error('Berkas kosong');
      return { storageKey, byte, checksum: hash.digest() };
    } catch (error) {
      await rm(temporary, { force: true });
      throw error;
    }
  }

  async finalize(staged: BerkasDisimpanSementara) {
    const source = this.stagePath(staged.storageKey);
    const target = this.objectPath(staged.storageKey);
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    await rename(source, target);
  }

  async discard(staged: BerkasDisimpanSementara) {
    await Promise.all([
      rm(this.stagePath(staged.storageKey), { force: true }),
      rm(this.objectPath(staged.storageKey), { force: true }),
    ]);
  }

  async open(storageKey: string): Promise<AliranBerkas> {
    const path = this.objectPath(storageKey);
    try {
      const info = await stat(path);
      if (!info.isFile()) throw new NotFoundException();
      return { stream: createReadStream(path), size: info.size };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new NotFoundException();
      throw error;
    }
  }

  async exists(storageKey: string) {
    try {
      return (await stat(this.objectPath(storageKey))).isFile();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  }

  async verify(storageKey: string, size: number, checksum: Buffer) {
    if (!(await this.exists(storageKey))) return false;
    const { stream, size: actualSize } = await this.open(storageKey);
    const hash = createHash('sha256');
    for await (const chunk of stream) hash.update(chunk as Buffer);
    const actual = hash.digest();
    return actualSize === size && checksum.length === actual.length && timingSafeEqual(checksum, actual);
  }

  async delete(storageKey: string) {
    await rm(this.objectPath(storageKey), { force: true });
  }
}
