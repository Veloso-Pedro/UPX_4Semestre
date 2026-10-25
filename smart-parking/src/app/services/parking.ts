import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export interface Vaga {
  id: string;
  codigo: string;
  status: 'LIVRE' | 'OCUPADA' | 'RESERVADA' | 'MANUTENCAO';
  tipo: 'COMUM' | 'PCD' | 'IDOSO' | 'ELETRICO';
  preco_hora: number;
  lat: number;
  lng: number;
}

@Injectable({ providedIn: 'root' })
export class ParkingService {
  private supabase: SupabaseClient | null = null;

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
    const ocupadas = this.vagas().filter(v => v.status !== 'LIVRE').length;
    return Math.round((ocupadas / total) * 100);
  });

  constructor() {
    if (environment.supabaseUrl && environment.supabaseKey) {
      this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
      this.carregarDoBanco();
    }
  }

  async carregarDoBanco() {
    if (!this.supabase) return;
    const { data, error } = await this.supabase.from('vagas').select('*').order('codigo');

    if (!error && data && data.length > 0) {
      const vagasFormatadas: Vaga[] = data.map((item: any, index: number) => ({
        id: String(item.id),
        codigo: item.codigo,
        status: item.status,
        tipo: item.tipo,
        preco_hora: Number(item.preco_hora ?? 6),
        lat: Number(item.lat ?? (-23.5015 - index * 0.0002)),
        lng: Number(item.lng ?? (-47.4581 - index * 0.0002))
      }));
      this.vagas.set(vagasFormatadas);
    }
  }

  alternarStatusSensor(vagaClicada: Vaga): void {
    const novoStatus: Vaga['status'] = vagaClicada.status === 'LIVRE' ? 'OCUPADA' : 'LIVRE';

    this.vagas.update(listaAtual =>
      listaAtual.map(v => v.codigo === vagaClicada.codigo ? { ...v, status: novoStatus } : v)
    );

    if (this.supabase) {
      this.supabase
        .from('vagas')
        .update({ status: novoStatus, ultima_atualizacao: new Date().toISOString() })
        .eq('codigo', vagaClicada.codigo)
        .then(({ error }) => {
          if (error) console.error('Erro ao salvar no Supabase:', error.message);
        });
    }
  }

  // Centro de Sorocaba
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
    const vagaTemp: Vaga = { ...nova, id: crypto.randomUUID() };
    this.vagas.update(lista => [...lista, vagaTemp].sort((a, b) => a.codigo.localeCompare(b.codigo)));

    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('vagas')
        .insert([{
          codigo: nova.codigo.toUpperCase(),
          status: nova.status,
          tipo: nova.tipo,
          preco_hora: nova.preco_hora,
          lat: nova.lat,
          lng: nova.lng
        }])
        .select()
        .single();

      if (!error && data) {
        this.vagas.update(lista =>
          lista.map(v => v.codigo === nova.codigo ? { ...v, id: String(data.id) } : v)
        );
      }
    }
  }

  async removerVaga(codigo: string): Promise<void> {
    this.vagas.update(lista => lista.filter(v => v.codigo !== codigo));
    if (this.supabase) {
      await this.supabase.from('vagas').delete().eq('codigo', codigo);
    }
  }
}