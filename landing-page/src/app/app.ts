import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  /** Endereço do sistema Smart Parking publicado. */
  protected readonly urlSistema = 'https://smart-parking-74f.pages.dev/';
  protected readonly anoAtual = new Date().getFullYear();

  protected readonly menuAberto = signal(false);

  alternarMenu(): void {
    this.menuAberto.update(aberto => !aberto);
  }

  fecharMenu(): void {
    this.menuAberto.set(false);
  }
}
