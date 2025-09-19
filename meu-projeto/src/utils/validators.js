const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateCPF = (cpf) => {
  if (!cpf) return false;
  const cleanCPF = cpf.replace(/\D/g, "");
  return cleanCPF.length === 11;
};

const validateCNPJ = (cnpj) => {
  if (!cnpj) return false;
  const cleanCNPJ = cnpj.replace(/\D/g, "");
  return cleanCNPJ.length === 14;
};

const validatePassword = (password) => {
  if (!password || typeof password !== "string") return false;
  return password.length >= 6;
};

const cleanCPF = (cpf) => {
  return cpf ? cpf.replace(/\D/g, "") : "";
};

const cleanCNPJ = (cnpj) => {
  return cnpj ? cnpj.replace(/\D/g, "") : "";
};

const generateCodigoMotorista = () => {
  const letters = Math.random().toString(36).substring(2, 4).toUpperCase();
  const numbers = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return letters + numbers;
};

const validateRequiredFields = (fields, data) => {
  const missing = [];

  for (const field of fields) {
    if (typeof field === "string") {
      if (!data[field] || (typeof data[field] === "string" && data[field].trim() === "")) {
        missing.push(field);
      }
    } else if (typeof field === "object" && field.name) {
      const value = data[field.name];
      if (!value || (typeof value === "string" && value.trim() === "")) {
        missing.push(field.displayName || field.name);
      }
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
    message: missing.length > 0 ? `Campos obrigatórios: ${missing.join(", ")}` : null
  };
};

const sanitizeString = (str, maxLength = null) => {
  if (!str || typeof str !== "string") return "";

  let sanitized = str.trim();

  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
};

const validateNumeric = (value, min = null, max = null) => {
  const num = parseFloat(value);

  if (isNaN(num)) return { isValid: false, message: "Deve ser um número válido" };

  if (min !== null && num < min) {
    return { isValid: false, message: `Deve ser maior que ${min}` };
  }

  if (max !== null && num > max) {
    return { isValid: false, message: `Deve ser menor que ${max}` };
  }

  return { isValid: true, value: num };
};

const validateEnum = (value, allowedValues, fieldName = "campo") => {
  if (!allowedValues.includes(value)) {
    return {
      isValid: false,
      message: `${fieldName} deve ser um dos valores: ${allowedValues.join(", ")}`
    };
  }

  return { isValid: true };
};

module.exports = {
  validateEmail,
  validateCPF,
  validateCNPJ,
  validatePassword,
  cleanCPF,
  cleanCNPJ,
  generateCodigoMotorista,
  validateRequiredFields,
  sanitizeString,
  validateNumeric,
  validateEnum,
};