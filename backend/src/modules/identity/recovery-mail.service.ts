import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import type { KonfigurasiApp } from '../../config/configuration.js';

@Injectable()
export class RecoveryMailService {
  private transport?: Transporter<SMTPTransport.SentMessageInfo>;
  constructor(private readonly config: ConfigService<KonfigurasiApp, true>) {}
  get available() {
    const cfg = this.config.get<KonfigurasiApp['surel'] | undefined>('surel');
    return Boolean(
      cfg?.pengandar === 'smtp' &&
      cfg.host &&
      cfg.port &&
      cfg.dariAlamat &&
      (!cfg.host.endsWith('gmail.com') || (cfg.pengguna && cfg.kataSandi)),
    );
  }
  assertAvailable() {
    if (!this.available)
      throw new ServiceUnavailableException(
        'Layanan pemulihan password belum tersedia. Hubungi pengelola.',
      );
  }
  private smtp() {
    this.assertAvailable();
    const cfg = this.config.get('surel', { infer: true });
    this.transport ??= nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      requireTLS: cfg.wajibTls,
      auth: cfg.pengguna ? { user: cfg.pengguna, pass: cfg.kataSandi } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      logger: false,
      debug: false,
      disableFileAccess: true,
      disableUrlAccess: true,
      tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    });
    return this.transport;
  }
  async verify() {
    await this.smtp().verify();
  }
  async send(recipient: string, link?: string) {
    const cfg = this.config.get('surel', { infer: true });
    const subject = link
      ? 'Atur ulang password akun Dosen/Staf JDIH ITH'
      : 'Password akun JDIH ITH Anda telah diubah';
    const text = link
      ? `Kami menerima permintaan untuk mengatur ulang password akun Dosen/Staf JDIH ITH Anda.\n\nBuka tautan berikut untuk membuat password baru:\n${link}\n\nTautan berlaku selama 30 menit dan hanya dapat digunakan sekali. Jika Anda tidak meminta perubahan ini, abaikan email ini. Password Anda belum berubah.\n\nJDIH ITH`
      : 'Password akun Dosen/Staf JDIH ITH Anda telah berhasil diubah. Semua sesi lama telah dicabut. Jika perubahan ini bukan dilakukan oleh Anda, segera hubungi pengelola melalui portal resmi JDIH ITH.\n\nJDIH ITH';
    const result = await this.smtp().sendMail({
      from: { name: cfg.dariNama, address: cfg.dariAlamat },
      to: { address: recipient, name: '' },
      subject,
      text,
    });
    if (!result.accepted.length || result.rejected.length)
      throw new Error('SMTP did not accept delivery');
  }
}
