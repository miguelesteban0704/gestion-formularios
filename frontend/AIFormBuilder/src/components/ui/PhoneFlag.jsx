/*
 * Banderas de país como SVG inline.
 *
 * Los emoji de bandera (🇨🇺) NO se renderizan como bandera en Windows (falta la
 * fuente de banderas regionales), así que se dibujan a mano. Cada bandera es un
 * `<svg>` con `viewBox="0 0 24 16"` y `preserveAspectRatio`, de modo que se
 * escala a cualquier tamaño con `className`. Es decorativo (`aria-hidden`) y no
 * depende de CDN ni de fuentes externas.
 *
 * El `code` es el ISO-3166 alpha-2 de `PHONE_COUNTRIES`.
 */

function Frame({ children, className }) {
  return (
    <svg
      viewBox="0 0 24 16"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      role="img"
    >
      {children}
    </svg>
  );
}

/* Cuba: franjas azules/blancas + triángulo rojo con estrella blanca. */
function CU({ className }) {
  return (
    <Frame className={className}>
      <rect width="24" height="16" fill="#fff" />
      <rect width="24" height="3.2" fill="#0055A4" />
      <rect y="6.4" width="24" height="3.2" fill="#0055A4" />
      <rect y="12.8" width="24" height="3.2" fill="#0055A4" />
      <path d="M0 0 L10 8 L0 16 Z" fill="#D21034" />
      <path d="M4 5.4 L4.6 7.2 L6.5 7.1 L5.0 8.3 L5.5 10.0 L4 9 L2.5 10.0 L3.0 8.3 L1.5 7.1 L3.4 7.2 Z" fill="#fff" />
    </Frame>
  );
}

/* Estados Unidos: franjas rojas/blancas + cantón azul. */
function US({ className }) {
  return (
    <Frame className={className}>
      <rect width="24" height="16" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12, 14].map((y) => (
        <rect key={y} y={y * 0.8} width="24" height="1.23" fill="#B22234" />
      ))}
      <rect width="10" height="8.6" fill="#3C3B6E" />
    </Frame>
  );
}

/* México: verde/blanco/rojo vertical + escudo simplificado. */
function MX({ className }) {
  return (
    <Frame className={className}>
      <rect width="24" height="16" fill="#fff" />
      <rect width="8" height="16" fill="#006847" />
      <rect x="16" width="8" height="16" fill="#CE1126" />
      <circle cx="12" cy="8" r="2.1" fill="none" stroke="#8C6a3f" strokeWidth="1" />
    </Frame>
  );
}

/* España: rojo/amarillo/rojo horizontal. */
function ES({ className }) {
  return (
    <Frame className={className}>
      <rect width="24" height="16" fill="#AA151B" />
      <rect y="4" width="24" height="8" fill="#F1BF00" />
    </Frame>
  );
}

/* Colombia: amarillo (mitad) / azul / rojo. */
function CO({ className }) {
  return (
    <Frame className={className}>
      <rect width="24" height="16" fill="#003893" />
      <rect width="24" height="8" fill="#FCD116" />
      <rect y="12" width="24" height="4" fill="#CE1126" />
    </Frame>
  );
}

/* Argentina: celeste/blanco/celeste + sol. */
function AR({ className }) {
  return (
    <Frame className={className}>
      <rect width="24" height="16" fill="#fff" />
      <rect width="24" height="5.3" fill="#74ACDF" />
      <rect y="10.7" width="24" height="5.3" fill="#74ACDF" />
      <circle cx="12" cy="8" r="1.8" fill="#F6B40E" />
    </Frame>
  );
}

/* Chile: blanco/rojo + cantón azul con estrella. */
function CL({ className }) {
  return (
    <Frame className={className}>
      <rect width="24" height="16" fill="#fff" />
      <rect y="8" width="24" height="8" fill="#D52B1E" />
      <rect width="8" height="8" fill="#0039A6" />
      <path d="M4 2.5 L4.4 3.5 L5.4 3.5 L4.6 4.2 L4.9 5.2 L4 4.6 L3.1 5.2 L3.4 4.2 L2.6 3.5 L3.6 3.5 Z" fill="#fff" />
    </Frame>
  );
}

