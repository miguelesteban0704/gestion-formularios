const clientsByChannel = new Map(); // channel -> Set<res>

/**
 * Añade un cliente SSE a un canal.
 * @param {string} channel - Canal: "general", "form:{formId}", "entity:{entityId}"
 * @param {import('express').Response} res - Respuesta HTTP para SSE
 */
export function addStatsClient(channel, res) {
  if (!clientsByChannel.has(channel)) clientsByChannel.set(channel, new Set());
  clientsByChannel.get(channel).add(res);
}

/**
 * Elimina un cliente SSE de un canal y limpia el canal si queda vacío.
 * @param {string} channel
 * @param {import('express').Response} res
 */
export function removeStatsClient(channel, res) {
  const set = clientsByChannel.get(channel);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) clientsByChannel.delete(channel);
}

/**
 * Emite un evento a todos los clientes de un canal.
 * @param {string} channel
 * @param {string} event - Nombre del evento (ej. "stats_updated")
 * @param {object} data - Payload JSON
 */
export function broadcastStats(channel, event, data) {
  const set = clientsByChannel.get(channel);
  if (!set || set.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try {
      res.write(payload);
    } catch {
      // cliente desconectado, limpiar
      set.delete(res);
    }
  }
}

/**
 * Emite un evento de actualización de stats a los canales relevantes.
 * @param {object} params
 * @param {string} params.formId - ID del formulario
 * @param {string} [params.entityId] - ID de la entidad (opcional)
 * @param {string} params.timestamp - ISO timestamp
 */
export function emitStatsUpdated({ formId, entityId, timestamp }) {
  // Canal específico del formulario (para /analytics/:id)
  broadcastStats(`form:${formId}`, "stats_updated", { formId, timestamp });
  // Canal general (para /insights del super_admin)
  broadcastStats("general", "stats_updated", { formId, timestamp });
  // Canal de entidad (para /entity-stats del entity_admin)
  if (entityId) {
    broadcastStats(`entity:${entityId}`, "stats_updated", { formId, entityId, timestamp });
  }
}

/**
 * Cuenta clientes en un canal.
 * @param {string} channel
 * @returns {number}
 */
export function countStatsClients(channel) {
  return clientsByChannel.get(channel)?.size || 0;
}