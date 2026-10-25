import { Component, EventEmitter, Output, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParkingService, Vaga } from '../../services/parking';

@Component({
  selector: 'app-vaga-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vaga-form.html',
  styleUrl: './vaga-form.css'
})
export class VagaForm {
  private parkingService = inject(ParkingService);
  @Output() fechar = new EventEmitter<void>();

  public codigo = '';
  public tipo: Vaga['tipo'] = 'COMUM';
  public status: Vaga['status'] = 'LIVRE';
  public preco_hora = 6.00;
  public lat = -23.5015;
  public lng = -47.4581;

  constructor() {
    effect(() => {
      const coords = this.parkingService.coordenadaSelecionada();
      this.lat = coords.lat;
      this.lng = coords.lng;
    });
  }

  async salvar(): Promise<void> {
    const codigoLimpo = this.codigo.trim().toUpperCase();
    if (!codigoLimpo) return;

    await this.parkingService.adicionarVaga({
      codigo: codigoLimpo,
      tipo: this.tipo,
      status: this.status,
      preco_hora: Number(this.preco_hora),
      lat: Number(this.lat),
      lng: Number(this.lng)
    });

    this.codigo = '';
    this.fechar.emit();
  }
}