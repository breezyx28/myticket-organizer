import { describe, expect, it } from 'vitest';
import { isHttpAttachmentUrl, messageAttachmentFileName } from '@/lib/chat/messageAttachment';

describe('messageAttachment', () => {
  it('extracts filename from URL', () => {
    expect(messageAttachmentFileName('https://api.example.com/storage/marketplace/doc.jpg')).toBe('doc.jpg');
  });

  it('detects http attachment URLs', () => {
    expect(isHttpAttachmentUrl('https://example.com/a.pdf')).toBe(true);
    expect(isHttpAttachmentUrl(undefined)).toBe(false);
  });
});
