export function contentDisposition(name: string, mode: 'inline' | 'attachment') {
  const fallback = name.replace(/[^\x20-\x7e]|[\\";]/g, '_').slice(0, 180) || 'berkas';
  const encoded = encodeURIComponent(name).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${mode}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
