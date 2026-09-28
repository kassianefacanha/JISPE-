const isValidCPF = (cpf = '') => {
  const cleaned = String(cpf).replace(/[.-]/g, '');

  if (!cleaned || cleaned.length !== 11 || /^\d{11}$/.test(cleaned) === false) return false;

  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += Number(cleaned.charAt(i)) * (10 - i);
  }

  let digit1 = 11 - (sum % 11);
  digit1 = digit1 >= 10 ? 0 : digit1;

  if (Number(cleaned.charAt(9)) !== digit1) return false;

  sum = 0;
  for (let i = 0; i < 10; i += 1) {
    sum += Number(cleaned.charAt(i)) * (11 - i);
  }

  let digit2 = 11 - (sum % 11);
  digit2 = digit2 >= 10 ? 0 : digit2;

  return Number(cleaned.charAt(10)) === digit2;
};

module.exports = { isValidCPF };
