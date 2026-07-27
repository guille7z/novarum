import { browser } from '$app/environment';

export function notificationsSupported(): boolean {
  return browser && 'Notification' in window;
}

export async function getNotificationPermission() {
  if (!notificationsSupported()) {
    return 'denied';
  }

  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) {
    return 'denied';
  }

  return await Notification.requestPermission();
}

export async function sendNotification(notification: NotificationOptions): Promise<boolean> {
  if ((await getNotificationPermission()) !== 'granted') {
    return false;
  }

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

export type NotificationOptions = {
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
};
