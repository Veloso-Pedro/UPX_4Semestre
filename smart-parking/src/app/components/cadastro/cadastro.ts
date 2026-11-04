import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';

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

  nome = '';
  email = '';
  senha = '';
  tipo: 'ADMIN' | 'MOTORISTA' = 'MOTORISTA';
  erro = false;
  carregando = false;

  async registrar() {
    this.carregando = true;
    this.erro = false;
    const sucesso = await this.authService.cadastrar(this.nome, this.email, this.senha, this.tipo);
    if (!sucesso) this.erro = true;
    this.carregando = false;
  }
}