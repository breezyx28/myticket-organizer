import { organizerApi } from '@/store/api/organizerApi';
import { apiDispatch, apiUnwrap } from '@/services/apiDispatch';
import type { NotificationsListPage, OrganizerNotification } from '@/types/domain';

export async function listNotifications(options?: { page?: number; since?: string }): Promise<NotificationsListPage> {
  return apiUnwrap<NotificationsListPage>(apiDispatch(organizerApi.endpoints.listNotifications.initiate(options)));
}

export async function markNotificationRead(id: string): Promise<OrganizerNotification> {
  return apiUnwrap<OrganizerNotification>(apiDispatch(organizerApi.endpoints.markNotificationRead.initiate(id)));
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiUnwrap(apiDispatch(organizerApi.endpoints.markAllNotificationsRead.initiate()));
}
