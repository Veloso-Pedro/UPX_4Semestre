import { Component, inject, effect, signal, untracked, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParkingService, Vaga } from './services/parking';
import { AuthService } from './services/auth';
import { VagaForm } from './components/vaga-form/vaga-form';
import { Login } from './components/login/login';
import { Cadastro } from './components/cadastro/cadastro';
import * as L from 'leaflet';
import { DashboardBi } from './components/dashboard-bi/dashboard-bi';
import { LIMITES, formatarDuracao, validarHoras } from './services/validacao';

const PRAZO_CHECKIN_MIN = 30;
const CHAVE_STORAGE = 'smart-parking:reserva';

interface ReservaSalva {
  usuarioId: string;
  vaga: Vaga;
  horas: number;
  criadaEm: string;
  inicioUso: string | null;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, VagaForm, Login, Cadastro, DashboardBi],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnDestroy {
  public parkingService = inject(ParkingService);
  public authService = inject(AuthService);

  readonly LIMITES = LIMITES;

  private map: L.Map | null = null;
  private markersLayer = L.layerGroup();
  private markersByCodigo: { [codigo: string]: L.CircleMarker } = {};

  public exibindoFormulario = false;
  public telaAuth: 'LOGIN' | 'CADASTRO' = 'LOGIN';

  public vagaSelecionada: Vaga | null = null;
  public horasReserva: number = 1;
  public reservaConcluida: boolean = false;
  public erroReserva: string = '';
  public processando = false;
  public aceitouTermo = false;
  public erroTermo = false;

  /** Opções do menu de horas: 1 a 48. */
  readonly opcoesHoras = Array.from({ length: LIMITES.HORAS_MAX }, (_, i) => i + 1);

  // Reserva ativa do motorista
  public minhaReserva: Vaga | null = null;
  public horasReservadas = 0;
  public reservaCriadaEm: Date | null = null;
  public inicioUso: Date | null = null;
  public codigoCheckin: string = '';
  public erroCheckin: boolean = false;
  public checkinConcluido: boolean = false;
  public confirmandoCheckout = false;

  // Filtros de vagas
  public filtroBusca = '';
  public filtroStatus: '' | Vaga['status'] = '';
  public filtroTipo: '' | Vaga['tipo'] = '';
  public filtroPrecoMax: number | null = null;

  public exibindoBI = false;

  /** Relógio usado nas contagens regressivas (atualiza a cada 30s). */
  public agora = signal(Date.now());
  private relogio = setInterval(() => this.agora.set(Date.now()), 30000);

  get modoAdmin(): boolean {
    return this.authService.usuarioAtual()?.tipo === 'ADMIN';
  }

  constructor() {
    effect(() => {
      const usuario = this.authService.usuarioAtual();
      if (usuario) {
        this.parkingService.carregarDoBanco();
        this.restaurarReserva(usuario.id);
        setTimeout(() => {
          if (!this.map) {
            this.iniciarMapa();
          }
        }, 100);
      } else {
        this.parkingService.vagas.set([]);
        this.limparReservaLocal(false);
        if (this.map) {
          this.map.remove();
          this.map = null;
        }
      }
    });

    // Redesenha os pinos sempre que a lista de vagas muda (não é preciso chamar manualmente)
    effect(() => {
      const vagasAtuais = this.parkingService.vagas();
      if (this.map) {
        untracked(() => this.desenharPinosNoMapa(vagasAtuais));
      }
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.relogio);
  }

  // ---------- Filtros ----------

  get vagasFiltradas(): Vaga[] {
    const busca = this.filtroBusca.trim().toUpperCase();
    const precoMax = this.filtroPrecoMax != null && !isNaN(this.filtroPrecoMax) && this.filtroPrecoMax > 0
      ? this.filtroPrecoMax
      : null;

    return this.parkingService.vagas().filter(v =>
      (!busca || v.codigo.includes(busca)) &&
      (!this.filtroStatus || v.status === this.filtroStatus) &&
      (!this.filtroTipo || v.tipo === this.filtroTipo) &&
      (precoMax == null || v.preco_hora <= precoMax)
    );
  }

  get filtrosAtivos(): boolean {
    return !!(this.filtroBusca || this.filtroStatus || this.filtroTipo || this.filtroPrecoMax);
  }

  limparFiltros(): void {
    this.filtroBusca = '';
    this.filtroStatus = '';
    this.filtroTipo = '';
    this.filtroPrecoMax = null;
  }

  // ---------- Tempo para liberar ----------

  /** Texto "Libera em X" para vagas reservadas/ocupadas com previsão conhecida. */
  tempoParaLiberar(vaga: Vaga): string | null {
    if (vaga.status === 'LIVRE' || !vaga.previsao_liberacao) return null;
    const restante = new Date(vaga.previsao_liberacao).getTime() - this.agora();
    return restante > 0 ? `Libera em ${formatarDuracao(restante)}` : 'Liberação a qualquer momento';
  }

  get fimUso(): Date | null {
    return this.inicioUso ? new Date(this.inicioUso.getTime() + this.horasReservadas * 3600000) : null;
  }

  /** ms restantes do tempo pago (após o check-in). */
  get msRestantesUso(): number {
    return this.fimUso ? Math.max(0, this.fimUso.getTime() - this.agora()) : 0;
  }

  get tempoRestanteUso(): string {
    return formatarDuracao(this.msRestantesUso);
  }

  get tempoRestanteCheckin(): string {
    if (!this.reservaCriadaEm) return `${PRAZO_CHECKIN_MIN}min`;
    const limite = this.reservaCriadaEm.getTime() + PRAZO_CHECKIN_MIN * 60000;
    return formatarDuracao(limite - this.agora());
  }

  get valorNaoReembolsado(): number {
    if (!this.minhaReserva || !this.horasReservadas) return 0;
    return (this.msRestantesUso / 3600000) * this.minhaReserva.preco_hora;
  }

  // ---------- Mapa ----------

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
      maxBoundsViscosity: 1.0,
      preferCanvas: true
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

      const liberar = this.tempoParaLiberar(vaga);
      marker.bindPopup(
        `<b>Vaga ${vaga.codigo}</b><br>Status: ${vaga.status}<br>R$ ${vaga.preco_hora.toFixed(2)}/h` +
        (liberar ? `<br>⏱️ ${liberar}` : '')
      );
      marker.addTo(this.markersLayer);
      this.markersByCodigo[vaga.codigo] = marker;
    });
  }

  simularSensor(vaga: Vaga): void {
    this.parkingService.alternarStatusSensor(vaga);
  }

  focarVagaNoMapa(vaga: Vaga): void {
    if (!this.map || isNaN(vaga.lat) || isNaN(vaga.lng)) return;
    this.map.setView([vaga.lat, vaga.lng], 19);
    this.markersByCodigo[vaga.codigo]?.openPopup();
  }

  // ---------- Reserva ----------

  abrirReserva(vaga: Vaga): void {
    this.vagaSelecionada = vaga;
    this.horasReserva = 1;
    this.erroReserva = '';
    this.aceitouTermo = false;
    this.erroTermo = false;
    this.reservaConcluida = false;
  }

  cancelarReserva(): void {
    this.vagaSelecionada = null;
    this.erroReserva = '';
    this.reservaConcluida = false;
  }

  /** Impede digitar valores fora de 1–48 no campo de horas. */
  ajustarHoras(valor: number | null): void {
    if (valor == null || isNaN(valor)) return;
    if (valor > LIMITES.HORAS_MAX) this.horasReserva = LIMITES.HORAS_MAX;
    this.erroReserva = validarHoras(Number(this.horasReserva)) ?? '';
  }

  get totalReserva(): number {
    const horas = Number(this.horasReserva);
    if (!this.vagaSelecionada || isNaN(horas)) return 0;
    return Math.min(Math.max(horas, 0), LIMITES.HORAS_MAX) * this.vagaSelecionada.preco_hora;
  }

  async confirmarReserva(): Promise<void> {
    if (!this.vagaSelecionada || this.processando) return;

    const horas = Number(this.horasReserva);
    const erro = validarHoras(horas);
    if (erro) {
      this.erroReserva = erro;
      return;
    }
    this.erroReserva = '';

    if (!this.aceitouTermo) {
      this.erroTermo = true;
      return;
    }

    // Mostra o comprovante na hora; a gravação no banco segue em segundo plano
    this.processando = true;
    this.horasReservadas = horas;
    this.reservaCriadaEm = new Date();
    this.reservaConcluida = true;
    await this.parkingService.reservarVaga(this.vagaSelecionada.codigo, horas);
    this.processando = false;
  }

  fecharComprovante(): void {
    this.minhaReserva = this.vagaSelecionada;
    this.vagaSelecionada = null;
    this.reservaConcluida = false;
    this.inicioUso = null;
    this.checkinConcluido = false;
    this.salvarReserva();
  }

  async validarCheckin(): Promise<void> {
    if (!this.minhaReserva || this.processando) return;

    const codigoDigitado = this.codigoCheckin.trim().toUpperCase();
    if (codigoDigitado !== this.minhaReserva.codigo) {
      this.erroCheckin = true;
      return;
    }

    this.erroCheckin = false;
    this.inicioUso = new Date();
    this.agora.set(Date.now());
    this.checkinConcluido = true;
    this.salvarReserva();

    this.processando = true;
    await this.parkingService.realizarCheckin(this.minhaReserva.codigo, this.fimUso!);
    this.processando = false;
  }

  /** 1º clique: mostra o aviso de tempo restante / sem reembolso. */
  solicitarCheckout(): void {
    this.agora.set(Date.now());
    if (this.msRestantesUso > 0) {
      this.confirmandoCheckout = true;
    } else {
      this.fazerCheckout();
    }
  }

  async fazerCheckout(): Promise<void> {
    if (!this.minhaReserva || this.processando) return;
    const codigo = this.minhaReserva.codigo;

    this.limparReservaLocal(true);

    this.processando = true;
    await this.parkingService.liberarVaga(codigo);
    this.processando = false;
  }

  async excluirVaga(codigo: string): Promise<void> {
    if (!confirm(`Deseja realmente excluir a vaga ${codigo}?`)) return;
    await this.parkingService.removerVaga(codigo);
  }

  // ---------- Persistência local da reserva (sobrevive a recarregar a página) ----------

  private salvarReserva(): void {
    const usuario = this.authService.usuarioAtual();
    if (!usuario || !this.minhaReserva) return;
    const dados: ReservaSalva = {
      usuarioId: usuario.id,
      vaga: this.minhaReserva,
      horas: this.horasReservadas,
      criadaEm: (this.reservaCriadaEm ?? new Date()).toISOString(),
      inicioUso: this.inicioUso?.toISOString() ?? null
    };
    try { localStorage.setItem(CHAVE_STORAGE, JSON.stringify(dados)); } catch { /* sem storage */ }
  }

  private restaurarReserva(usuarioId: string): void {
    try {
      const bruto = localStorage.getItem(CHAVE_STORAGE);
      if (!bruto) return;
      const dados = JSON.parse(bruto) as ReservaSalva;
      if (dados.usuarioId !== usuarioId) return;
      this.minhaReserva = dados.vaga;
      this.horasReservadas = dados.horas;
      this.reservaCriadaEm = new Date(dados.criadaEm);
      this.inicioUso = dados.inicioUso ? new Date(dados.inicioUso) : null;
      this.checkinConcluido = !!this.inicioUso;
    } catch { /* ignora dados inválidos */ }
  }

  private limparReservaLocal(apagarStorage: boolean): void {
    this.minhaReserva = null;
    this.checkinConcluido = false;
    this.confirmandoCheckout = false;
    this.codigoCheckin = '';
    this.inicioUso = null;
    this.reservaCriadaEm = null;
    this.horasReservadas = 0;
    if (apagarStorage) {
      try { localStorage.removeItem(CHAVE_STORAGE); } catch { /* sem storage */ }
    }
  }
}
