// Regras de validação compartilhadas entre login, cadastro e formulário de vagas.
export const LIMITES = {
  NOME_MIN: 3,
  NOME_MAX: 60,
  EMAIL_MAX: 100,
  SENHA_MIN: 6,
  SENHA_MAX: 32,
  CODIGO_VAGA_MAX: 10,
  HORAS_MIN: 1,
  HORAS_MAX: 48,
  PRECO_MIN: 0.5,
  PRECO_MAX: 100
} as const;

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Letras (inclusive acentuadas), espaços, apóstrofo e hífen
const REGEX_NOME = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;
// Ex: A-01, B12, C-100
const REGEX_CODIGO_VAGA = /^[A-Z0-9]{1,4}-?[A-Z0-9]{1,5}$/;

export function validarNome(nome: string): string | null {
  const n = nome.trim();
  if (!n) return 'Informe seu nome.';
  if (n.length < LIMITES.NOME_MIN) return `O nome deve ter pelo menos ${LIMITES.NOME_MIN} caracteres.`;
  if (n.length > LIMITES.NOME_MAX) return `O nome deve ter no máximo ${LIMITES.NOME_MAX} caracteres.`;
  if (!REGEX_NOME.test(n)) return 'O nome deve conter apenas letras.';
  return null;
}

export function validarEmail(email: string): string | null {
  const e = email.trim();
  if (!e) return 'Informe o e-mail.';
  if (e.length > LIMITES.EMAIL_MAX) return `O e-mail deve ter no máximo ${LIMITES.EMAIL_MAX} caracteres.`;
  if (!REGEX_EMAIL.test(e)) return 'Informe um e-mail válido (ex: nome@dominio.com).';
  return null;
}

export function validarSenha(senha: string): string | null {
  if (!senha) return 'Informe a senha.';
  if (senha.length < LIMITES.SENHA_MIN) return `A senha deve ter pelo menos ${LIMITES.SENHA_MIN} caracteres.`;
  if (senha.length > LIMITES.SENHA_MAX) return `A senha deve ter no máximo ${LIMITES.SENHA_MAX} caracteres.`;
  return null;
}

export function validarCodigoVaga(codigo: string): string | null {
  const c = codigo.trim().toUpperCase();
  if (!c) return 'Informe o código da vaga.';
  if (c.length > LIMITES.CODIGO_VAGA_MAX) return `O código deve ter no máximo ${LIMITES.CODIGO_VAGA_MAX} caracteres.`;
  if (!REGEX_CODIGO_VAGA.test(c)) return 'Código inválido. Use letras e números, ex: A-01.';
  return null;
}

export function validarHoras(horas: number): string | null {
  if (horas == null || isNaN(horas)) return 'Informe o tempo desejado.';
  if (!Number.isInteger(horas)) return 'Informe um número inteiro de horas.';
  if (horas < LIMITES.HORAS_MIN) return `O tempo mínimo de reserva é de ${LIMITES.HORAS_MIN} hora.`;
  if (horas > LIMITES.HORAS_MAX) return `O tempo máximo permitido para reserva é de ${LIMITES.HORAS_MAX} horas.`;
  return null;
}

export function validarPreco(preco: number): string | null {
  if (preco == null || isNaN(preco)) return 'Informe a tarifa.';
  if (preco < LIMITES.PRECO_MIN) return `A tarifa mínima é R$ ${LIMITES.PRECO_MIN.toFixed(2)}.`;
  if (preco > LIMITES.PRECO_MAX) return `A tarifa máxima é R$ ${LIMITES.PRECO_MAX.toFixed(2)}.`;
  return null;
}

/** Formata uma duração em ms como "2h 15min" ou "8min". */
export function formatarDuracao(ms: number): string {
  if (ms <= 0) return '0min';
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}
