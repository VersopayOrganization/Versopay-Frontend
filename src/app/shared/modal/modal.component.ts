import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export type ConfirmDialogData = {
  title: string;
  info?: string | null;        // faixa roxa (opcional)
  message?: string;
  showCancel?: boolean; 
  confirmText?: string;
  cancelText?: string;
  urlReadonly?: string;
};

@Component({
  standalone: true,
  selector: 'app-modal',
  imports: [
    CommonModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule
  ],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
})
export class ModalComponent {
  loading = false;

  constructor(
    private ref: MatDialogRef<ModalComponent, 'confirm' | 'cancel'>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) { }

  onCancel() { this.ref.close('cancel'); }
  onConfirm() { if (!this.loading) this.ref.close('confirm'); }
}
