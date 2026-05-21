import { InAppNotification } from '../types';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

type NotificationSetter = (updater: (prev: InAppNotification[]) => InAppNotification[]) => void;

export interface UnifiedNotificationPayload {
  id?: string;
  title: string;
  description: string;
  type: InAppNotification['type'];
  friendId?: string;
  recipientRole?: InAppNotification['recipientRole'];
  recipientHandles?: string[];
  bookingId?: string;
}

export const normalizeHandle = (value: string) => value.trim().toLowerCase().replace(/^@/, '');

let serviceWorkerRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

const buildNotification = (payload: UnifiedNotificationPayload, createdAt: string): InAppNotification => ({
  id: payload.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: payload.title,
  description: payload.description,
  type: payload.type,
  friendId: payload.friendId,
  recipientRole: payload.recipientRole,
  recipientHandles: payload.recipientHandles && payload.recipientHandles.length > 0 ? payload.recipientHandles : undefined,
  bookingId: payload.bookingId,
  read: false,
  createdAt,
});

const getWebPushPublicKey = () => {
  if (typeof window === 'undefined') return '';
  const envKey = (import.meta as any)?.env?.VITE_WEB_PUSH_PUBLIC_KEY || '';
  const localKey = window.localStorage.getItem('cumbre_webpush_public_key') || '';
  return String(envKey || localKey || '').trim();
};

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const getServiceWorkerRegistration = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  if (serviceWorkerRegistrationPromise) return serviceWorkerRegistrationPromise;
  serviceWorkerRegistrationPromise = navigator.serviceWorker
    .register('/sw.js')
    .then((registration) => registration)
    .catch((error) => {
      console.error('Service worker registration failed:', error);
      return null;
    });
  return serviceWorkerRegistrationPromise;
};

const ensureMobilePushSubscription = async () => {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  const registration = await getServiceWorkerRegistration();
  if (!registration) return;
  const publicKey = getWebPushPublicKey();
  if (!publicKey) return;

  try {
    const currentSubscription = await registration.pushManager.getSubscription();
    if (currentSubscription) {
      window.localStorage.setItem('cumbre_push_subscription', JSON.stringify(currentSubscription.toJSON()));
      return;
    }
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    window.localStorage.setItem('cumbre_push_subscription', JSON.stringify(subscription.toJSON()));
  } catch (error) {
    console.error('Push subscription failed:', error);
  }
};

export const pushBrowserNotification = async (title: string, body: string) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  const registration = await getServiceWorkerRegistration();
  if (registration && 'showNotification' in registration) {
    await registration.showNotification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `explorer-${Date.now()}`,
    });
    return;
  }
  new Notification(title, { body });
};

export const pushDeviceNotification = async (title: string, body: string) => {
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now() % 2147483647,
            title,
            body,
            schedule: { at: new Date(Date.now() + 200) },
          },
        ],
      });
      return;
    } catch (error) {
      console.error('Native local notification failed, fallback to browser API:', error);
    }
  }
  await pushBrowserNotification(title, body);
};

export const notify = (
  setNotifications: NotificationSetter,
  payload: UnifiedNotificationPayload,
  options?: { createdAt?: string; push?: boolean }
) => {
  const createdAt = options?.createdAt || 'Ahora';
  const notification = buildNotification(payload, createdAt);
  setNotifications((prev) => [notification, ...prev]);
  if (options?.push) {
    void pushDeviceNotification(notification.title, notification.description);
  }
};

export const requestPushPermissionIfNeeded = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      const permissions = await LocalNotifications.requestPermissions();
      if (permissions.display !== 'granted') return;
    } catch (error) {
      console.error('Native notification permission request failed:', error);
    }
    return;
  }
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch (error) {
      console.error('Push permission request failed:', error);
    }
  }
  if (Notification.permission === 'granted') {
    await ensureMobilePushSubscription();
  }
};

export const isNotificationVisibleForUser = (
  notification: InAppNotification,
  currentRole: 'provider' | 'explorer',
  currentHandle: string
) => {
  const normalizedCurrentHandle = normalizeHandle(currentHandle);
  const hasHandleTarget = Array.isArray(notification.recipientHandles) && notification.recipientHandles.length > 0;
  const matchesHandle = hasHandleTarget
    ? notification.recipientHandles!.map(normalizeHandle).includes(normalizedCurrentHandle)
    : false;
  const matchesRole = !notification.recipientRole || notification.recipientRole === 'both' || notification.recipientRole === currentRole;
  return matchesHandle || (!hasHandleTarget && matchesRole);
};

export const markVisibleNotificationsAsRead = (
  notifications: InAppNotification[],
  currentRole: 'provider' | 'explorer',
  currentHandle: string
) =>
  notifications.map((notification) =>
    isNotificationVisibleForUser(notification, currentRole, currentHandle)
      ? { ...notification, read: true }
      : notification
  );
