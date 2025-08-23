import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class Utils {
  constructor(private router: Router) {}

  navegarPagina(rota: string) {
    this.router.navigateByUrl(rota);
  }
}
