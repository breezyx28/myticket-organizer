import type { OrganizerUser } from '@/types/domain';
import { loadState, updateState } from '@/services/organizerStore';

const delay = (ms = 80) => new Promise((r) => setTimeout(r, ms));

export async function getProfile(): Promise<OrganizerUser> {
  await delay();
  return loadState().profile;
}

export function updateProfile(patch: Partial<OrganizerUser>) {
  updateState((s) => {
    s.profile = { ...s.profile, ...patch };
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('organizer-dashboard-changed'));
  }
}

export function isProfileComplete(p: OrganizerUser): boolean {
  return (
    p.displayName.trim().length >= 2 &&
    p.bio.trim().length >= 30 &&
    p.phone.trim().length >= 8 &&
    p.city.trim().length >= 2 &&
    !!p.organizationDocument &&
    (p.gallery?.length ?? 0) >= 1 &&
    !!p.venue &&
    (p.venue?.capacity ?? 0) > 0 &&
    (p.venue?.facilities?.length ?? 0) >= 1 &&
    !!p.organization &&
    (p.organization?.previousEvents?.length ?? 0) >= 1
  );
}
