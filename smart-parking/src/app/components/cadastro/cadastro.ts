import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { LIMITES, validarEmail, validarNome, validarSenha } from '../../services/validacao';

@Component({
  selector: 'app-cadastro',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cadastro.html',
  styleUrl: './cadastro.css'
})
export class Cadastro {
  private authService = inject(AuthService);
  @Output() irParaLogin = new EventEmitter<void>();

  readonly LIMITES = LIMITES;

  nome = '';
  email = '';
  senha = '';
  confirmarSenha = '';
  tipo: 'ADMIN' | 'MOTORISTA' = 'MOTORISTA';
  erro: string | null = null;
  carregando = false;
  tentouEnviar = false;

  get erroNome(): string | null { return validarNome(this.nome); }
  get erroEmail(): string | null { return validarEmail(this.email); }
  get erroSenha(): string | null { return validarSenha(this.senha); }
  get erroConfirmacao(): string | null {
    if (!this.confirmarSenha) return 'Confirme a senha.';
    return this.confirmarSenha !== this.senha ? 'As senhas não coincidem.' : null;
  }
  get formularioValido(): boolean {
    return !this.erroNome && !this.erroEmail && !this.erroSenha && !this.erroConfirmacao;
  }

  async registrar() {
    this.tentouEnviar = true;
    if (!this.formularioValido || this.carregando) return;

    this.carregando = true;
    this.erro = null;
    const resultado = await this.authService.cadastrar(this.nome, this.email, this.senha, this.tipo);
    if (!resultado.ok) this.erro = resultado.mensagem ?? 'Erro ao cadastrar.';
    this.carregando = false;
  }
}
