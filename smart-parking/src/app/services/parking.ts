import { Injectable, signal, computed, inject } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';

export interface Vaga {
  id: string;
  codigo: string;
  status: 'LIVRE' | 'OCUPADA' | 'RESERVADA' | 'MANUTENCAO';
  tipo: 'COMUM' | 'PCD' | 'IDOSO' | 'ELETRICO';
  preco_hora: number;
  lat: number;
  lng: number;
  gestor_id?: string;
}

@Injectable({ providedIn: 'root' })
export class ParkingService {
  private supabase: SupabaseClient | null = null;
  private authService = inject(AuthService);

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
    }
  }

  async carregarDoBanco() {
    const usuario = this.authService.usuarioAtual();
    if (!this.supabase || !usuario) return;

    let query = this.supabase.from('vagas').select('*').order('codigo');

    if (usuario.tipo === 'ADMIN') {
      query = query.eq('gestor_id', usuario.id);
    }

    const { data, error } = await query;

    if (!error && data) {
      const vagasFormatadas: Vaga[] = data.map((item: any, index: number) => ({
        id: String(item.id),
        codigo: item.codigo,
        status: item.status,
        tipo: item.tipo,
        preco_hora: Number(item.preco_hora ?? 6),
        lat: Number(item.lat ?? (-23.5015 - index * 0.0002)),
        lng: Number(item.lng ?? (-47.4581 - index * 0.0002)),
        gestor_id: item.gestor_id
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

    const vagaTemp: Vaga = { ...nova, id: crypto.randomUUID(), gestor_id: usuario.id };
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
          lng: nova.lng,
          gestor_id: usuario.id
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

  async reservarVaga(codigo: string): Promise<void> {
    this.vagas.update(lista =>
      lista.map(v => v.codigo === codigo ? { ...v, status: 'RESERVADA' } : v)
    );

    if (this.supabase) {
      await this.supabase
        .from('vagas')
        .update({ status: 'RESERVADA', ultima_atualizacao: new Date().toISOString() })
        .eq('codigo', codigo);
    }
  }

  async realizarCheckin(codigo: string): Promise<void> {
    this.vagas.update(lista =>
      lista.map(v => v.codigo === codigo ? { ...v, status: 'OCUPADA' } : v)
    );
    if (this.supabase) {
      await this.supabase.from('vagas').update({ status: 'OCUPADA' }).eq('codigo', codigo);
    }
  }

  async liberarVaga(codigo: string): Promise<void> {
    this.vagas.update(lista =>
      lista.map(v => v.codigo === codigo ? { ...v, status: 'LIVRE' } : v)
    );
    if (this.supabase) {
      await this.supabase.from('vagas').update({ status: 'LIVRE' }).eq('codigo', codigo);
    }
  }
}