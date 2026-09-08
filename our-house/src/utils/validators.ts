export interface ValidationErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  monthlyIncome?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  occupation?: string;
}

export function validateProfileData(data: {
  fullName: string;
  email: string;
  phone: string;
  monthlyIncome: number | string;
  occupation: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}): { isValid: boolean; errors: ValidationErrors; warnings: string[] } {
  const errors: ValidationErrors = {};
  const warnings: string[] = [];

  // 1. Nombre completo
  const trimmedName = data.fullName.trim();
  if (!trimmedName) {
    errors.fullName = 'El nombre completo es obligatorio.';
  } else if (trimmedName.length < 3) {
    errors.fullName = 'El nombre debe tener al menos 3 caracteres.';
  } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/.test(trimmedName)) {
    errors.fullName = 'El nombre contiene caracteres especiales no válidos.';
  } else if (trimmedName.split(/\s+/).length < 2) {
    warnings.push('Se recomienda incluir al menos un nombre y un apellido para identificación en la vivienda.');
  }

  // 2. Correo electrónico
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const trimmedEmail = data.email.trim();
  if (!trimmedEmail) {
    errors.email = 'El correo electrónico es obligatorio.';
  } else if (!emailRegex.test(trimmedEmail)) {
    errors.email = 'Ingresa un correo electrónico con formato válido (ejemplo: usuario@correo.com).';
  }

  // 3. Teléfono de contacto
  const cleanedPhone = data.phone.replace(/[\s\-().+]/g, '');
  if (!data.phone.trim()) {
    errors.phone = 'El teléfono de contacto es obligatorio para coordinación de la vivienda.';
  } else if (!/^\d+$/.test(cleanedPhone)) {
    errors.phone = 'El teléfono solo debe contener números.';
  } else if (cleanedPhone.length < 7 || cleanedPhone.length > 15) {
    errors.phone = 'El número de teléfono debe tener entre 7 y 15 dígitos.';
  }

  // 4. Ingreso mensual (RF03 / HU04 / RF08)
  const incomeValue = typeof data.monthlyIncome === 'number' ? data.monthlyIncome : Number(data.monthlyIncome);
  if (data.monthlyIncome === '' || isNaN(incomeValue)) {
    errors.monthlyIncome = 'El ingreso mensual estimado es obligatorio para el prorrateo de gastos.';
  } else if (incomeValue < 0) {
    errors.monthlyIncome = 'El ingreso mensual no puede ser un valor negativo.';
  } else if (incomeValue === 0) {
    warnings.push('Un ingreso mensual de $0 COP significa que tu cuota en gastos comunitarios será del 0%, siendo asumida en su totalidad por los demás integrantes.');
  } else if (incomeValue > 100000000) {
    errors.monthlyIncome = 'Por favor verifica el valor ingresado (excede el límite permitido para el MVP).';
  }

  // 5. Ocupación
  if (!data.occupation.trim()) {
    errors.occupation = 'Indica tu ocupación o programa académico actual.';
  } else if (data.occupation.trim().length < 2) {
    errors.occupation = 'La ocupación debe contener al menos 2 caracteres.';
  }

  // 6. Contacto de emergencia (integridad relacional)
  const hasEmergencyName = Boolean(data.emergencyContactName && data.emergencyContactName.trim().length > 0);
  const hasEmergencyPhone = Boolean(data.emergencyContactPhone && data.emergencyContactPhone.trim().length > 0);

  if (hasEmergencyName && !hasEmergencyPhone) {
    errors.emergencyContactPhone = 'Si especificas un nombre de contacto de emergencia, debes indicar su número de teléfono.';
  } else if (!hasEmergencyName && hasEmergencyPhone) {
    errors.emergencyContactName = 'Si especificas un teléfono de emergencia, debes indicar a quién pertenece.';
  } else if (hasEmergencyPhone && data.emergencyContactPhone) {
    const cleanedEmergPhone = data.emergencyContactPhone.replace(/[\s\-().+]/g, '');
    if (!/^\d+$/.test(cleanedEmergPhone) || cleanedEmergPhone.length < 7) {
      errors.emergencyContactPhone = 'El teléfono de emergencia debe ser un número válido de al menos 7 dígitos.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}
