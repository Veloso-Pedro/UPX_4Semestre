import { Injectable, signal, computed, inject } from '@angular/core';
import { AuthService } from './auth';
import { supabase } from './supabase';

export interface Vaga {
  id: string;
  codigo: string;
  status: 'LIVRE' | 'OCUPADA' | 'RESERVADA' | 'MANUTENCAO';
  tipo: 'COMUM' | 'PCD' | 'IDOSO' | 'ELETRICO';
  preco_hora: number;
  lat: number;
  lng: number;
  gestor_id?: string;
  /** Data/hora prevista para a vaga voltar a ficar LIVRE (ISO). */
  previsao_liberacao?: string | null;
}

// Colunas usadas pela tela. Buscar só o necessário em vez de `select('*')` reduz o tamanho da resposta.
const COLUNAS_BASE = 'id, codigo, status, tipo, preco_hora, lat, lng, gestor_id';
const COLUNAS_COM_PREVISAO = `${COLUNAS_BASE}, previsao_liberacao`;

@Injectable({ providedIn: 'root' })
export class ParkingService {
  private supabase = supabase;
  private authService = inject(AuthService);

  /** false se a coluna `previsao_liberacao` ainda não existir no banco. */
  private bancoTemPrevisao = true;
  private carregando: Promise<void> | null = null;

  public vagas = signal<Vaga[]>([
    { id: '1', codigo: 'A-01', status: 'LIVRE', tipo: 'COMUM', preco_hora: 6.00, lat: -23.5015, lng: -47.4581 },
    { id: '2', codigo: 'A-02', status: 'OCUPADA', tipo: 'ELETRICO', preco_hora: 12.00, lat: -23.5017, lng: -47.4584 },
    { id: '3', codigo: 'A-03', status: 'LIVRE', tipo: 'PCD', preco_hora: 6.00, lat: -23.5013, lng: -47.4578 },
    { id: '4', codigo: 'B-01', status: 'RESERVADA', tipo: 'COMUM', preco_hora: 8.00, lat: -23.5019, lng: -47.4580 },
  ]);

  public totalLivres = computed(() => this.vagas().filter(v => v.status === 'LIVRE').length);
  public taxaOcupacao = computed(() => {
    const total = this.vagas().length;
    if (!total) return 0;
    const ocupadas = total - this.totalLivres();
    return Math.round((ocupadas / total) * 100);
  });

  carregarDoBanco(): Promise<void> {
    // Evita disparar várias requisições GET iguais ao mesmo tempo
    if (!this.carregando) {
      this.carregando = this.buscarVagas().finally(() => (this.carregando = null));
    }
    return this.carregando;
  }

  private async buscarVagas(): Promise<void> {
    const usuario = this.authService.usuarioAtual();
    if (!this.supabase || !usuario) return;

    const montarQuery = (colunas: string) => {
      let q = this.supabase!.from('vagas').select(colunas).order('codigo');
      if (usuario.tipo === 'ADMIN') q = q.eq('gestor_id', usuario.id);
      return q;
    };

    let { data, error } = await montarQuery(this.bancoTemPrevisao ? COLUNAS_COM_PREVISAO : COLUNAS_BASE);

    // 42703 = coluna inexistente. Funciona mesmo antes de rodar o SQL que cria `previsao_liberacao`.
    if (error?.code === '42703' && this.bancoTemPrevisao) {
      this.bancoTemPrevisao = false;
      ({ data, error } = await montarQuery(COLUNAS_BASE));
    }

    if (!error && data) {
      const vagasFormatadas: Vaga[] = (data as any[]).map((item, index) => ({
        id: String(item.id),
        codigo: item.codigo,
        status: item.status,
        tipo: item.tipo,
        preco_hora: Number(item.preco_hora ?? 6),
        lat: Number(item.lat ?? (-23.5015 - index * 0.0002)),
        lng: Number(item.lng ?? (-47.4581 - index * 0.0002)),
        gestor_id: item.gestor_id,
        previsao_liberacao: item.previsao_liberacao ?? null
      }));
      this.vagas.set(vagasFormatadas);
    } else if (error) {
      console.error('Erro ao carregar vagas:', error.message);
    }
  }

