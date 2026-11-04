import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';

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

  email = '';
  senha = '';
  erro = false;
  carregando = false;

  async entrar() {
    this.carregando = true;
    this.erro = false;
    const sucesso = await this.authService.fazerLogin(this.email, this.senha);
    if (!sucesso) this.erro = true;
    this.carregando = false;
  }
}