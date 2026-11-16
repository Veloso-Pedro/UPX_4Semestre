import { Component, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParkingService, Vaga } from './services/parking';
import { AuthService } from './services/auth';
import { VagaForm } from './components/vaga-form/vaga-form';
import { Login } from './components/login/login';
import { Cadastro } from './components/cadastro/cadastro';
import * as L from 'leaflet';
import { DashboardBi } from './components/dashboard-bi/dashboard-bi';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, VagaForm, Login, Cadastro, DashboardBi],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  public parkingService = inject(ParkingService);
  public authService = inject(AuthService);

  private map: L.Map | null = null;
  private markersLayer = L.layerGroup();
  private markersByCodigo: { [codigo: string]: L.CircleMarker } = {};

  public exibindoFormulario = false;
  public telaAuth: 'LOGIN' | 'CADASTRO' = 'LOGIN';

  public vagaSelecionada: Vaga | null = null;
  public horasReserva: number = 1;
  public reservaConcluida: boolean = false;

  public minhaReserva: Vaga | null = null;
  public codigoCheckin: string = '';
  public erroCheckin: boolean = false;
  public checkinConcluido: boolean = false;

  public exibindoBI = false;

  get modoAdmin(): boolean {
    return this.authService.usuarioAtual()?.tipo === 'ADMIN';
  }

  constructor() {
    effect(() => {
      const usuario = this.authService.usuarioAtual();
      if (usuario) {
        this.parkingService.carregarDoBanco();
        setTimeout(() => {
          if (!this.map) {
            this.iniciarMapa();
          }
        }, 100);
      } else {
        this.parkingService.vagas.set([]);
        if (this.map) {
          this.map.remove();
          this.map = null;
        }
      }
    });

    effect(() => {
      const vagasAtuais = this.parkingService.vagas();
      if (this.map) {
        this.desenharPinosNoMapa(vagasAtuais);
      }
    });
  }

  alternarBI(): void {
    this.exibindoBI = !this.exibindoBI;
    if (!this.exibindoBI) {
      setTimeout(() => {
        if (!this.map) this.iniciarMapa();
      }, 100);
    } else {
      if (this.map) {
        this.map.remove();
        this.map = null;
      }
    }
  }

  private iniciarMapa(): void {
    const cantoSudoeste = L.latLng(-23.6000, -47.5600);
    const cantoNordeste = L.latLng(-23.3800, -47.3400);
    const limitesSorocaba = L.latLngBounds(cantoSudoeste, cantoNordeste);

    this.map = L.map('mapa-vagas', {
      center: [-23.5015, -47.4581],
      zoom: 18,
      minZoom: 12,
      maxZoom: 19,
      maxBounds: limitesSorocaba,
      maxBoundsViscosity: 1.0
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.markersLayer.addTo(this.map);
    this.desenharPinosNoMapa(this.parkingService.vagas());

    this.map.on('click', (evento: L.LeafletMouseEvent) => {
      if (this.exibindoFormulario) {
        this.parkingService.selecionarPontoNoMapa(evento.latlng.lat, evento.latlng.lng);
      }
    });
  }

  private desenharPinosNoMapa(vagas: Vaga[]): void {
    if (!this.map) return;
    this.markersLayer.clearLayers();
    this.markersByCodigo = {};

    vagas.forEach(vaga => {
      if (isNaN(vaga.lat) || isNaN(vaga.lng)) return;

      const cor = vaga.status === 'LIVRE' ? '#22c55e' : vaga.status === 'OCUPADA' ? '#ef4444' : '#eab308';

      const marker = L.circleMarker([vaga.lat, vaga.lng], {
        radius: 12,
        fillColor: cor,
        color: '#ffffff',
        weight: 3,
        fillOpacity: 0.95
      });

      marker.bindPopup(`<b>Vaga ${vaga.codigo}</b><br>Status: ${vaga.status}<br>R$ ${vaga.preco_hora.toFixed(2)}/h`);
      marker.addTo(this.markersLayer);
      this.markersByCodigo[vaga.codigo] = marker;
    });
  }

  simularSensor(vaga: Vaga): void {
    this.parkingService.alternarStatusSensor(vaga);
    if (this.map) {
      this.desenharPinosNoMapa(this.parkingService.vagas());
    }
  }

  focarVagaNoMapa(vaga: Vaga): void {
    if (!this.map || isNaN(vaga.lat) || isNaN(vaga.lng)) return;
    this.map.setView([vaga.lat, vaga.lng], 19);
    this.markersByCodigo[vaga.codigo]?.openPopup();
  }

  abrirReserva(vaga: Vaga): void {
    this.vagaSelecionada = vaga;
    this.horasReserva = 1;
    this.reservaConcluida = false;
  }

  cancelarReserva(): void {
    this.vagaSelecionada = null;
    this.reservaConcluida = false;
  }

  async confirmarReserva(): Promise<void> {
    if (!this.vagaSelecionada) return;
    if (this.horasReserva < 1) this.horasReserva = 1;

    await this.parkingService.reservarVaga(this.vagaSelecionada.codigo);

    if (this.map) {
      this.desenharPinosNoMapa(this.parkingService.vagas());
    }

    this.reservaConcluida = true;
  }

  fecharComprovante(): void {
    this.minhaReserva = this.vagaSelecionada;
    this.vagaSelecionada = null;
    this.reservaConcluida = false;
  }

  async validarCheckin(): Promise<void> {
    if (!this.minhaReserva) return;

    if (this.codigoCheckin.trim().toUpperCase() === this.minhaReserva.codigo) {
      this.erroCheckin = false;
      await this.parkingService.realizarCheckin(this.minhaReserva.codigo);
      this.checkinConcluido = true;
      if (this.map) {
        this.desenharPinosNoMapa(this.parkingService.vagas());
      }
    } else {
      this.erroCheckin = true;
    }
  }

  async fazerCheckout(): Promise<void> {
    if (!this.minhaReserva) return;

    await this.parkingService.liberarVaga(this.minhaReserva.codigo);
    this.minhaReserva = null;
    this.checkinConcluido = false;
    this.codigoCheckin = '';

    if (this.map) {
      this.desenharPinosNoMapa(this.parkingService.vagas());
    }
  }

  async excluirVaga(codigo: string): Promise<void> {
    await this.parkingService.removerVaga(codigo);
    if (this.map) {
      this.desenharPinosNoMapa(this.parkingService.vagas());
    }
  }
}