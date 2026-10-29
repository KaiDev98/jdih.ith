/** Panjang bagian yang disensor tetap; tidak mengungkap panjang email asli. Idempoten. */
export function samarkanSurel(surel: string): string {
  const at = surel.lastIndexOf('@');
  if (at < 1 || at === surel.length - 1) return '***';
  const lokal = surel.slice(0, at);
  return `${lokal.length > 1 && !lokal.startsWith('*') ? lokal[0] : ''}***${surel.slice(at)}`;
}

/** Email lengkap hanya untuk Superadmin atau pemilik akun; identitas harus dari sesi/database. */
export function surelUntukPanel(
  surel: string,
  peran: readonly string[],
  identitas?: { pemilikId?: string; pelihatId?: string },
): string {
  const sendiri = Boolean(identitas?.pemilikId && identitas.pemilikId === identitas.pelihatId);
  return peran.includes('SUPERADMIN') || sendiri ? surel : samarkanSurel(surel);
}
