# Gestor de Formularios

This frontend uses the Express backend for authentication, forms, responses, analytics Components keep importing the same endpoint
groups from `src/services/index.js`.

It is the real app's `src` copied **verbatim**; only the network/integration layer was
changed. The config files (`package.json`, `index.html`, `vite.config.js`, etc.) are the
originals, copied alongside so this folder runs on its own.

## Run it

```bash
cd frontend/boilerplate
npm install
npm run dev            # http://localhost:5173
```

Configure `VITE_API_URL` in `.env` and start the backend before using the app. Ollama
must be running locally with the model configured in `backend/.env`.

## Network layer

The network layer is active and uses the real backend:

| File | Change |
| --- | --- |
| `src/lib/api.js` | Axios client, JWT helpers, authorization interceptor and 401 handling. |
| `src/services/index.js` | Real endpoint groups for auth, forms, responses, analytics, insights and AI. |

There is **no realtime/socket** layer in this app, so nothing else to stub.

Point the frontend at your API via `.env`:
   ```
   VITE_API_URL=http://localhost:8000/api
   ```

Every component imports `authApi` / `formApi` / `responseApi` / `aiApi` / `insightsApi`
from `src/services/index.js` and `TOKEN_KEY` from `src/lib/api.js`.

## Notes

- `axios` is the active HTTP client.
