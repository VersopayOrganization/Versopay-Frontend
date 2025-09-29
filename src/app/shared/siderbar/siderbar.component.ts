import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  standalone: true,
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink],
  templateUrl: './siderbar.component.html',
  styleUrls: ['./siderbar.component.scss'],
})
export class SidebarComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  @Input() mini = false;
  @Output() toggle = new EventEmitter<void>();

  user = this.auth.user() as any;
  iniciaisNome: string = '';

  ngOnInit(): void {
    console.log(this.user);
    const partes = (this.user.nome ?? '').split(' ').filter(Boolean);
    const p1 = partes[0]?.charAt(0) ?? '';
    const p2 = partes[1]?.charAt(0) ?? '';
    this.iniciaisNome = `${p1}${p2}`.toUpperCase() || (p1 || '?');
  }

  rotaAtiva(rota: string | string[]) {
    const url = this.router.url;
    const list = Array.isArray(rota) ? rota : [rota];
    return !this.mini && list.some(r => url.startsWith(r));
  }
}
