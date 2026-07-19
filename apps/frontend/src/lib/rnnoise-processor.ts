import { loadRnnoise, RnnoiseWorkletNode } from '@sapphi-red/web-noise-suppressor';
import rnnoiseWorkletUrl from '@sapphi-red/web-noise-suppressor/rnnoiseWorklet.js?url';
import rnnoiseWasmUrl from '@sapphi-red/web-noise-suppressor/rnnoise.wasm?url';
import rnnoiseSimdWasmUrl from '@sapphi-red/web-noise-suppressor/rnnoise_simd.wasm?url';
import { Track, type AudioProcessorOptions, type TrackProcessor } from 'livekit-client';

let wasmBinary: Promise<ArrayBuffer> | undefined;
const loadedContexts = new WeakMap<AudioContext, Promise<void>>();

export class RnnoiseProcessor implements TrackProcessor<Track.Kind.Audio, AudioProcessorOptions> {
  name = 'rnnoise';
  processedTrack?: MediaStreamTrack;
  private source?: MediaStreamAudioSourceNode;
  private node?: RnnoiseWorkletNode;
  private mono?: GainNode;
  private destination?: MediaStreamAudioDestinationNode;

  async init({ track, audioContext }: AudioProcessorOptions) {
    let worklet = loadedContexts.get(audioContext);
    if (!worklet) {
      worklet = audioContext.audioWorklet.addModule(rnnoiseWorkletUrl);
      loadedContexts.set(audioContext, worklet);
    }

    await Promise.all([audioContext.resume(), worklet]);
    this.source = audioContext.createMediaStreamSource(new MediaStream([track]));
    this.node = new RnnoiseWorkletNode(audioContext, {
      maxChannels: 1,
      wasmBinary: await (wasmBinary ??= loadRnnoise({
        url: rnnoiseWasmUrl,
        simdUrl: rnnoiseSimdWasmUrl,
      })),
    });
    this.mono = new GainNode(audioContext, {
      channelCount: 1,
      channelCountMode: 'explicit',
      channelInterpretation: 'discrete',
    });
    this.destination = audioContext.createMediaStreamDestination();
    this.source.connect(this.node).connect(this.mono).connect(this.destination);
    this.processedTrack = this.destination.stream.getAudioTracks()[0];
  }

  async restart(options: AudioProcessorOptions) {
    await this.destroy();
    await this.init(options);
  }

  async destroy() {
    this.source?.disconnect();
    this.node?.disconnect();
    this.node?.destroy();
    this.mono?.disconnect();
    this.destination?.disconnect();
    this.processedTrack?.stop();
    this.source = undefined;
    this.node = undefined;
    this.mono = undefined;
    this.destination = undefined;
    this.processedTrack = undefined;
  }
}
