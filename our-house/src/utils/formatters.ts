/**
 * Formatea un valor numérico a moneda colombiana (COP)
 */
export function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formatea números con separadores de miles
 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('es-CO').format(amount);
}

/**
 * Calcula el prorrateo proporcional individual de un gasto según fórmula RF08:
 * C_i = Monto_TotalGasto * (I_i / Monto_TotalIngresos)
 */
export function calculateProportionalShare(
  totalExpense: number,
  userIncome: number,
  allIncomes: number[]
): {
  shareAmount: number;
  percentage: number;
  totalIncome: number;
} {
  const totalIncome = allIncomes.reduce((acc, curr) => acc + (curr > 0 ? curr : 0), 0);
  if (totalIncome <= 0 || userIncome <= 0) {
    return {
      shareAmount: 0,
      percentage: 0,
      totalIncome: 0,
    };
  }

  const ratio = userIncome / totalIncome;
  const shareAmount = Math.round(totalExpense * ratio);
  const percentage = Number((ratio * 100).toFixed(1));

  return {
    shareAmount,
    percentage,
    totalIncome,
  };
}
