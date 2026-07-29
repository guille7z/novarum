export interface ElectronAPI {
  getAudioDevices(): Promise<MediaDeviceInfo[]>;
}
