import { browser } from '$app/environment';
import { Howl } from 'howler';
import NotificationSound from './sounds/notification.opus?url';
import { settings } from './settings.svelte';

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

  notificationSound();
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

export function notificationSound() {
  // notification sound by universfield in pixabay
  // https://pixabay.com/users/universfield-28281460/
  const sound = new Howl({
    src: [NotificationSound],
    volume: settings.value.notificationVolume,
  });
  sound.play();
}

export type NotificationOptions = {
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
};
