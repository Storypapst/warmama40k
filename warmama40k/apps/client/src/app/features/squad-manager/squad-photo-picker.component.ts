import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-squad-photo-picker',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="photo-picker">
      @if (currentPhoto) {
        <img [src]="currentPhoto" alt="Trupp-Foto" class="photo-preview" />
      } @else {
        <div class="photo-placeholder">
          <mat-icon>photo_camera</mat-icon>
        </div>
      }
      <div class="photo-actions">
        <button mat-stroked-button (click)="captureInput.click()">
          <mat-icon>photo_camera</mat-icon>
          Foto
        </button>
        <button mat-stroked-button (click)="fileInput.click()">
          <mat-icon>image</mat-icon>
          Galerie
        </button>
        @if (currentPhoto) {
          <button mat-icon-button (click)="removePhoto()">
            <mat-icon>delete</mat-icon>
          </button>
        }
      </div>
      <input
        #captureInput
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        (change)="onFileSelected($event)"
      />
      <input
        #fileInput
        type="file"
        accept="image/*"
        hidden
        (change)="onFileSelected($event)"
      />
    </div>
  `,
  styles: `
    .photo-picker { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .photo-preview {
      width: 120px; height: 120px; object-fit: cover;
      border-radius: 12px; border: 2px solid var(--mat-sys-outline-variant, #666);
    }
    .photo-placeholder {
      width: 120px; height: 120px; display: flex; align-items: center; justify-content: center;
      border-radius: 12px; border: 2px dashed var(--mat-sys-outline-variant, #666);
      background: color-mix(in srgb, var(--mat-sys-primary) 5%, transparent);
    }
    .photo-placeholder mat-icon {
      font-size: 40px; width: 40px; height: 40px;
      color: var(--mat-sys-on-surface-variant, #888);
    }
    .photo-actions { display: flex; gap: 8px; align-items: center; }
  `,
})
export class SquadPhotoPickerComponent {
  @Input() currentPhoto?: string;
  @Output() photoChanged = new EventEmitter<string>();
  @Output() photoRemoved = new EventEmitter<void>();

  processing = signal(false);

  removePhoto() {
    this.photoRemoved.emit();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.processing.set(true);
    try {
      const base64 = await this.resizeAndEncode(file, 400);
      this.photoChanged.emit(base64);
    } finally {
      this.processing.set(false);
      input.value = ''; // reset for re-select
    }
  }

  private resizeAndEncode(file: File, maxSize: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width;
          let h = img.height;
          if (w > h) {
            if (w > maxSize) { h = (h * maxSize) / w; w = maxSize; }
          } else {
            if (h > maxSize) { w = (w * maxSize) / h; h = maxSize; }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
