export interface ElectronAPI {
  getAudioDevices(): Promise<MediaDeviceInfo[]>;
  getVersion(): Promise<string>;
}
