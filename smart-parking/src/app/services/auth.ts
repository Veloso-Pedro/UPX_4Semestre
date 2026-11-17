import { Injectable, signal } from '@angular/core';
import { supabase } from './supabase';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: 'ADMIN' | 'MOTORISTA';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase = supabase;
  public usuarioAtual = signal<Usuario | null>(null);

  async fazerLogin(email: string, senha: string): Promise<boolean> {
    if (!this.supabase) return false;

    const { data, error } = await this.supabase
      .from('usuarios')
      .select('id, nome, email, tipo')
      .eq('email', email.trim().toLowerCase())
      .eq('senha', senha)
      .maybeSingle();

    if (data && !error) {
      this.usuarioAtual.set(data as Usuario);
      return true;
    }
    return false;
  }

  async cadastrar(nome: string, email: string, senha: string, tipo: 'ADMIN' | 'MOTORISTA'): Promise<{ ok: boolean; mensagem?: string }> {
    if (!this.supabase) return { ok: false, mensagem: 'Serviço indisponível.' };

    const { data, error } = await this.supabase
      .from('usuarios')
      .insert([{ nome: nome.trim(), email: email.trim().toLowerCase(), senha, tipo }])
      .select('id, nome, email, tipo')
      .single();

    if (data && !error) {
      this.usuarioAtual.set(data as Usuario);
      return { ok: true };
    }
    // 23505 = violação de unicidade (e-mail já cadastrado)
    if (error?.code === '23505') return { ok: false, mensagem: 'Este e-mail já está cadastrado.' };
    return { ok: false, mensagem: 'Erro ao cadastrar. Verifique os dados.' };
  }

  fazerLogout(): void {
    this.usuarioAtual.set(null);
  }
}
