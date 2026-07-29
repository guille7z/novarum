// See https://svelte.dev/docs/kit/types#app.d.ts

import type { ElectronAPI } from "$lib/electron-api";

// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
  interface Window {
    api: ElectronAPI;
  }
}

export {};
