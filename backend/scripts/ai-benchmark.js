#!/usr/bin/env node
/**
 * AI Form Generation Performance Benchmark
 *
 * This script measures the performance of the AI form generation pipeline
 * before and after optimizations.
 *
 * Usage: node backend/scripts/ai-benchmark.js
 */

import { generateForm } from "../ai.service.js";

const TEST_PROMPTS = [
  // Short prompt (should use fast path)
  "Crea un formulario con 3 preguntas: nombre, email y edad",

  // Medium prompt
  "Genera una encuesta de satisfacción para un restaurante con preguntas sobre comida, servicio, ambiente y precio. Incluye preguntas de escala y abiertas.",

  // Long prompt (should use full pipeline)
  `Crea una encuesta completa de evaluación de empleados para una empresa de tecnología.
  La encuesta debe cubrir:
  1. Información demográfica (departamento, años en la empresa, rol)
  2. Satisfacción laboral (escala 1-5 en: compensación, balance trabajo-vida, crecimiento, cultura)
  3. Evaluación del manager (comunicación, apoyo, reconocimiento, feedback)
  4. Compromiso y motivación (escala Likert)
  5. Preguntas abiertas sobre mejoras y sugerencias
  6. Preguntas de consentimiento y anonimato
  Debe tener entre 15-20 preguntas en total.`,

  // Very long prompt (stress test)
  `Genera un cuestionario exhaustivo de investigación de mercado para el lanzamiento de un nuevo producto SaaS B2B.
  Temas a cubrir:
  - Perfil de la empresa objetivo (tamaño, industria, región, facturación)
  - Perfil del decisor (rol, antigüedad, autoridad de compra)
  - Necesidades actuales y puntos de dolor (ranking de problemas)
  - Evaluación de soluciones actuales (satisfacción, costo, limitaciones)
  - Criterios de compra (precio, características, integración, soporte, seguridad)
  - Presupuesto y timeline de decisión
  - Preguntas de calificación (NPS, probabilidad de compra, urgencia)
  - Información de contacto para seguimiento
  El cuestionario debe tener 25-30 preguntas, usar variedad de tipos (radio, checkbox, dropdown, escalas, texto),
  incluir lógica condicional para preguntas de seguimiento, y tener introducción y cierre apropiados.`,
];

