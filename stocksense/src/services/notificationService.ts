import { apiClient, USE_MOCKS, mockDelay } from "./apiClient";

export interface NotificationPreferences {
  emailNotifications: boolean;
  operationEmails: boolean;
  lowStockEmails: boolean;
}

const defaultPreferences: NotificationPreferences = {
  emailNotifications: true,
  operationEmails: true,
  lowStockEmails: true,
};

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  if (USE_MOCKS) return mockDelay({ ...defaultPreferences }, 250);
  return apiClient.get<NotificationPreferences>("/notifications/preferences");
}

export async function saveNotificationPreferences(preferences: NotificationPreferences): Promise<NotificationPreferences> {
  if (USE_MOCKS) return mockDelay(preferences, 350);
  return apiClient.put<NotificationPreferences>("/notifications/preferences", preferences);
}
