import { LINE_ITEMS, BILAN_CARBONE_IMPORT_KEY, type ImportedBilanCarbonePayload } from "@/lib/carbonLineItems";

const VALID_KEYS = new Set(LINE_ITEMS.map((i) => i.key));

export class BilanCarboneImportError extends Error {}

type RawRow = Record<string, string | number>;

function rowsToPayload(rows: RawRow[]): ImportedBilanCarbonePayload {
  const items: { category: string; quantity: number }[] = [];
  let period = "";
  let siteName: string | undefined;
  const unknownCategories: string[] = [];

  for (const row of rows) {
    const normalized: Record<string, string | number> = {};
    for (const key of Object.keys(row)) {
      normalized[key.trim().toLowerCase()] = row[key];
    }

    const category = String(normalized.category ?? "").trim();
    const quantity = Number(normalized.quantity);
    const rowPeriod = normalized.period != null ? String(normalized.period).trim() : "";
    const rowSite = normalized.site != null ? String(normalized.site).trim() : "";

    if (!category || Number.isNaN(quantity)) continue;

    if (!VALID_KEYS.has(category)) {
      unknownCategories.push(category);
      continue;
    }

    items.push({ category, quantity });
    if (!period && rowPeriod) period = rowPeriod;
    if (!siteName && rowSite) siteName = rowSite;
  }

  if (items.length === 0) {
    throw new BilanCarboneImportError(
      unknownCategories.length > 0
        ? `Aucune catégorie reconnue. Catégories inconnues : ${unknownCategories.join(", ")}.`
        : "Aucune ligne valide trouvée dans le fichier.",
    );
  }

  return { period, siteName, items };
}

export function parseBilanCarboneCsv(text: string): ImportedBilanCarbonePayload {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new BilanCarboneImportError("Le fichier est vide ou ne contient aucune ligne de données.");
  }

  const header = lines[0].split(",").map((h) => h.trim());
  const rows: RawRow[] = lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const row: RawRow = {};
    header.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });
    return row;
  });

  return rowsToPayload(rows);
}

export function parseBilanCarboneRows(rows: RawRow[]): ImportedBilanCarbonePayload {
  if (!rows || rows.length === 0) {
    throw new BilanCarboneImportError("Aucune ligne trouvée dans les données.");
  }
  return rowsToPayload(rows);
}

export function parseBilanCarboneApiResponse(json: unknown): ImportedBilanCarbonePayload {
  let rows: RawRow[] | null = null;
  if (Array.isArray(json)) {
    rows = json as RawRow[];
  } else if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    for (const key of ["data", "results", "items"]) {
      if (Array.isArray(obj[key])) {
        rows = obj[key] as RawRow[];
        break;
      }
    }
  }
  if (!rows) {
    throw new BilanCarboneImportError(
      "Format JSON non reconnu — attendu un tableau ou un champ data/results/items.",
    );
  }
  return parseBilanCarboneRows(rows);
}

export function storeBilanCarboneImport(payload: ImportedBilanCarbonePayload) {
  sessionStorage.setItem(BILAN_CARBONE_IMPORT_KEY, JSON.stringify(payload));
}

export function readBilanCarboneImport(): ImportedBilanCarbonePayload | null {
  const raw = sessionStorage.getItem(BILAN_CARBONE_IMPORT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ImportedBilanCarbonePayload;
  } catch {
    return null;
  }
}

export function clearBilanCarboneImport() {
  sessionStorage.removeItem(BILAN_CARBONE_IMPORT_KEY);
}