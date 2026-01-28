/**
 * Valida CPF (11 dígitos + dígitos verificadores)
 */
export function validarCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");

  if (digits.length !== 11) return false;

  // Rejeita sequências repetidas
  if (/^(\d)\1+$/.test(digits)) return false;

  // Validação dos dígitos verificadores
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(digits[i]) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(digits[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(digits[i]) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(digits[10])) return false;

  return true;
}

/**
 * Valida CNPJ (14 dígitos + dígitos verificadores)
 */
export function validarCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "");

  if (digits.length !== 14) return false;

  // Rejeita sequências repetidas
  if (/^(\d)\1+$/.test(digits)) return false;

  // Validação dos dígitos verificadores
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let soma = 0;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(digits[i]) * pesos1[i];
  }
  let resto = soma % 11;
  const dv1 = resto < 2 ? 0 : 11 - resto;
  if (dv1 !== parseInt(digits[12])) return false;

  soma = 0;
  for (let i = 0; i < 13; i++) {
    soma += parseInt(digits[i]) * pesos2[i];
  }
  resto = soma % 11;
  const dv2 = resto < 2 ? 0 : 11 - resto;
  if (dv2 !== parseInt(digits[13])) return false;

  return true;
}

/**
 * Valida CPF ou CNPJ baseado no tamanho
 */
export function validarCpfCnpj(value: string): boolean {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 11) {
    return validarCPF(digits);
  }
  if (digits.length === 14) {
    return validarCNPJ(digits);
  }
  return false;
}

/**
 * Valida telefone brasileiro (10 ou 11 dígitos)
 */
export function validarTelefone(telefone: string): boolean {
  const digits = telefone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 11;
}

/**
 * Valida CEP (8 dígitos)
 */
export function validarCEP(cep: string): boolean {
  const digits = cep.replace(/\D/g, "");
  return digits.length === 8;
}

/**
 * Valida email
 */
export function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
