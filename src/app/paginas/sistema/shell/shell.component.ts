import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../../shared/siderbar/siderbar.component';

@Component({
    standalone: true,
    selector: 'app-shell',
    imports: [CommonModule, RouterOutlet, SidebarComponent],
    templateUrl: './shell.component.html',
    styleUrl: './shell.component.scss',
})
export class ShellComponent {
    mini = signal(false);
}
