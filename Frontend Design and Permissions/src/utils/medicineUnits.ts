import { InventoryLine, Medicine, UnitConversion } from '../types';

export const unitLabelMap: Record<string, string> = {
  vien: 'Viên',
  vi: 'Vỉ',
  hop: 'Hộp',
  chai: 'Chai',
  lo: 'Lọ',
  tuyp: 'Tuýp',
  thung: 'Thùng',
  ong: 'Ống',
  goi: 'Gói',
  but: 'Bút',
};

type UnitConvertible = {
  unit: string;
  unitConversions?: UnitConversion[];
};

export interface TransactionUnitOption {
  value: string;
  label: string;
  factorToBase: number;
}

export function getUnitLabel(unitValue: string) {
  return unitLabelMap[unitValue] || unitValue;
}

export function resolveFactorToBaseUnit(
  source: UnitConvertible,
  transactionUnit: string
): number | null {
  if (!transactionUnit) {
    return null;
  }

  if (transactionUnit === source.unit) {
    return 1;
  }

  const conversions = source.unitConversions || [];
  const queue: Array<{ unit: string; factor: number }> = [{ unit: transactionUnit, factor: 1 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current.unit)) {
      continue;
    }

    visited.add(current.unit);

    const nextConversions = conversions.filter((conversion) => conversion.fromUnit === current.unit);
    for (const conversion of nextConversions) {
      const nextFactor = current.factor * conversion.conversionRate;
      if (conversion.toUnit === source.unit) {
        return nextFactor;
      }

      if (!visited.has(conversion.toUnit)) {
        queue.push({
          unit: conversion.toUnit,
          factor: nextFactor,
        });
      }
    }
  }

  return null;
}

export function getTransactionUnitOptions(
  source: UnitConvertible
): TransactionUnitOption[] {
  const uniqueUnits = new Set<string>([source.unit]);

  (source.unitConversions || []).forEach((conversion) => {
    uniqueUnits.add(conversion.fromUnit);
  });

  return Array.from(uniqueUnits)
    .map((unitValue) => {
      const factorToBase = resolveFactorToBaseUnit(source, unitValue);
      if (!factorToBase) {
        return null;
      }

      return {
        value: unitValue,
        label: getUnitLabel(unitValue),
        factorToBase,
      };
    })
    .filter((option): option is TransactionUnitOption => option !== null)
    .sort((a, b) => b.factorToBase - a.factorToBase);
}

export function buildConversionSummary(
  quantity: number,
  transactionUnit: string,
  baseQuantity: number,
  baseUnit: string
) {
  return `${quantity} ${getUnitLabel(transactionUnit)} = ${baseQuantity} ${getUnitLabel(baseUnit)}`;
}

export function getInventoryTransactionUnits(line: InventoryLine | Medicine) {
  return getTransactionUnitOptions({
    unit: line.unit,
    unitConversions: line.unitConversions,
  });
}
