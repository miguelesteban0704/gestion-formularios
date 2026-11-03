const clientsByForm = new Map(); // formId -> Set<res>

export function addClient(formId, res) {
  if (!clientsByForm.has(formId)) clientsByForm.set(formId, new Set());
  clientsByForm.get(formId).add(res);
}

export function removeClient(formId, res) {
  const set = clientsByForm.get(formId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) clientsByForm.delete(formId);
}

export function broadcast(formId, event, data) {
  const set = clientsByForm.get(formId);
  if (!set || set.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try {
      res.write(payload);
    } catch {
      // client disconnected
      set.delete(res);
    }
  }
}

export function countClients(formId) {
  return clientsByForm.get(formId)?.size || 0;
}
