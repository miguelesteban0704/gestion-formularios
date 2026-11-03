import * as formRepo from "../repositories/form.repo.js";
import * as responseRepo from "../repositories/response.repo.js";
import { asActor } from "./form.service.js";

/** Scope de formularios para estadísticas: la entidad entera o lo propio. */
async function scopedForms(actorOrId, { archived = false } = {}) {
  const actor = asActor(actorOrId);
  if (actor.role === "entity_admin" && actor.entityId) {
    return formRepo.listFormsByEntity(actor.entityId, { includeArchived: archived });
  }
  /* El super_admin no es dueño de NINGÚN formulario, así que su alcance no
     es "lo propio" sino lo que supervisa: los publicados de categoría
     pública. Los privados quedan fuera con el mismo filtro que ya aplica
     `canSeeStats` a mano, de modo que el agregado nunca enseña cifras de un
     formulario que el backend le negaría al abrirlo. */
  if (actor.role === "super_admin") {
    const published = await formRepo.listPublishedForGuests({});
    return published.filter((f) => (f.visibility || "public") !== "private");
  }
  return formRepo.listAllFormsByOwner(actor._id);
}

export async function getInsights(actorOrId) {
  // Incluye formularios archivados para que las métricas históricas sean completas.
  const forms = await scopedForms(actorOrId, { archived: true });
  return computeInsights(forms);
}

/**
 * Agregado general para invitados: mismos números y misma forma que el
 * panel, pero solo sobre publicados de categoría pública. Lo privado no
 * entra ni en conteos.
 */
export async function getPublicInsights() {
  const published = await formRepo.listPublishedForGuests({});
  const forms = published.filter((f) => (f.visibility || "public") !== "private");
  return computeInsights(forms);
}

/**
 * Agregado con la forma exacta del panel (stats, timeline, heatmap,
 * devices, topForms). Se reutiliza para la entidad del `entity_admin`:
 * los mismos charts del super_admin con datos reales de SUS formularios.
 */
export async function computeInsights(forms) {
  const formIds = forms.map((f) => f._id);

  const totalViews = forms.reduce((s, f) => s + (f.views || 0), 0);
  // Cuenta desde la tabla responses (fuente única de verdad) para evitar
  // discrepancias con el contador desnormalizado response_count de forms.
  const [realCount, timeline, avgCompletionTime, heatmap, devices, hourly, perFormCountRows] = await Promise.all([
    responseRepo.countByForms(formIds),
    responseRepo.timelineByForms(formIds),
    responseRepo.avgCompletionByForms(formIds),
    responseRepo.heatmapByForms(formIds),
    responseRepo.devicesByForms(formIds),
    responseRepo.hourlyByForms(formIds, 14),
    responseRepo.countsByForms(formIds),
  ]);

  // Conteo real por formulario: sustituye al contador desnormalizado.
  const perFormCounts = new Map(
    perFormCountRows.map((r) => [r.form, r.count]),
  );

  const totalResponses = realCount;
  const published = forms.filter((f) => f.status === "published" && !f.isArchived).length;
  const conversion = totalViews
    ? Math.round((totalResponses / totalViews) * 100)
    : 0;

  // Serie diaria (con hora pico) por formulario: últimos 7 días, rellenada
  // con ceros para los días sin actividad. Fuente real de respuestas.
  const hourlyByForm = new Map();
  hourly.forEach((w) => {
    if (!hourlyByForm.has(w.form)) hourlyByForm.set(w.form, []);
    hourlyByForm.get(w.form).push({ date: w.date, hour: w.hour, count: w.count });
  });

  const isoDay = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const historyFor = (formId, responseCount) => {
    const raw = hourlyByForm.get(formId) || [];
    const byDay = new Map();
    raw.forEach(({ date, hour, count }) => {
      if (!byDay.has(date)) byDay.set(date, { count: 0, peakHour: null, peakHourCount: 0 });
      const row = byDay.get(date);
      row.count += count;
      if (count >= row.peakHourCount) {
        row.peakHourCount = count;
        row.peakHour = hour;
      }
    });
    const today = new Date();
    const history = [];
    for (let i = 6; i >= 0; i--) {
      const day = isoDay(new Date(today.getTime() - i * 86400000));
      const row = byDay.get(day);
      history.push({
        date: day,
        count: row ? row.count : 0,
        peakHour: row && row.count > 0 ? row.peakHour : null,
      });
    }
    return history.length ? history : [{ date: isoDay(today), count: responseCount, peakHour: null }];
  };

  const topForms = [...forms]
    .map((f) => ({
      ...f,
      realCount: perFormCounts.has(f._id)
        ? perFormCounts.get(f._id)
        : 0,
    }))
    .sort((a, b) => b.realCount - a.realCount)
    .slice(0, 6)
    .map((f) => ({
      id: f._id,
      /* El slug viaja SIEMPRE: en el escaparate de invitados la fila abre
         `/estadisticas/<slug>` (página pública, sin sesión); en el panel,
         `/panel-gestion/formularios/<id>/estadisticas`. */
      slug: f.slug || null,
      title: f.title,
      theme: f.theme,
      status: f.status,
      responses: f.realCount,
      views: f.views || 0,
      conversion: f.views
        ? Math.round((f.realCount / f.views) * 100)
        : 0,
      color: f.settings?.primaryColor || "#0c8b7c",
      history: historyFor(f._id, f.realCount),
    }));

  return {
    stats: {
      totalForms: forms.length,
      published,
      totalResponses,
      totalViews,
      conversion,
      avgCompletionTime,
    },
    timeline,
    heatmap,
    devices,
    topForms,
  };
}

export async function getInbox(actorOrId, { search = "" } = {}) {
  const actor = asActor(actorOrId);
  let forms;
  if (actor.role === "entity_admin" && actor.entityId) {
    forms = await formRepo.listFormsByEntity(actor.entityId, { includeArchived: true });
  } else if (actor.role === "super_admin") {
    /* El super_admin no es dueño de nada: su bandeja general abarca los
       publicados de categoría PÚBLICA de TODAS las entidades (nunca los
       privados de una entidad, que son del dueño del formulario). */
    const published = await formRepo.listPublishedForGuests({});
    forms = published.filter((f) => (f.visibility || "public") !== "private");
  } else {
    const [active, archived] = await Promise.all([
      formRepo.listFormsByOwner(actor._id, { filter: "all" }),
      formRepo.listFormsByOwner(actor._id, { filter: "archived" }),
    ]);
    forms = [...active, ...archived];
  }
  const formMap = new Map(forms.map((f) => [f._id, f]));

  let responses = await responseRepo.recentByForms(
    forms.map((f) => f._id),
    300,
  );

  if (search.trim()) {
    const needle = search.trim().toLowerCase();
    responses = responses.filter((r) => {
      const identity = [r.respondentName, r.respondentEmail, r.respondentUsername]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (identity.includes(needle)) return true;
      return r.answers.some((a) => {
        const val = Array.isArray(a.value)
          ? a.value.join(" ")
          : String(a.value ?? "");
        return val.toLowerCase().includes(needle);
      });
    });
  }

  return responses.map((r) => {
    const form = formMap.get(r.form);
    return {
      ...r,
      formId: r.form,
      formTitle: form?.title || "Untitled form",
      formColor: form?.settings?.primaryColor || "#0c8b7c",
    };
  });
}
