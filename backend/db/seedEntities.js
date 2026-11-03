/**
 * Catálogo de entidades cubanas para el selector del panel (sección 10).
 *
 * Fuente: estructura vigente (OACE reducidos de 27 a 21 por la Ley de
 * Organización de la Administración Central del Estado, 30/07/2026).
 * Las Asambleas Municipales (168) se gestionan por CRUD: aquí solo viajan
 * las entidades con nombre propio según especificación.
 *
 * Cada entrada: { code, name, category }.
 * `code` es estable y es lo que se persiste en `entities.code`.
 */
export const ENTITY_CATEGORIES = [
  { code: "organos_estatales", es: "Órganos Estatales", en: "State Bodies" },
  { code: "oace", es: "Organismos de la Administración Central del Estado", en: "Central State Administration Bodies" },
  { code: "financieras", es: "Instituciones Financieras", en: "Financial Institutions" },
  { code: "rectoras", es: "Entidades Nacionales Rectoras", en: "National Governing Entities" },
  { code: "locales", es: "Órganos Locales del Poder Popular", en: "Local Bodies of People's Power" },
];

const A = [
  "Asamblea Nacional del Poder Popular",
  "Consejo de Estado",
  "Presidente de la República",
  "Consejo de Defensa Nacional",
  "Consejo Electoral Nacional",
  "Tribunal Supremo Popular",
  "Consejo de Ministros",
  "Primer Ministro",
  "Fiscalía General de la República",
  "Contraloría General de la República",
  "Gobierno Provincial",
  "Gobernador y Consejo Provincial",
  "Asamblea Municipal del Poder Popular",
  "Intendente y Consejo de Administración Municipal",
].map((name) => ({ name, category: "organos_estatales" }));

const B = [
  "Ministerio de Agricultura y Alimentación",
  "Ministerio de Comercio e Inversión Extranjera",
  "Ministerio de Cultura",
  "Ministerio de Deportes y Recreación",
  "Ministerio de Economía y Finanzas",
  "Ministerio de Educación",
  "Ministerio de Educación Superior, Ciencia e Innovación",
  "Ministerio de Energía y Minas",
  "Ministerio de Industrias y Construcción",
  "Ministerio de Información y Comunicación Social",
  "Ministerio de Comunicaciones",
  "Ministerio de Justicia",
  "Ministerio de Medio Ambiente, Hábitat y Recursos Hidráulicos",
  "Ministerio de Relaciones Exteriores",
  "Ministerio de Salud Pública",
  "Ministerio de Trabajo y Seguridad Social",
  "Ministerio de Turismo",
  "Ministerio de las Fuerzas Armadas Revolucionarias",
  "Ministerio del Interior",
  "Ministerio de Transporte",
  "Banco Central de Cuba (BCC)",
].map((name) => ({ name, category: "oace" }));

const C = [
  "Banco Nacional de Cuba (BNC)",
  "Banco Popular de Ahorro (BPA)",
  "Banco de Inversiones S.A. (BANCOI)",
  "Banco Metropolitano S.A. (BM)",
  "Banco Internacional de Comercio S.A. (BICSA)",
  "Banco Financiero Internacional S.A. (BFI)",
  "Banco de Crédito y Comercio (BANDEC)",
  "Banco Exterior de Cuba (BEC)",
  "Banco de Venezuela S.A.",
  "Grupo Nueva Banca S.A.",
  "Compañía Fiduciaria S.A.",
  "RAFIN S.A.",
  "FIMEL S.A.",
  "Casas de Cambio S.A. (CADECA)",
  "Corporación Financiera Habana S.A. (CFH)",
  "FINCIMEX S.A.",
  "FINATUR S.A.",
  "Financiera Iberoamericana S.A.",
  "Compañía Financiera S.A.",
  "ARCAZ S.A.",
  "FINTUR S.A.",
  "Servicios de Pago RED S.A.",
  "FINEXIM S.A.",
].map((name) => ({ name, category: "financieras" }));

const D = [
  "Instituto Nacional de Deportes, Educación Física y Recreación (INDER)",
  "Instituto de Información y Comunicación Social",
  "Instituto Nacional de Recursos Hidráulicos (INRH)",
  "Instituto Nacional de Ordenamiento Territorial y Urbanismo",
  "Instituto de Aeronáutica Civil de Cuba",
  "Instituto Cubano de Radio y Televisión",
  "Instituto Nacional de Reservas Estatales",
  "Centro de Gobierno Digital",
].map((name) => ({ name, category: "rectoras" }));

const E = [
  "Gobierno Provincial de Pinar del Río",
  "Gobierno Provincial de Artemisa",
  "Gobierno Provincial de La Habana",
  "Gobierno Provincial de Mayabeque",
  "Gobierno Provincial de Matanzas",
  "Gobierno Provincial de Villa Clara",
  "Gobierno Provincial de Cienfuegos",
  "Gobierno Provincial de Sancti Spíritus",
  "Gobierno Provincial de Ciego de Ávila",
  "Gobierno Provincial de Camagüey",
  "Gobierno Provincial de Las Tunas",
  "Gobierno Provincial de Holguín",
  "Gobierno Provincial de Granma",
  "Gobierno Provincial de Santiago de Cuba",
  "Gobierno Provincial de Guantánamo",
  "Municipio Especial Isla de la Juventud",
].map((name) => ({ name, category: "locales" }));

function slugifyCode(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const CUBAN_ENTITIES = [...A, ...B, ...C, ...D, ...E].map((e) => ({
  code: slugifyCode(e.name),
  name: e.name,
  category: e.category,
}));
