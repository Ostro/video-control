import { Component } from '@angular/core';
import { VideoControlComponent } from './video-control/video-control.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [VideoControlComponent],
})
export class AppComponent {}
