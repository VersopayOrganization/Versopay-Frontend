import { Component, computed, inject, OnInit } from '@angular/core';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-card-info-usuario',
  imports: [],
  templateUrl: './card-info-usuario.component.html',
  styleUrl: './card-info-usuario.component.scss'
})
export class CardInfoUsuarioComponent implements OnInit {
  private auth = inject(AuthService);
  userName = computed(() => this.auth.user()?.nome ?? 'Usuário');
  iniciaisNome = '';
  
  ngOnInit(): void {
    const parts = (this.userName() || '').split(' ').filter(Boolean);
    const p1 = parts[0]?.[0] ?? '';
    const p2 = parts[1]?.[0] ?? '';
    this.iniciaisNome = (p1 + p2 || p1 || '?').toUpperCase();
  }
}
