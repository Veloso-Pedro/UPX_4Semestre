import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParkingService } from '../../services/parking';

@Component({
  selector: 'app-dashboard-bi',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-bi.html',
  styleUrl: './dashboard-bi.css'
})
export class DashboardBi {
  private parkingService = inject(ParkingService);

  public totalVagas = computed(() => this.parkingService.vagas().length);
  
  public vagasEmUso = computed(() => 
    this.parkingService.vagas().filter(v => v.status !== 'LIVRE').length
  );

  public totalReservas = computed(() => 
    this.parkingService.vagas().filter(v => v.status === 'RESERVADA').length
  );

  public totalOcupadas = computed(() => 
    this.parkingService.vagas().filter(v => v.status === 'OCUPADA').length
  );

  public faturamentoAtual = computed(() => {
    return this.parkingService.vagas()
      .filter(v => v.status !== 'LIVRE')
      .reduce((acc, vaga) => acc + vaga.preco_hora, 0);
  });
  
  public potencialMaximo = computed(() => {
    return this.parkingService.vagas()
      .reduce((acc, vaga) => acc + vaga.preco_hora, 0);
  });
}