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
 * @param {boolean} [params.isPublic] - Notifica también a clientes públicos
 */
export function emitStatsUpdated({ formId, entityId, timestamp, isPublic = false }) {
  // Canal específico del formulario (para /analytics/:id)
  broadcastStats(`form:${formId}`, "stats_updated", { formId, timestamp });
  // Canal general (para /insights del super_admin)
  broadcastStats("general", "stats_updated", { formId, timestamp });
  // Canal de entidad (para /entity-stats del entity_admin)
  if (entityId) {
    broadcastStats(`entity:${entityId}`, "stats_updated", { formId, entityId, timestamp });
  }
  if (isPublic) emitPublicStatsUpdated(timestamp);
}

/**
 * Publica únicamente un aviso de invalidación, sin identificar el formulario.
 * El endpoint público solo transmite este evento sin datos sensibles.
 * @param {string} timestamp
 */
export function emitPublicStatsUpdated(timestamp) {
  broadcastStats("public", "stats_updated", { timestamp });
}

/**
 * Indica si el formulario participa en el catálogo y las estadísticas públicas.
 * @param {object|null|undefined} form
 * @returns {boolean}
 */
export function isPublicStatsForm(form) {
  if (!form || form.isArchived) return false;
  if (!["published", "visible", "publico"].includes(form.status)) return false;
  const visibility = form.visibility || "public";
  return visibility !== "private" && visibility !== "unlisted";
}

export function sumPublicResponseCounts(forms, responseCounts) {
  const publicFormIds = new Set(
    forms.filter(isPublicStatsForm).map((form) => String(form._id)),
  );
  return responseCounts.reduce(
    (total, item) => total + (publicFormIds.has(String(item.form)) ? item.count : 0),
    0,
  );
}

/**
 * Cuenta clientes en un canal.
 * @param {string} channel
 * @returns {number}
 */
export function countStatsClients(channel) {
  return clientsByChannel.get(channel)?.size || 0;
}