import { test, describe, before, after, mock } from "node:test";
import assert from "node:assert";
import { addStatsClient, removeStatsClient, broadcastStats, emitStatsUpdated, countStatsClients } from "../services/realtimeStats.js";
import * as realtimeStats from "../services/realtimeStats.js";

describe("realtimeStats - Gestor SSE de estadísticas", () => {
  const testChannel = "test:channel";
  let mockRes;

  before(() => {
    // Limpiar cualquier estado previo
    removeStatsClient(testChannel, {});
  });

  after(() => {
    removeStatsClient(testChannel, {});
  });

  test("addStatsClient registra un cliente en el canal", () => {
    mockRes = { write: mock.fn() };
    addStatsClient(testChannel, mockRes);
    assert.strictEqual(countStatsClients(testChannel), 1);
  });

  test("removeStatsClient elimina el cliente del canal", () => {
    removeStatsClient(testChannel, mockRes);
    assert.strictEqual(countStatsClients(testChannel), 0);
  });

  test("broadcastStats envía el evento a todos los clientes del canal", () => {
    const client1 = { write: mock.fn() };
    const client2 = { write: mock.fn() };
    addStatsClient(testChannel, client1);
    addStatsClient(testChannel, client2);

    broadcastStats(testChannel, "stats_updated", { formId: "form123", timestamp: new Date().toISOString() });

    assert.strictEqual(client1.write.mock.callCount(), 1);
    assert.strictEqual(client2.write.mock.callCount(), 1);

    const call1 = client1.write.mock.calls[0].arguments[0];
    assert.ok(call1.includes("event: stats_updated"));
    assert.ok(call1.includes("form123"));

    removeStatsClient(testChannel, client1);
    removeStatsClient(testChannel, client2);
  });

  test("broadcastStats no falla si el canal está vacío", () => {
    // No debe lanzar excepción
    broadcastStats("empty:channel", "stats_updated", { formId: "form123" });
    assert.ok(true);
  });

  test("emitStatsUpdated emite a canales general, form y entity", () => {
    const generalClient = { write: mock.fn() };
    const formClient = { write: mock.fn() };
    const entityClient = { write: mock.fn() };

    addStatsClient("general", generalClient);
    addStatsClient("form:form456", formClient);
    addStatsClient("entity:entity789", entityClient);

    const timestamp = new Date().toISOString();
    emitStatsUpdated({ formId: "form456", entityId: "entity789", timestamp });

    // Verificar que general recibió el evento
    assert.strictEqual(generalClient.write.mock.callCount(), 1);
    const generalCall = generalClient.write.mock.calls[0].arguments[0];
    assert.ok(generalCall.includes("event: stats_updated"));
    assert.ok(generalCall.includes("form456"));

    // Verificar que form recibió el evento
    assert.strictEqual(formClient.write.mock.callCount(), 1);
    const formCall = formClient.write.mock.calls[0].arguments[0];
    assert.ok(formCall.includes("event: stats_updated"));
    assert.ok(formCall.includes("form456"));

    // Verificar que entity recibió el evento
    assert.strictEqual(entityClient.write.mock.callCount(), 1);
    const entityCall = entityClient.write.mock.calls[0].arguments[0];
    assert.ok(entityCall.includes("event: stats_updated"));
    assert.ok(entityCall.includes("form456"));
    assert.ok(entityCall.includes("entity789"));

    removeStatsClient("general", generalClient);
    removeStatsClient("form:form456", formClient);
    removeStatsClient("entity:entity789", entityClient);
  });

  test("emitStatsUpdated funciona sin entityId", () => {
    const generalClient = { write: mock.fn() };
    const formClient = { write: mock.fn() };

    addStatsClient("general", generalClient);
    addStatsClient("form:form999", formClient);

    const timestamp = new Date().toISOString();
    emitStatsUpdated({ formId: "form999", timestamp });

    assert.strictEqual(generalClient.write.mock.callCount(), 1);
    assert.strictEqual(formClient.write.mock.callCount(), 1);

    removeStatsClient("general", generalClient);
    removeStatsClient("form:form999", formClient);
  });

  test("los cambios de estadísticas públicas emiten un aviso sin datos del formulario", () => {
    const publicClient = { write: mock.fn() };
    addStatsClient("public", publicClient);

    const timestamp = new Date().toISOString();
    emitStatsUpdated({
      formId: "private-form-id",
      timestamp,
      isPublic: true,
    });

    assert.strictEqual(publicClient.write.mock.callCount(), 1);
    const event = publicClient.write.mock.calls[0].arguments[0];
    assert.ok(event.includes("event: stats_updated"));
    assert.ok(event.includes(`data: ${JSON.stringify({ timestamp })}`));
    assert.ok(!event.includes("private-form-id"));

    removeStatsClient("public", publicClient);
  });

  test("los cambios no públicos no notifican al canal público", () => {
    const publicClient = { write: mock.fn() };
    addStatsClient("public", publicClient);

    emitStatsUpdated({
      formId: "private-form-id",
      timestamp: new Date().toISOString(),
    });

    assert.strictEqual(publicClient.write.mock.callCount(), 0);
    removeStatsClient("public", publicClient);
  });

  test("solo formularios publicados y listados alimentan los eventos públicos", () => {
    assert.strictEqual(
      realtimeStats.isPublicStatsForm?.({ status: "published", visibility: "public", isArchived: false }),
      true,
    );
    assert.strictEqual(
      realtimeStats.isPublicStatsForm?.({ status: "published", visibility: "private", isArchived: false }),
      false,
    );
    assert.strictEqual(
      realtimeStats.isPublicStatsForm?.({ status: "published", visibility: "unlisted", isArchived: false }),
      false,
    );
    assert.strictEqual(
      realtimeStats.isPublicStatsForm?.({ status: "draft", visibility: "public", isArchived: false }),
      false,
    );
    assert.strictEqual(
      realtimeStats.isPublicStatsForm?.({ status: "published", visibility: "public", isArchived: true }),
      false,
    );
  });

  test("Múltiples clientes en el mismo canal reciben el broadcast", () => {
    const clients = Array.from({ length: 5 }, () => ({ write: mock.fn() }));
    for (const c of clients) addStatsClient(testChannel, c);

    broadcastStats(testChannel, "test_event", { data: "test" });

    for (const c of clients) {
      assert.strictEqual(c.write.mock.callCount(), 1);
    }

    for (const c of clients) removeStatsClient(testChannel, c);
  });

  test("Cliente desconectado se limpia automáticamente en broadcast", () => {
    const goodClient = { write: mock.fn() };
    const badClient = { write: () => { throw new Error("Connection lost"); } };

    addStatsClient(testChannel, goodClient);
    addStatsClient(testChannel, badClient);

    broadcastStats(testChannel, "test_event", { data: "test" });

    // El cliente bueno recibió el mensaje
    assert.strictEqual(goodClient.write.mock.callCount(), 1);
    // El cliente malo fue removido del set
    assert.strictEqual(countStatsClients(testChannel), 1);

    removeStatsClient(testChannel, goodClient);
  });
});