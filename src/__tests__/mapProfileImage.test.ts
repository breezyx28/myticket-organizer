import { describe, expect, it } from 'vitest';
import { mapApiProfileToOrganizerUser } from '@/lib/api/mapProfile';
import { parseProfileImageUrl } from '@/lib/api/parseProfileUpload';

describe('parseProfileImageUrl', () => {
  it('reads profile_image_url from POST /me/profile-image response', () => {
    const url = parseProfileImageUrl({
      data: {
        user_id: 1,
        profile_image_url: 'https://api.example.com/storage/users/profile-images/1/abc.jpg',
        avatar_url: 'https://api.example.com/storage/users/profile-images/1/abc.jpg',
      },
    });
    expect(url).toBe('https://api.example.com/storage/users/profile-images/1/abc.jpg');
  });
});

describe('mapApiProfileToOrganizerUser profile image', () => {
  it('maps profile_image_url and avatar_url from GET /me/profile', () => {
    const user = mapApiProfileToOrganizerUser({
      id: 1,
      display_name: 'Pulse Events',
      profile_image_url: 'https://cdn.example.com/me.jpg',
      avatar_url: 'https://cdn.example.com/me.jpg',
      logo_url: 'https://cdn.example.com/logo.png',
    });
    expect(user.profileImageUrl).toBe('https://cdn.example.com/me.jpg');
    expect(user.logoUrl).toBe('https://cdn.example.com/logo.png');
  });
});
