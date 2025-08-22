import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private busyCount = 0;
  readonly visible = signal(false);

  show() {
    this.busyCount++;
    if (this.busyCount === 1) this.visible.set(true);
  }

  hide() {
    if (this.busyCount > 0) this.busyCount--;
    if (this.busyCount === 0) this.visible.set(false);
  }

  async wrap<T>(p: Promise<T>): Promise<T> {
    try {
      this.show();
      return await p;
    } finally {
      this.hide();
    }
  }
}