  /** Atualiza a vaga na tela na hora e grava no banco em seguida. */
  private async atualizarVaga(codigo: string, campos: Partial<Vaga>): Promise<void> {
    this.vagas.update(lista => lista.map(v => (v.codigo === codigo ? { ...v, ...campos } : v)));
    if (!this.supabase) return;

    const payload: Record<string, unknown> = { ...campos, ultima_atualizacao: new Date().toISOString() };
    if (!this.bancoTemPrevisao) delete payload['previsao_liberacao'];

    let { error } = await this.supabase.from('vagas').update(payload).eq('codigo', codigo);

    if (error?.code === '42703' || error?.code === 'PGRST204') {
      // Coluna nova ainda não criada no banco: grava só o status
      this.bancoTemPrevisao = false;
      delete payload['previsao_liberacao'];
      ({ error } = await this.supabase.from('vagas').update(payload).eq('codigo', codigo));
    }
    if (error) console.error('Erro ao salvar no Supabase:', error.message);
  }

  alternarStatusSensor(vagaClicada: Vaga): void {
    const novoStatus: Vaga['status'] = vagaClicada.status === 'LIVRE' ? 'OCUPADA' : 'LIVRE';
    this.atualizarVaga(vagaClicada.codigo, { status: novoStatus, previsao_liberacao: null });
  }

  public coordenadaSelecionada = signal<{ lat: number; lng: number }>({
    lat: -23.5015,
    lng: -47.4581
  });

  selecionarPontoNoMapa(lat: number, lng: number): void {
    this.coordenadaSelecionada.set({
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6))
    });
  }

  async adicionarVaga(nova: Omit<Vaga, 'id'>): Promise<void> {
    const usuario = this.authService.usuarioAtual();
    if (!usuario) return;

    const codigo = nova.codigo.toUpperCase();
    const vagaTemp: Vaga = { ...nova, codigo, id: crypto.randomUUID(), gestor_id: usuario.id };
    this.vagas.update(lista => [...lista, vagaTemp].sort((a, b) => a.codigo.localeCompare(b.codigo)));

    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('vagas')
        .insert([{
          codigo,
          status: nova.status,
          tipo: nova.tipo,
          preco_hora: nova.preco_hora,
          lat: nova.lat,
          lng: nova.lng,
          gestor_id: usuario.id
        }])
        .select('id')
        .single();

      if (!error && data) {
        this.vagas.update(lista => lista.map(v => (v.codigo === codigo ? { ...v, id: String(data.id) } : v)));
      } else if (error) {
        console.error('Erro ao cadastrar vaga:', error.message);
        this.vagas.update(lista => lista.filter(v => v.id !== vagaTemp.id));
      }
    }
  }

  async removerVaga(codigo: string): Promise<void> {
    this.vagas.update(lista => lista.filter(v => v.codigo !== codigo));
    if (this.supabase) {
      await this.supabase.from('vagas').delete().eq('codigo', codigo);
    }
  }

  /** Reserva: 30 min de prazo para check-in + horas pagas. */
  reservarVaga(codigo: string, horas: number): Promise<void> {
    const previsao = new Date(Date.now() + (30 + horas * 60) * 60000).toISOString();
    return this.atualizarVaga(codigo, { status: 'RESERVADA', previsao_liberacao: previsao });
  }

  realizarCheckin(codigo: string, fimUso: Date): Promise<void> {
    return this.atualizarVaga(codigo, { status: 'OCUPADA', previsao_liberacao: fimUso.toISOString() });
  }

  liberarVaga(codigo: string): Promise<void> {
    return this.atualizarVaga(codigo, { status: 'LIVRE', previsao_liberacao: null });
  }
}
