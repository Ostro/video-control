import { CommonModule } from '@angular/common';
import {
  Component,
  effect,
  ElementRef,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-video-control',
  imports: [CommonModule, FormsModule],
  templateUrl: './video-control.component.html',
  styleUrl: './video-control.component.scss',
})
export class VideoControlComponent {
  @ViewChild('video') video: ElementRef<HTMLVideoElement> | null = null;
  @ViewChild('canvas') canvas: ElementRef<HTMLCanvasElement> | null = null;

  isRecording = false;
  selectedDeviceId = signal('');
  liveStream: MediaStream | null = null;
  mediaRecorder: MediaRecorder | null = null;
  recordedBlobs: Blob[] = [];
  records: string[] = [];
  snapshots: string[] = [];
  deviceList = signal<Array<{ deviceId: string; label: string }>>([]);

  constructor() {
    this.getAvailableDevices();

    navigator.mediaDevices.ondevicechange = () => {
      this.getAvailableDevices();
    };

    effect(async () => {
      if (this.selectedDeviceId()) {
        if (this.liveStream) {
          this.stopRecording();
          this.stopStream();
          await this.startStream();
        }
      }
    });
  }

  async getAvailableDevices() {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      this.deviceList.set([]);
      this.selectedDeviceId.set('');

      devices.forEach((device) => {
        if (device.kind === 'videoinput' && device.deviceId) {
          this.deviceList().push({
            deviceId: device.deviceId,
            label: device.label,
          });
        }
      });
    });
  }

  async startStream() {
    try {
      if (!this.selectedDeviceId()) {
        // If no device is selected, use the default camera to prompt authorization
        // and get the stream.
        this.liveStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        this.getAvailableDevices();
        this.liveStream.getVideoTracks().forEach((track) => {
          const deviceId = track.getSettings().deviceId;
          if (deviceId) this.selectedDeviceId.set(deviceId);
        });

        return;
      }

      this.liveStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: this.selectedDeviceId()
            ? { exact: this.selectedDeviceId() }
            : undefined,
        },
      });
    } catch (error) {
      alert('Error accessing camera: ' + error);
    }
  }

  stopStream() {
    if (this.liveStream) {
      this.liveStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.liveStream = null;
      this.mediaRecorder = null;
    }
  }

  startRecording() {
    if (!this.liveStream) {
      alert('No live stream available');
      return;
    }

    if (!this.mediaRecorder) {
      this.mediaRecorder = new MediaRecorder(this.liveStream, {
        mimeType: 'video/webm',
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedBlobs.push(event.data);
        }
      };
    }

    this.recordedBlobs = [];
    this.isRecording = true;
    this.mediaRecorder.start(100);
  }

  stopRecording() {
    if (!this.liveStream) {
      alert('No live stream available');
      return;
    }

    if (this.mediaRecorder) {
      this.isRecording = false;
      this.mediaRecorder.stop();

      this.handleRecord();
    }
  }

  handleRecord() {
    if (!this.recordedBlobs.length) {
      return;
    }
    const videoBlob = new Blob(this.recordedBlobs, { type: 'video/webm' });
    const url = URL.createObjectURL(videoBlob);
    this.records.push(url);
  }

  takeSnapshot() {
    if (!this.liveStream) {
      alert('No live stream available');
      return;
    }
    if (!this.canvas?.nativeElement || !this.video?.nativeElement) {
      alert('Canvas or video element not found');
      return;
    }

    const context = this.canvas.nativeElement.getContext('2d');

    this.canvas.nativeElement.width = this.video?.nativeElement.videoWidth;
    this.canvas.nativeElement.height = this.video?.nativeElement.videoHeight;
    context?.drawImage(
      this.video?.nativeElement,
      0,
      0,
      this.canvas.nativeElement.width,
      this.canvas.nativeElement.height
    );

    const data = this.canvas.nativeElement.toDataURL('image/png');
    this.snapshots.push(data);
  }

  download(url: string) {
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.href = url;
    a.download = 'test.webm';
    a.click();
    URL.revokeObjectURL(url);
  }
}
