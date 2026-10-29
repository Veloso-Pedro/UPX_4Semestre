import { Component, AfterViewInit, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParkingService, Vaga } from './services/parking';
import { VagaForm } from './components/vaga-form/vaga-form';
import * as L from 'leaflet';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, VagaForm],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements AfterViewInit {
  public parkingService = inject(ParkingService);
  private map!: L.Map;
  private markersLayer = L.layerGroup();
  private markersByCodigo: { [codigo: string]: L.CircleMarker } = {};
  public exibindoFormulario = false;
  public modoAdmin = false;

  constructor() {
    effect(() => {
      const vagasAtuais = this.parkingService.vagas();
      if (this.map) {
        this.desenharPinosNoMapa(vagasAtuais);
      }
    });
  }

  ngAfterViewInit(): void {
    this.iniciarMapa();
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

  async reservarVaga(vaga: Vaga): Promise<void> {
    if (vaga.status !== 'LIVRE') return;
    
    await this.parkingService.reservarVaga(vaga.codigo);
    
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