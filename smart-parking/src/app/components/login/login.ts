import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { LIMITES, validarEmail, validarSenha } from '../../services/validacao';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private authService = inject(AuthService);
  @Output() irParaCadastro = new EventEmitter<void>();

  readonly LIMITES = LIMITES;

  email = '';
  senha = '';
  erro = false;
  carregando = false;
  tentouEnviar = false;

  get erroEmail(): string | null { return validarEmail(this.email); }
  get erroSenha(): string | null {
    // No login só exigimos preenchimento e tamanho máximo (contas antigas podem ter senhas curtas)
    if (!this.senha) return 'Informe a senha.';
    if (this.senha.length > LIMITES.SENHA_MAX) return validarSenha(this.senha);
    return null;
  }
  get formularioValido(): boolean { return !this.erroEmail && !this.erroSenha; }

  async entrar() {
    this.tentouEnviar = true;
    if (!this.formularioValido || this.carregando) return;

    this.carregando = true;
    this.erro = false;
    const sucesso = await this.authService.fazerLogin(this.email, this.senha);
    if (!sucesso) this.erro = true;
    this.carregando = false;
  }
}
