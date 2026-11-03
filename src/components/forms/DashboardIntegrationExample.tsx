import { useState } from "react";
import { PremiumFormCard } from "./PremiumFormCard.tsx";
import { FormLifecycleSettings } from "./FormLifecycleSettings.tsx";
import { ResponsesTable } from "./responses/ResponsesTable.tsx";
import { TrashBin } from "./responses/TrashBin.tsx";

/**
 * Ejemplo de integración de los componentes premium en el dashboard del
 * Gestor de Formularios. Este archivo NO toca los elementos protegidos
 * (Header, Sidebar, 5 tarjetas de acción, KPIs, grid de "Tus formularios").
 * Se usa como capa adicional o en vistas complementarias.
 */
export function DashboardIntegrationExample() {
  const [activeTab, setActiveTab] = useState<"forms" | "settings" | "responses" | "trash">("forms");

  const mockForms = [
    {
      id: "frm_001",
      title: "Opinión sobre restaurante",
      description: "Encuesta de satisfacción para clientes del restaurante.",
      status: "published" as const,
      visibility: "public" as const,
      createdAt: "2026-10-25T10:30:00",
      responseCount: 42,
    },
    {
      id: "frm_002",
      title: "Solicitud de servicio",
      description: "Formulario interno para solicitudes de TI.",
      status: "draft" as const,
      visibility: "private" as const,
      createdAt: "2026-10-24T14:15:00",
      responseCount: 0,
    },
    {
      id: "frm_003",
      title: "Evento anual 2026",
      description: "Registro de asistentes al evento corporativo.",
      status: "paused" as const,
      visibility: "public" as const,
      createdAt: "2026-10-20T09:00:00",
      responseCount: 128,
    },
  ];

  const mockResponses = [
    {
      id: "resp_001",
      respondentName: "María García",
      respondentEmail: "maria@ejemplo.com",
      submittedAt: new Date().toISOString(),
      status: "completed" as const,
      answersCount: 8,
    },
    {
      id: "resp_002",
      respondentName: "Carlos Ruiz",
      respondentEmail: "carlos@ejemplo.com",
      submittedAt: new Date(Date.now() - 86400000).toISOString(),
      status: "partial" as const,
      answersCount: 3,
    },
  ];

  const mockTrashed = [
    {
      id: "frm_del_001",
      title: "Encuesta antigua",
      deletedAt: new Date(Date.now() - 172800000).toISOString(),
      entityName: "Entidad A",
    },
  ];

  const handleEdit = (id: string) => alert(`Editar: ${id}`);
  const handleDuplicate = (id: string) => alert(`Duplicar: ${id}`);
  const handleDelete = (id: string) => alert(`Eliminar: ${id}`);
  const handleTogglePause = (id: string) => alert(`Pausar/Reanudar: ${id}`);
  const handlePreview = (id: string) => alert(`Vista previa: ${id}`);
  const handleAnalytics = (id: string) => alert(`Analítica: ${id}`);
  const handleDeleteResponse = (id: string) => alert(`Eliminar respuesta: ${id}`);
  const handleExport = () => alert("Exportando...");
  const handleRestore = (id: string) => alert(`Restaurar: ${id}`);
  const handlePermanentDelete = (id: string) => alert(`Borrar permanente: ${id}`);
  const handleSaveLifecycle = (values: any) => {
    console.log("Guardar ciclo de vida:", values);
    alert("Configuración de ciclo de vida guardada");
  };

  return (
    <div className="space-y-8">
      {/* Sección de tarjetas premium (complementaria, no reemplaza las 5 protegidas) */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Tus formularios (vista premium)</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mockForms.map((f) => (
            <PremiumFormCard
              key={f.id}
              form={f}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onTogglePause={handleTogglePause}
              onPreview={handlePreview}
              onAnalytics={handleAnalytics}
              publicUrl={`https://localhost:5173/f/${f.id}`}
            />
          ))}
        </div>
      </section>

      {/* Pestañas de configuración y gestión */}
      <div className="flex gap-2 border-b border-gray-200 pb-4">
        {[
          { id: "forms", label: "Formularios" },
          { id: "settings", label: "Ajustes y Límites" },
          { id: "responses", label: "Respuestas" },
          { id: "trash", label: "Papelera" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === t.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "forms" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Usa el menú de tres puntos (···) en cada tarjeta para Editar,
            Duplicar, Compartir, Pausar/Reanudar o Eliminar.
          </p>
        </div>
      )}

      {activeTab === "settings" && (
        <FormLifecycleSettings
          initialValues={{
            responseLimit: 100,
            expiresAt: "2026-12-31T23:59",
            confirmationMessage: "¡Gracias por tu tiempo! Tus respuestas nos ayudan a mejorar.",
          }}
          onSave={handleSaveLifecycle}
        />
      )}

      {activeTab === "responses" && (
        <ResponsesTable
          responses={mockResponses}
          onDeleteResponse={handleDeleteResponse}
          onExport={handleExport}
        />
      )}

      {activeTab === "trash" && (
        <TrashBin
          trashedForms={mockTrashed}
          onRestore={handleRestore}
          onPermanentDelete={handlePermanentDelete}
        />
      )}
    </div>
  );
}
