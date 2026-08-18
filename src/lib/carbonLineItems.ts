export type Scope = 1 | 2 | 3;
export type Group = "amont" | "aval" | null;

export type LineItem = {
  key: string;
  scope: Scope;
  group: Group;
  label: string;
  unit: string;
  defaultFactor: number;
  isElectricity?: boolean;
};

export const LINE_ITEMS: LineItem[] = [
  // Scope 1 — Émissions directes
  { key: "combustion_fixed_mobile", scope: 1, group: null, label: "Sources fixes et mobiles de combustion", unit: "L carburant", defaultFactor: 2.68 },
  { key: "fugitive_emissions", scope: 1, group: null, label: "Émissions fugitives", unit: "kg gaz réfrigérant", defaultFactor: 150 },
  { key: "non_energy_process", scope: 1, group: null, label: "Procédés hors énergie", unit: "kg produit transformé", defaultFactor: 0.3 },
  { key: "biomass", scope: 1, group: null, label: "Biomasses", unit: "kg biomasse brûlée", defaultFactor: 0.1 },

  // Scope 2 — Émissions indirectes (énergie)
  { key: "electricity", scope: 2, group: null, label: "Consommation d'électricité", unit: "kWh", defaultFactor: 0.5, isElectricity: true },
  { key: "steam_heat_cold", scope: 2, group: null, label: "Consommation de vapeur, chaleur ou froid", unit: "kWh thermique", defaultFactor: 0.2 },

  // Scope 3 amont
  { key: "purchased_goods", scope: 3, group: "amont", label: "Achats de produits et services", unit: "k€ dépensés", defaultFactor: 0.4 },
  { key: "capital_goods", scope: 3, group: "amont", label: "Amortissements (immobilisations)", unit: "k€ valeur", defaultFactor: 0.3 },
  { key: "fuel_energy_upstream", scope: 3, group: "amont", label: "Amont de l'énergie", unit: "kWh", defaultFactor: 0.05 },
  { key: "upstream_freight", scope: 3, group: "amont", label: "Transport de marchandises amont", unit: "km", defaultFactor: 0.15 },
  { key: "visitor_transport", scope: 3, group: "amont", label: "Transport de visiteurs et de clients", unit: "km", defaultFactor: 0.15 },
  { key: "commuting", scope: 3, group: "amont", label: "Déplacements domicile-travail", unit: "km", defaultFactor: 0.12 },
  { key: "business_travel", scope: 3, group: "amont", label: "Déplacements professionnels", unit: "km", defaultFactor: 0.18 },
  { key: "leased_assets_upstream", scope: 3, group: "amont", label: "Actifs en leasing amont", unit: "k€ valeur", defaultFactor: 0.3 },

  // Scope 3 aval
  { key: "downstream_freight", scope: 3, group: "aval", label: "Transport de marchandises aval", unit: "km", defaultFactor: 0.15 },
  { key: "product_use", scope: 3, group: "aval", label: "Utilisation des produits vendus", unit: "kWh", defaultFactor: 0.4 },
  { key: "downstream_leasing", scope: 3, group: "aval", label: "Leasing aval", unit: "k€ valeur", defaultFactor: 0.3 },
  { key: "waste", scope: 3, group: "aval", label: "Déchets", unit: "kg", defaultFactor: 0.5 },
  { key: "end_of_life", scope: 3, group: "aval", label: "Fin de vie des produits vendus", unit: "kg produit", defaultFactor: 0.3 },
  { key: "franchises", scope: 3, group: "aval", label: "Franchise aval", unit: "k€ CA franchisé", defaultFactor: 0.2 },
  { key: "other_indirect", scope: 3, group: "aval", label: "Autres émissions indirectes", unit: "k€", defaultFactor: 0.2 },
];

export type ImportedBilanCarbonePayload = {
  period: string;
  siteName?: string;
  items: { category: string; quantity: number }[];
};

export const BILAN_CARBONE_IMPORT_KEY = "verdustry_bilan_carbone_import";