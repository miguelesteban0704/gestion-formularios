# Gestor de Formularios

Panel de gestión de formularios. React + Vite + Tailwind v4.

- **[DESPLIEGUE.md](./DESPLIEGUE.md)** — lo que tiene que estar bien fuera del
  código. Empieza por ahí: la regla que no se negocia es que el servidor
  devuelva `index.html` para cualquier ruta de la app, y sin ella falla en
  producción de una forma que `npm run preview` no reproduce.
- **Rutas** — la tabla de páginas y sus dos idiomas vive en
  [`src/lib/routes.js`](./src/lib/routes.js). De ahí salen a la vez las rutas de
  React y las direcciones de la barra, para que no puedan contradecirse. Las
  URLs del panel son `/panel-gestion/…` en español y `/en/panel-management/…` en
  inglés.
- **Sondas** (`qa/`) — comprobaciones sin red (`npm run qa:routes`) y con
  navegador real (`npm run qa:nav`, `npm run qa:card`, …). La cabecera de cada
  fichero explica qué mide y cuándo hay que correrlo a mano.

## Desarrollo

```bash
npm install
npm run dev          # https://127.0.0.1:5173, con los certificados de certs/
```

El backend va aparte, en `../../backend`, y también es https.

---

<details>
<summary>Sobre la plantilla de Vite</summary>

Este proyecto se creó con la plantilla de Vite (`react` + oxlint). Lo único que
se conserva de ella es el andamiaje.

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react) usa
  [Oxc](https://oxc.rs). No está el plugin de SWC.
- El compilador de React no está activado, por su impacto en el desarrollo y la
  compilación. Ver [la documentación](https://react.dev/learn/react-compiler/installation).
- La configuración de oxlint no usa reglas con tipos: el proyecto es JavaScript,
  no TypeScript.

</details>
