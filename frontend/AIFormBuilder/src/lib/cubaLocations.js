const locations = {
  "Pinar del Rio": ["Consolacion del Sur", "Guane", "La Palma", "Los Palacios", "Mantua", "Minas de Matahambre", "Pinar del Rio", "San Luis", "San Juan y Martinez", "Sandino", "Vinales"],
  Artemisa: ["Alquizar", "Artemisa", "Bahia Honda", "Bauta", "Caimito", "Candelaria", "Guanajay", "Guira de Melena", "Mariel", "San Antonio de los Banos", "San Cristobal"],
  "La Habana": ["Arroyo Naranjo", "Boyeros", "Centro Habana", "Cerro", "Cotorro", "Diez de Octubre", "Guanabacoa", "Habana del Este", "Habana Vieja", "La Lisa", "Marianao", "Playa", "Plaza de la Revolucion", "Regla", "San Miguel del Padron"],
  Mayabeque: ["Batabano", "Bejucal", "Güines", "Jaruco", "Madruga", "Melena del Sur", "Nueva Paz", "Quivican", "San Jose de las Lajas", "San Nicolas", "Santa Cruz del Norte"],
  Matanzas: ["Calimete", "Cardenas", "Cienaga de Zapata", "Colon", "Jaguey Grande", "Jovellanos", "Limonar", "Los Arabos", "Marti", "Matanzas", "Pedro Betancourt", "Perico", "Union de Reyes"],
  "Villa Clara": ["Caibarien", "Camajuani", "Cifuentes", "Corralillo", "Encrucijada", "Manicaragua", "Placetas", "Quemado de Guines", "Ranchuelo", "Remedios", "Sagua la Grande", "Santa Clara", "Santo Domingo"],
  Cienfuegos: ["Abreus", "Aguada de Pasajeros", "Cienfuegos", "Cruces", "Cumanayagua", "Lajas", "Palmira", "Rodas"],
  "Sancti Spiritus": ["Cabaiguan", "Fomento", "Jatibonico", "La Sierpe", "Sancti Spiritus", "Taguasco", "Trinidad", "Yaguajay"],
  "Ciego de Avila": ["Baragua", "Bolivia", "Chambas", "Ciego de Avila", "Ciro Redondo", "Florencia", "Majagua", "Moron", "Primero de Enero", "Venezuela"],
  Camaguey: ["Camaguey", "Carlos Manuel de Cespedes", "Esmeralda", "Florida", "Guaimaro", "Jimaguayu", "Minas", "Najasa", "Nuevitas", "Santa Cruz del Sur", "Sibanicu", "Sierra de Cubitas", "Vertientes"],
  "Las Tunas": ["Amancio", "Colombia", "Jesus Menendez", "Jobabo", "Las Tunas", "Majibacoa", "Manati", "Puerto Padre"],
  Holguin: ["Antilla", "Baguano", "Banes", "Cacocum", "Calixto Garcia", "Cueto", "Frank Pais", "Gibara", "Holguin", "Mayari", "Moa", "Rafael Freyre", "Sagua de Tanamo", "Urbano Noris"],
  Granma: ["Bartolome Maso", "Bayamo", "Buey Arriba", "Campechuela", "Cauto Cristo", "Guisa", "Jiguani", "Manzanillo", "Media Luna", "Niquero", "Pilón", "Rio Cauto", "Yara"],
  "Santiago de Cuba": ["Contramaestre", "Guama", "Mella", "Palma Soriano", "San Luis", "Segundo Frente", "Songo-La Maya", "Santiago de Cuba", "Tercer Frente"],
  Guantanamo: ["Baracoa", "Caimanera", "El Salvador", "Guantanamo", "Imias", "Maisi", "Manuel Tames", "Niceto Perez", "San Antonio del Sur", "Yateras"],
  "Isla de la Juventud": ["Isla de la Juventud"],
};

export const CUBA_PROVINCES = Object.keys(locations);

/* Traducciones de provincias es ↔ en. Los nombres de municipio son propios
   y no se traducen (se usan igual en ambos idiomas). */
export const PROVINCE_TRANSLATIONS = {
  es: {
    "Pinar del Rio": "Pinar del Río",
    Artemisa: "Artemisa",
    "La Habana": "La Habana",
    Mayabeque: "Mayabeque",
    Matanzas: "Matanzas",
    "Villa Clara": "Villa Clara",
    Cienfuegos: "Cienfuegos",
    "Sancti Spiritus": "Sancti Spíritus",
    "Ciego de Avila": "Ciego de Ávila",
    Camaguey: "Camagüey",
    "Las Tunas": "Las Tunas",
    Holguin: "Holguín",
    Granma: "Granma",
    "Santiago de Cuba": "Santiago de Cuba",
    Guantanamo: "Guantánamo",
    "Isla de la Juventud": "Isla de la Juventud",
  },
  en: {
    "Pinar del Río": "Pinar del Río",
    Artemisa: "Artemisa",
    "La Habana": "Havana",
    Mayabeque: "Mayabeque",
    Matanzas: "Matanzas",
    "Villa Clara": "Villa Clara",
    Cienfuegos: "Cienfuegos",
    "Sancti Spíritus": "Sancti Spiritus",
    "Ciego de Ávila": "Ciego de Avila",
    Camagüey: "Camaguey",
    "Las Tunas": "Las Tunas",
    Holguín: "Holguin",
    Granma: "Granma",
    "Santiago de Cuba": "Santiago de Cuba",
    Guantánamo: "Guantanamo",
    "Isla de la Juventud": "Isle of Youth",
  },
};

export const CUBA_MUNICIPALITIES = Object.entries(locations).flatMap(([province, municipalities]) =>
  municipalities.map((municipality) => ({ province, municipality }))
);

export function municipalitiesFor(province) {
  return locations[province] || [];
}

export function translateProvince(province, language) {
  const key = language === "es" ? "es" : "en";
  return PROVINCE_TRANSLATIONS[key]?.[province] ?? province;
}