/* Perú: rojo/blanco/rojo vertical. */
function PE({ className }) {
  return (
    <Frame className={className}>
      <rect width="24" height="16" fill="#fff" />
      <rect width="8" height="16" fill="#D91023" />
      <rect x="16" width="8" height="16" fill="#D91023" />
    </Frame>
  );
}

/* Venezuela: amarillo/azul/rojo + arco de estrellas. */
function VE({ className }) {
  return (
    <Frame className={className}>
      <rect width="24" height="16" fill="#00247D" />
      <rect width="24" height="5.3" fill="#FFCC00" />
      <rect y="10.7" width="24" height="5.3" fill="#CF142B" />
      <circle cx="12" cy="8" r="1.4" fill="none" stroke="#fff" strokeWidth="0.7" strokeDasharray="0.9 0.7" />
    </Frame>
  );
}

/* República Dominicana: cruz blanca + cuarteles azul/rojo. */
function DO({ className }) {
  return (
    <Frame className={className}>
      <rect width="24" height="16" fill="#002D62" />
      <rect x="12" width="12" height="8" fill="#CE1126" />
      <rect y="8" width="12" height="8" fill="#CE1126" />
      <rect x="9.5" width="5" height="16" fill="#fff" />
      <rect y="6.5" width="24" height="3" fill="#fff" />
    </Frame>
  );
}

/* Brasil: verde + rombo amarillo + círculo azul. */
function BR({ className }) {
  return (
    <Frame className={className}>
      <rect width="24" height="16" fill="#009C3B" />
      <path d="M12 1.5 L22.5 8 L12 14.5 L1.5 8 Z" fill="#FFDF00" />
      <circle cx="12" cy="8" r="3.1" fill="#002776" />
    </Frame>
  );
}

/* Francia: azul/blanco/rojo vertical. */
function FR({ className }) {
  return (
    <Frame className={className}>
      <rect width="24" height="16" fill="#fff" />
      <rect width="8" height="16" fill="#0055A4" />
      <rect x="16" width="8" height="16" fill="#EF4135" />
    </Frame>
  );
}

/* Alemania: negro/rojo/amarillo horizontal. */
function DE({ className }) {
  return (
    <Frame className={className}>
      <rect width="24" height="16" fill="#000" />
      <rect y="5.33" width="24" height="5.33" fill="#DD0000" />
      <rect y="10.66" width="24" height="5.34" fill="#FFCE00" />
    </Frame>
  );
}

/* Reino Unido: Union Jack simplificado. */
function GB({ className }) {
  return (
    <Frame className={className}>
      <rect width="24" height="16" fill="#012169" />
      <path d="M0 0 L24 16 M24 0 L0 16" stroke="#fff" strokeWidth="3.2" />
      <path d="M0 0 L24 16 M24 0 L0 16" stroke="#C8102E" strokeWidth="1.6" />
      <path d="M12 0 V16 M0 8 H24" stroke="#fff" strokeWidth="5.3" />
      <path d="M12 0 V16 M0 8 H24" stroke="#C8102E" strokeWidth="3.2" />
    </Frame>
  );
}

/* Rusia: blanco/azul/rojo horizontal. */
function RU({ className }) {
  return (
    <Frame className={className}>
      <rect width="24" height="16" fill="#fff" />
      <rect y="5.33" width="24" height="5.33" fill="#0039A6" />
      <rect y="10.66" width="24" height="5.34" fill="#D52B1E" />
    </Frame>
  );
}

/* China: rojo + estrella grande amarilla. */
function CN({ className }) {
  return (
    <Frame className={className}>
      <rect width="24" height="16" fill="#DE2910" />
      <path d="M5.5 2 L6.0 3.3 L7.4 3.4 L6.3 4.2 L6.7 5.6 L5.5 4.8 L4.3 5.6 L4.7 4.2 L3.6 3.4 L5.0 3.3 Z" fill="#FFDE00" />
    </Frame>
  );
}

const FLAGS = { CU, US, MX, ES, CO, AR, CL, PE, VE, DO, BR, FR, DE, GB, RU, CN };

/** Bandera SVG del país (`code` ISO-2). Cae a un marco neutro si no hay dibujo. */
export function PhoneFlag({ code, className = "h-4 w-6" }) {
  const Flag = FLAGS[code];
  if (!Flag) {
    return (
      <Frame className={className}>
        <rect width="24" height="16" fill="rgb(148 163 184)" />
      </Frame>
    );
  }
  return <Flag className={className} />;
}
