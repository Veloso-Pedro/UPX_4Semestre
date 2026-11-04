import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: 'ADMIN' | 'MOTORISTA';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase: SupabaseClient | null = null;
  public usuarioAtual = signal<Usuario | null>(null);

  constructor() {
    if (environment.supabaseUrl && environment.supabaseKey) {
      this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    }
  }

  async fazerLogin(email: string, senha: string): Promise<boolean> {
    if (!this.supabase) return false;

    const { data, error } = await this.supabase
      .from('usuarios')
      .select('id, nome, email, tipo')
      .eq('email', email)
      .eq('senha', senha)
      .single();

    if (data && !error) {
      this.usuarioAtual.set(data as Usuario);
      return true;
    }
    return false;
  }

  async cadastrar(nome: string, email: string, senha: string, tipo: 'ADMIN' | 'MOTORISTA'): Promise<boolean> {
    if (!this.supabase) return false;

    const { data, error } = await this.supabase
      .from('usuarios')
      .insert([{ nome, email, senha, tipo }])
      .select('id, nome, email, tipo')
      .single();

    if (data && !error) {
      this.usuarioAtual.set(data as Usuario);
      return true;
    }
    return false;
  }

  fazerLogout(): void {
    this.usuarioAtual.set(null);
  }
}