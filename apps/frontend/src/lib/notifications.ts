import { browser } from '$app/environment';
import { isTauri } from '@tauri-apps/api/core';
import { isPermissionGranted } from '@tauri-apps/plugin-notification';

export function notificationsSupported(): boolean {
  if (!browser) return false;

  return isTauri() || 'Notification' in window;
}

export async function getNotificationPermission() {
  if (!notificationsSupported()) {
    return 'denied';
  }

  if (isTauri()) {
    const { isPermissionGranted } = await import('@tauri-apps/plugin-notification');
    return (await isPermissionGranted()) ? 'granted' : 'denied';
  }

  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) {
    return 'denied';
  }

  if (isTauri()) {
    const { requestPermission, isPermissionGranted } =
      await import('@tauri-apps/plugin-notification');

    if (await isPermissionGranted()) {
      return 'granted';
    }
    return await requestPermission();
  }

  return await Notification.requestPermission();
}

export async function sendNotification(notification: NotificationOptions): Promise<boolean> {
  if (!(await isPermissionGranted())) {
    return false;
  }

  if (isTauri()) {
    const { sendNotification } = await import('@tauri-apps/plugin-notification');
    sendNotification(notification);
    return true;
  }

  if ('Notification' in window) {
    const n = new Notification(notification.title, {
      body: notification.body,
      icon: notification.icon,
      tag: notification.tag,
    });

    if (notification.onClick) {
      n.onclick = () => {
        window.focus();
        notification.onClick?.();
        n.close();
      };
    }

    return true;
  }

  return false;
}

export type NotificationOptions = {
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
};
