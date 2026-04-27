import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import { Camera } from '@mediapipe/camera_utils';

export class VideoEffectService {
  private selfieSegmentation: SelfieSegmentation | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement;
  private isActive: boolean = false;
  private outputStream: MediaStream | null = null;
  private mode: 'blur' | 'grayscale' | 'sepia' | 'none' = 'none';

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;
  }

  async init() {
    if (this.selfieSegmentation) return;

    this.selfieSegmentation = new SelfieSegmentation({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
      }
    });

    this.selfieSegmentation.setOptions({
      modelSelection: 1,
    });

    this.selfieSegmentation.onResults((results) => {
      this.renderResults(results);
    });
  }

  private renderResults(results: any) {
    if (!this.isActive) return;

    const { width, height } = results.image;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    this.ctx.save();
    this.ctx.clearRect(0, 0, width, height);

    if (this.mode === 'blur') {
      // Background Blur logic
      this.ctx.drawImage(results.segmentationMask, 0, 0, width, height);
      this.ctx.globalCompositeOperation = 'source-in';
      this.ctx.drawImage(results.image, 0, 0, width, height);

      this.ctx.globalCompositeOperation = 'destination-over';
      this.ctx.filter = 'blur(15px)';
      this.ctx.drawImage(results.image, 0, 0, width, height);
    } else {
      // Filter logic
      if (this.mode === 'grayscale') this.ctx.filter = 'grayscale(100%)';
      if (this.mode === 'sepia') this.ctx.filter = 'sepia(100%)';
      this.ctx.drawImage(results.image, 0, 0, width, height);
    }

    this.ctx.restore();
  }

  async startEffect(inputStream: MediaStream, mode: 'blur' | 'grayscale' | 'sepia' = 'blur'): Promise<MediaStream> {
    this.mode = mode;
    await this.init();
    this.isActive = true;
    this.stream = inputStream;
    this.videoElement.srcObject = inputStream;
    
    await this.videoElement.play();

    const processVideo = async () => {
      if (!this.isActive) return;
      if (this.videoElement.readyState >= 2) {
        if (this.mode === 'blur') {
          await this.selfieSegmentation?.send({ image: this.videoElement });
        } else {
          // For filters, we don't need segmentation, but we keep the loop for consistency
          this.renderResults({ image: this.videoElement, segmentationMask: null });
        }
      }
      requestAnimationFrame(processVideo);
    };

    processVideo();

    this.outputStream = this.canvas.captureStream(30);
    const audioTracks = inputStream.getAudioTracks();
    audioTracks.forEach(track => this.outputStream?.addTrack(track));

    return this.outputStream;
  }

  stopEffect() {
    this.isActive = false;
    if (this.outputStream) {
      this.outputStream.getTracks().forEach(t => t.stop());
    }
  }
}

export const videoEffectService = new VideoEffectService();
