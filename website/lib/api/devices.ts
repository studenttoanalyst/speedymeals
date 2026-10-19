/**
 * Device-token registration for push notifications.
 * Backend binds the token to the identity in the access token.
 */
import { apiClient } from './client';

export async function registerDeviceToken(token: string): Promise<void> {
  await apiClient<{ registered: boolean }>('/devices', {
    method: 'POST',
    body: JSON.stringify({ token, platform: 'web' }),
  });
}

export async function unregisterDeviceToken(token: string): Promise<void> {
  await apiClient<{ removed: boolean }>(`/devices?token=${encodeURIComponent(token)}`, {
    method: 'DELETE',
  });
}
