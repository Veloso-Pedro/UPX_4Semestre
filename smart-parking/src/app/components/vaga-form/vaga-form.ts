import { Component, EventEmitter, Output, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParkingService, Vaga } from '../../services/parking';
import { LIMITES, validarCodigoVaga, validarPreco } from '../../services/validacao';

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

  readonly LIMITES = LIMITES;

  public codigo = '';
  public tipo: Vaga['tipo'] = 'COMUM';
  public status: Vaga['status'] = 'LIVRE';
  public preco_hora = 6.00;
  public lat = -23.5015;
  public lng = -47.4581;
  public tentouEnviar = false;
  public salvando = false;

  constructor() {
    effect(() => {
      const coords = this.parkingService.coordenadaSelecionada();
      this.lat = coords.lat;
      this.lng = coords.lng;
    });
  }

  get erroCodigo(): string | null {
    const erro = validarCodigoVaga(this.codigo);
    if (erro) return erro;
    const c = this.codigo.trim().toUpperCase();
    return this.parkingService.vagas().some(v => v.codigo === c) ? 'Já existe uma vaga com este código.' : null;
  }
  get erroPreco(): string | null { return validarPreco(Number(this.preco_hora)); }
  get erroCoordenadas(): string | null {
    return isNaN(Number(this.lat)) || isNaN(Number(this.lng)) ? 'Selecione a posição no mapa.' : null;
  }

  async salvar(): Promise<void> {
    this.tentouEnviar = true;
    if (this.erroCodigo || this.erroPreco || this.erroCoordenadas || this.salvando) return;

    this.salvando = true;
    const nova = {
      codigo: this.codigo.trim().toUpperCase(),
      tipo: this.tipo,
      status: this.status,
      preco_hora: Number(this.preco_hora),
      lat: Number(this.lat),
      lng: Number(this.lng)
    };

    // A vaga já aparece na lista imediatamente (atualização otimista); fecha o form sem esperar o servidor
    this.codigo = '';
    this.fechar.emit();
    await this.parkingService.adicionarVaga(nova);
    this.salvando = false;
  }
}
