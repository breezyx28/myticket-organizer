export function messageAttachmentFileName(url: string): string {
  try {
    const base = new URL(url).pathname.split('/').pop();
    if (base) return decodeURIComponent(base);
  } catch {
    /* ignore */
  }
  return url;
}

export function isHttpAttachmentUrl(url: string | undefined): url is string {
  return Boolean(url?.trim() && /^https?:\/\//i.test(url.trim()));
}
