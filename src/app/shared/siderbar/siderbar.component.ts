import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-sidebar',
  imports: [CommonModule],
  templateUrl: './siderbar.component.html',
  styleUrl: './siderbar.component.scss'
})
export class SidebarComponent {
  @Input() mini = false;
  @Output() toggle = new EventEmitter<void>();
}