async function runBenchmark() {
  console.log("🚀 AI Form Generation Performance Benchmark");
  console.log("=".repeat(60));

  const results = [];

  for (let i = 0; i < TEST_PROMPTS.length; i++) {
    const prompt = TEST_PROMPTS[i];
    console.log(`\n📝 Test ${i + 1}/${TEST_PROMPTS.length}`);
    console.log(`Prompt length: ${prompt.length} chars`);
    console.log(`Prompt preview: ${prompt.substring(0, 80)}...`);

    // Warmup run (first run might be slower due to cold starts)
    if (i === 0) {
      console.log("  🔥 Warmup run...");
      try {
        await generateForm(prompt, "es");
      } catch (err) {
        console.log(`  ⚠️  Warmup failed: ${err.message}`);
      }
    }

    // Actual benchmark runs (3 runs per prompt)
    const runs = 3;
    const times = [];
    const questionCounts = [];

    for (let run = 1; run <= runs; run++) {
      console.log(`  ▶️  Run ${run}/${runs}...`);

      const startTime = Date.now();
      try {
        const form = await generateForm(prompt, "es");
        const elapsed = Date.now() - startTime;

        const questionCount = form.questions?.filter(q => q && !["section", "heading", "paragraph", "message", "image"].includes(q.type)).length || 0;

        times.push(elapsed);
        questionCounts.push(questionCount);

        console.log(`     ✅ ${elapsed}ms - ${questionCount} questions`);
      } catch (err) {
        console.log(`     ❌ Failed: ${err.message}`);
        times.push(null);
        questionCounts.push(0);
      }

      // Small delay between runs
      await new Promise(r => setTimeout(r, 500));
    }

    const validTimes = times.filter(t => t !== null);
    if (validTimes.length > 0) {
      const avgTime = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
      const minTime = Math.min(...validTimes);
      const maxTime = Math.max(...validTimes);
      const avgQuestions = questionCounts.reduce((a, b) => a + b, 0) / questionCounts.length;

      results.push({
        promptIndex: i + 1,
        promptLength: prompt.length,
        runs: runs,
        avgTime: Math.round(avgTime),
        minTime: Math.round(minTime),
        maxTime: Math.round(maxTime),
        avgQuestions: Math.round(avgQuestions),
        successRate: (validTimes.length / runs * 100).toFixed(1),
      });

      console.log(`  📊 Average: ${Math.round(avgTime)}ms (min: ${Math.round(minTime)}ms, max: ${Math.round(maxTime)}ms)`);
      console.log(`  📊 Avg questions: ${Math.round(avgQuestions)}`);
      console.log(`  📊 Success rate: ${(validTimes.length / runs * 100).toFixed(1)}%`);
    } else {
      console.log(`  📊 All runs failed`);
      results.push({
        promptIndex: i + 1,
        promptLength: prompt.length,
        runs: runs,
        avgTime: null,
        minTime: null,
        maxTime: null,
        avgQuestions: 0,
        successRate: "0.0",
      });
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 BENCHMARK SUMMARY");
  console.log("=".repeat(60));

  console.log("\n| Test | Prompt Length | Avg Time | Min Time | Max Time | Avg Questions | Success Rate |");
  console.log("|------|---------------|----------|----------|----------|---------------|--------------|");

  for (const r of results) {
    console.log(`| ${r.promptIndex} | ${r.promptLength} chars | ${r.avgTime ? r.avgTime + "ms" : "FAILED"} | ${r.minTime ? r.minTime + "ms" : "-"} | ${r.maxTime ? r.maxTime + "ms" : "-"} | ${r.avgQuestions} | ${r.successRate}% |`);
  }

  // Overall stats
  const allValidTimes = results.flatMap(r => {
    const times = [];
    // We don't have individual times stored, so we approximate from avg
    return r.avgTime ? [r.avgTime] : [];
  });

  const totalAvgTime = results.filter(r => r.avgTime).reduce((sum, r) => sum + r.avgTime, 0) / results.filter(r => r.avgTime).length;
  const totalAvgQuestions = results.filter(r => r.avgQuestions > 0).reduce((sum, r) => sum + r.avgQuestions, 0) / results.filter(r => r.avgQuestions > 0).length;

  console.log(`\n📈 Overall Average Generation Time: ${Math.round(totalAvgTime)}ms`);
  console.log(`📈 Overall Average Questions Generated: ${Math.round(totalAvgQuestions)}`);
  console.log(`📈 Total Tests: ${results.length}`);
  console.log(`📈 Successful Tests: ${results.filter(r => r.avgTime).length}`);

  // Performance targets
  console.log("\n🎯 PERFORMANCE TARGETS:");
  console.log("  - Short forms (< 5 questions): < 5 seconds");
  console.log("  - Medium forms (5-15 questions): < 15 seconds");
  console.log("  - Long forms (15-30 questions): < 30 seconds");
  console.log("  - Cache hits: < 100ms");

  // Cache stats
  console.log("\n💾 CACHE STATISTICS:");
  try {
    // This would require importing the cache module
    console.log("  (Cache stats would be shown here if imported)");
  } catch (e) {
    console.log("  (Cache module not accessible from benchmark)");
  }

  return results;
}

// Run benchmark
runBenchmark()
  .then(results => {
    console.log("\n✅ Benchmark completed");
    process.exit(0);
  })
  .catch(err => {
    console.error("\n❌ Benchmark failed:", err);
    process.exit(1);
  });