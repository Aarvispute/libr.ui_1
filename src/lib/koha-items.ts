export type KohaRecord = Record<string, unknown>;

const DIRECT_CALL_NUMBER_KEYS = [
  "callnumber",
  "call_number",
  "item_call_number",
  "itemcallnumber",
] as const;

const ITEM_ID_KEYS = ["item_id", "itemnumber", "item_number"] as const;

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function getKohaString(
  record: KohaRecord | null | undefined,
  keys: readonly string[]
): string | null {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const value = cleanString(record[key]);
    if (value) {
      return value;
    }
  }

  return null;
}

export function extractCallNumber(
  record: KohaRecord | null | undefined
): string | null {
  if (!record) {
    return null;
  }

  return getKohaString(record, DIRECT_CALL_NUMBER_KEYS);
}

export function summarizeCallNumbers(
  records: Array<KohaRecord | null | undefined>
): string | null {
  const uniqueCallNumbers = Array.from(
    new Set(records.map((record) => extractCallNumber(record)).filter(Boolean))
  ) as string[];

  if (uniqueCallNumbers.length === 0) {
    return null;
  }

  if (uniqueCallNumbers.length <= 3) {
    return uniqueCallNumbers.join(", ");
  }

  return `${uniqueCallNumbers.slice(0, 3).join(", ")} +${
    uniqueCallNumbers.length - 3
  } more`;
}

export function extractItemId(
  record: KohaRecord | null | undefined
): string | number | null {
  if (!record) {
    return null;
  }

  for (const key of ITEM_ID_KEYS) {
    const value = record[key];
    if (typeof value === "string" || typeof value === "number") {
      return value;
    }
  }

  return null;
}
