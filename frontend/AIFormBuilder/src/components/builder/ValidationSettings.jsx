import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  CircleCheck,
  CircleAlert,
  SlidersHorizontal,
  Ruler,
  Mail,
  AtSign,
  Hash,
  Phone as PhoneIcon,
  ShieldCheck,
  Globe,
  MapPin,
  User,
  GraduationCap,
  List,
} from "lucide-react";
import { Input, Label } from "../ui/Input.jsx";
import { PremiumSelect } from "../ui/PremiumSelect.jsx";
import { cn } from "../../lib/utils.js";
import { validateField } from "../../lib/validate.js";
import { specialOptionsFor } from "../../lib/specialOptions.js";
import { PHONE_COUNTRIES, buildPhonePattern, digitsFor, digitsLabel, ANY_PHONE_PATTERN, countryLabel } from "../../lib/phoneRules.js";
import { PhoneFlag } from "../ui/PhoneFlag.jsx";
import { CountrySelect, CountryOption } from "../ui/CountrySelect.jsx";

/** Tipos de campo que se renderizan como select premium en la prueba en vivo. */
const SELECT_TYPES = ["province", "municipality", "gender", "education_level", "dropdown"];

const SELECT_ICONS = {
  province: MapPin,
  municipality: MapPin,
  gender: User,
  education_level: GraduationCap,
  dropdown: List,
};

/*
 * Editor premium de la validaciÃ³n de un campo.
 *
 * Antes eran filas sueltas de inputs (min/max, regex, mensaje) siempre visibles,
 * sin agrupar ni explicar: el usuario veÃ­a doce cajas sin saber cuÃ¡les le
 * afectaban. AquÃ­ cada regla se gobierna con un interruptor, se agrupa por
 * categorÃ­a (Obligatorio Â· Formato Â· Longitud y lÃ­mites) y se prueba en vivo,
 * para que el ajuste sea de un vistazo y de un clic.
 *
 * El contrato de datos NO cambia: se sigue escribiendo el mismo objeto
 * `field.validation = { minLength, maxLength, min, max, pattern, message }` y
 * `field.required`, asÃ­ que el autosave, la persistencia y `validate.js`
 * siguen intactos. Apagar una regla la deja en `null` en vez de borrar la clave,
 * para que el autosave registre el cambio.
 */

const LENGTH_TYPES = ["short_text", "long_text", "password", "address", "phone"];

/*
 * MÃ¡ximo con el que nace la regla de longitud al activarla sin valores previos.
 * Sin esto, el interruptor no se encenderÃ­a: `lengthOn` se deriva de que exista
 * un `minLength`/`maxLength`, y sembrar `null` dejarÃ­a la regla apagada. Es solo
 * un punto de partida que el autor ajusta (o vacÃ­a) a su gusto.
 */
const LENGTH_DEFAULT_MAX = {
  short_text: 100,
  long_text: 500,
  address: 200,
  password: 64,
  phone: 20,
};

const emptyToNull = (value) => (value === "" ? null : value);
const parseNumber = (value) => (value === "" ? null : Number(value));

/** Â¿La regla estÃ¡ activa? Un valor distinto de `null`/`undefined` lo estÃ¡. */
const isOn = (value) => value !== null && value !== undefined && value !== "";

export function ValidationSettings({ field, setValidation, setRequired, onSuggest, aiBusy, t, language }) {
  const es = language === "es";
  const v = field.validation || {};

  const supportsLength = LENGTH_TYPES.includes(field.type);
  const supportsNumber = field.type === "number";
  const supportsFormat = ["short_text", "long_text", "email", "url", "address"].includes(field.type) || supportsNumber;
  const showsRegex = supportsFormat || ["text", "textarea"].includes(field.type);
  const isPhone = field.type === "phone";

  const lengthOn = isOn(v.minLength) || isOn(v.maxLength);
  const rangeOn = isOn(v.min) || isOn(v.max);
  const patternOn = isOn(v.pattern);

  const patternValid = useMemo(() => {
    if (!patternOn) return true;
    try {
      new RegExp(v.pattern);
      return true;
    } catch {
      return false;
    }
  }, [patternOn, v.pattern]);

  return (
    <div className="space-y-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-fg">
          <ShieldCheck className="h-4 w-4 text-brand-500" aria-hidden="true" />
          {t("validation")}
        </span>
        {/* AI feature hidden - retained in code: the "AI suggest" button used to
            live here (onSuggest → suggestValidation). The handler is still passed
            down from FieldSettings, but nothing in the UI can call it anymore. */}
      </div>

      {/* Obligatorio */}
      <Group
        icon={Check}
        title={t("validationGroupRequired")}
        hint={t("validationRequiredHint")}
      >
        <ToggleRow
          label={t("required")}
          description={t("requiredOnHint")}
          checked={!!field.required}
          onChange={(on) => setRequired(on)}
          accent
        />
      </Group>

      {/* TelÃ©fono (solo campos de tipo `phone`) */}
      {isPhone && (
        <Group
          icon={PhoneIcon}
          title={t("validationGroupPhone")}
          hint={t("validationPhoneHint")}
        >
          <PhoneRule
            field={field}
            setValidation={setValidation}
            t={t}
            language={language}
          />
        </Group>
      )}

      {/* Formato */}
      {showsRegex && (
        <Group
          icon={AtSign}
          title={t("validationGroupFormat")}
          hint={t("validationFormatHint")}
        >
          <PresetChips
            fieldType={field.type}
            value={v.pattern}
            onChange={(pattern) => setValidation({ pattern })}
            t={t}
          />
          <ToggleRow
            label={t("enablePattern")}
            checked={patternOn}
            onChange={(on) => setValidation({ pattern: on ? "" : null })}
          />
          <Collapse open={patternOn}>
            <div className="space-y-2 pt-1">
              <Input
                value={v.pattern || ""}
                placeholder="^[A-Za-z ]+$"
                invalid={!patternValid}
                aria-invalid={!patternValid}
                aria-describedby="vs-pattern-hint"
                className="h-9 font-mono text-xs"
                onChange={(e) => setValidation({ pattern: e.target.value })}
              />
              {patternValid ? (
                <p id="vs-pattern-hint" className="text-xs text-muted">
                  {t("patternHint")}
                </p>
              ) : (
                <p
                  id="vs-pattern-hint"
                  role="alert"
                  className="flex items-center gap-1.5 text-xs font-medium text-danger"
                >
                  <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {t("patternInvalid")}
                </p>
              )}
            </div>
          </Collapse>
        </Group>
      )}

      {/* Longitud / lÃ­mites */}
      {(supportsLength || supportsNumber) && (
        <Group
          icon={supportsNumber ? Hash : Ruler}
          title={t("validationGroupLimits")}
          hint={t("validationLimitsHint")}
        >
          {supportsLength && (
            <>
              {/* Interruptor premium (role="switch") que gobierna la regla de
                  longitud. Al encenderlo sin valores, siembra un mÃ¡ximo por
                  defecto para que la regla quede activa y se pueda ajustar. */}
              <ToggleRow
                label={t("enableLength")}
                checked={lengthOn}
                onChange={(on) => {
                  if (!on) return setValidation({ minLength: null, maxLength: null });
                  if (lengthOn) return;
                  setValidation({
                    minLength: v.minLength ?? null,
                    maxLength: v.maxLength ?? (LENGTH_DEFAULT_MAX[field.type] ?? 100),
                  });
                }}
              />
              <Collapse open={lengthOn}>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <NumberField
                    label={t("minLength")}
                    value={v.minLength}
                    min={0}
                    onChange={(n) => setValidation({ minLength: n })}
                  />
                  <NumberField
                    label={t("maxLength")}
                    value={v.maxLength}
                    min={0}
                    onChange={(n) => setValidation({ maxLength: n })}
                  />
                </div>
              </Collapse>
            </>
          )}

          {supportsNumber && (
            <>
              <ToggleRow
                label={t("enableRange")}
                checked={rangeOn}
                onChange={(on) =>
                  setValidation(
                    on ? { min: v.min ?? null, max: v.max ?? null } : { min: null, max: null },
                  )
                }
              />
              <Collapse open={rangeOn}>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <NumberField
                    label={t("minValue")}
                    value={v.min}
                    onChange={(n) => setValidation({ min: n })}
                  />
                  <NumberField
                    label={t("maxValue")}
                    value={v.max}
                    onChange={(n) => setValidation({ max: n })}
                  />
                </div>
              </Collapse>
            </>
          )}
        </Group>
      )}

      {/* Mensaje propio + comprobaciÃ³n en vivo.
          En los campos de telÃ©fono la caja vive siempre: el interruptor Â«Solo
          números» decide si en ella solo se pueden escribir dígitos o cualquier
          cosa, y sin ella el autor no podrÃ­a probar la regla apagada. */}
      <Collapse open={field.required || lengthOn || rangeOn || patternOn || isPhone}>
        <div className="space-y-3 pt-0.5">
          <div>
            <Label className="text-xs">{t("errorMessage")}</Label>
            <Input
              value={v.message || ""}
              placeholder={t("defaultMessagePlaceholder")}
              className="h-9"
              onChange={(e) => setValidation({ message: emptyToNull(e.target.value) })}
            />
            <p className="mt-1 text-xs text-muted">{t("customMessageHint")}</p>
          </div>
          {/* `digitsOnly` refleja el interruptor Â«Solo nÃºmerosÂ» del telÃ©fono:
              encendido, la caja de prueba solo admite dígitos. */}
          <LivePreview field={field} t={t} es={es} language={language} digitsOnly={isPhone && patternOn} />
        </div>
      </Collapse>
    </div>
  );
}

/** Bloque de categorÃ­a con rÃ³tulo, ayuda y contenedor de cristal suave. */
function Group({ icon: Icon, title, hint, children }) {
  return (
    <section className="rounded-xl border border-line bg-surface-2/40 p-3 transition-colors focus-within:border-brand-500/30">
      <header className="mb-2 flex items-start gap-2">
        <span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
          {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</p>
          {hint && <p className="mt-0.5 text-xs leading-snug text-muted">{hint}</p>}
        </div>
      </header>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

/** Fila con interruptor accesible (role="switch"). */
function ToggleRow({ label, description, checked, onChange, accent = false }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-fg">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
          checked
            ? accent
              ? "bg-brand-600"
              : "bg-brand-500"
            : "bg-slate-300 dark:bg-slate-600",
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 520, damping: 32 }}
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-white shadow",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}

/** AnimaciÃ³n de despliegue de las reglas activas (respeta reduced-motion). */
function Collapse({ open, children }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="collapse"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Input numÃ©rico que distingue "vacÃ­o" (null) de 0. */
function NumberField({ label, value, onChange, min }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        inputMode="numeric"
        min={min}
        className="h-9"
        value={value ?? ""}
        onChange={(e) => onChange(parseNumber(e.target.value))}
      />
    </div>
  );
}

/**
 * Atajos de formato de un clic. Fijan `pattern` (o confÃ­an en el tipo, para
 * email/url el propio validador ya lo comprueba); marcar de nuevo lo quita.
 */
function PresetChips({ fieldType, value, onChange, t }) {
  const presets = [
    { id: "email", icon: Mail, label: t("formatEmail"), pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" },
    { id: "url", icon: AtSign, label: t("formatUrl"), pattern: "^https?:\\/\\/.+" },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {presets.map((p) => {
        const active = value === p.pattern;
        const Icon = p.icon;
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? null : p.pattern)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
              active
                ? "border-brand-500/40 bg-brand-500/12 text-brand-600 dark:text-brand-300"
                : "border-line bg-surface text-ink-muted hover:border-brand-500/30 hover:text-fg",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {p.label}
            {active && <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
        );
      })}
      {fieldType && (
        <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-muted">
          <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
          {fieldType}
        </span>
      )}
    </div>
  );
}

/**
 * Reglas de teléfono: "solo números" + cantidad de dígitos por código de país.
 *
 * No aÃ±ade claves nuevas al esquema: todo se resuelve a `field.validation.pattern`
 * (y, si el autor lo escribe, `message`). El paÃ­s se deduce del propio patrÃ³n
 * guardado, para que al reabrir el campo el selector recupere su estado.
 */
function PhoneRule({ field, setValidation, t, language }) {
  const v = field.validation || {};
  const patternOn = isOn(v.pattern);
  const phone = v.phone || {};

  /* PaÃ­s recuperado: primero de `v.phone.country`; si no, del patrÃ³n guardado. */
  const matchedCountry = useMemo(() => {
    if (phone.country) return PHONE_COUNTRIES.find((c) => c.code === phone.country) || null;
    if (!patternOn) return null;
    return (
      PHONE_COUNTRIES.find((c) => {
        const digits = digitsFor(c.code);
        return buildPhonePattern({ digits, dial: c.dial, allowCountryCode: true }) === v.pattern;
      }) || null
    );
  }, [patternOn, v.pattern, phone.country]);

  const isAny = phone.mode === "any" || (!phone.mode && !matchedCountry && patternOn);
  /* PaÃ­s mostrado: manda el guardado (`matchedCountry`) y, mientras no haya uno
     (modo Â«Cualquier paÃ­sÂ»), se recuerda la Ãºltima elecciÃ³n local. Derivarlo asÃ­
     â€”en vez de un `useState` inicialâ€” evita quedarse con el paÃ­s viejo al
     reabrir o cambiar de campo. */
  const [picked, setPicked] = useState(null);
  const country = matchedCountry?.code || picked || PHONE_COUNTRIES[0].code;

  const selected = PHONE_COUNTRIES.find((c) => c.code === country) || PHONE_COUNTRIES[0];
  const digs = digitsFor(selected.code);

  /* Fija un paÃ­s concreto: guarda patrÃ³n + intenciÃ³n (`validation.phone`). */
  const applyFixed = (next) => {
    setValidation({
      pattern: buildPhonePattern({ digits: digitsFor(next.code), dial: next.dial, allowCountryCode: true }),
      phone: { mode: "fixed", country: next.code },
    });
  };

  /* Â«Cualquier paÃ­sÂ»: patrÃ³n permisivo; el detalle por paÃ­s lo hace validatePhone. */
  const applyAny = () => {
    setValidation({ pattern: ANY_PHONE_PATTERN, phone: { mode: "any", country: null } });
  };

  const turnOn = (on) => {
    if (!on) return setValidation({ pattern: null, phone: null });
    // phoneOnly activo: mantiene control por el toggle; si estÃ¡ apagado el patrÃ³n se deja null (autosave)
    if (isAny) return applyAny();
    applyFixed(selected);
  };

  const fill = (key, values) =>
    Object.entries(values).reduce((text, [name, replacement]) => text.replace(`{${name}}`, replacement), t(key));
  const digitsWord = `${digitsLabel(digs)} ${language === "es" ? "dígitos" : "digits"}`;
  const sampleDigits = Array.isArray(digs) ? digs[0] : digs;
  const sample = "5".repeat(Math.max(1, Math.min(sampleDigits, 12)));

  return (
    <div className="space-y-2">
      <ToggleRow
        label={t("phoneOnly")}
        description={t("phoneOnlyHint")}
        checked={patternOn}
        onChange={turnOn}
      />

      {/* Selector de paÃ­s: siempre visible para campos de telÃ©fono, para que el
         autor vea las banderas y elija sin tener que activar primero el toggle. */}
      <div>
        <Label className="text-xs">{t("phoneCountry")}</Label>
        <CountrySelect
          ariaLabel={t("phoneCountry")}
          value={isAny ? "__any" : country}
          onChange={(next) => {
            if (next === "__any") return applyAny();
            const match = PHONE_COUNTRIES.find((c) => c.code === next);
            if (match) {
              setPicked(match.code);
              applyFixed(match);
            }
          }}
          options={[
            { value: "__any", any: true, label: t("phoneAnyCountry") },
            ...PHONE_COUNTRIES.map((c) => ({
              value: c.code,
              code: c.code,
              label: countryLabel(c.code, language),
              dial: c.dial,
            })),
          ]}
          renderTrigger={() => (
            <span className="flex items-center gap-2.5">
              <span className="flex h-4 w-6 shrink-0 items-center justify-center">
                {isAny ? (
                  <Globe className="h-4 w-4 text-muted" aria-hidden="true" />
                ) : (
                  <PhoneFlag code={country} className="h-3.5 w-5 rounded-[2px]" />
                )}
              </span>
              <span className="block truncate">
                {isAny
                  ? t("phoneAnyCountry")
                  : `${countryLabel(selected.code, language)} (+${selected.dial})`}
              </span>
            </span>
          )}
          renderOption={(opt) => (
            <CountryOption
              any={opt.any}
              code={opt.code}
              label={opt.label}
              dial={opt.dial}
            />
          )}
        />
      </div>

      <Collapse open={patternOn}>
        <div className="space-y-2 pt-1">
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <CircleCheck className="h-3.5 w-3.5 shrink-0 text-brand-500" aria-hidden="true" />
            {isAny
              ? fill("phoneCurrentRule", { rule: t("phoneAnyRule") })
              : fill("phoneCurrentRule", { rule: digitsWord })}
          </p>
          {!isAny && (
            <p className="text-xs text-muted">{fill("phonePreview", { dial: selected.dial, sample })}</p>
          )}
          {isAny && <p className="text-xs text-muted">{t("phoneAnyHint")}</p>}
        </div>
      </Collapse>
    </div>
  );
}

/**
 * Caja de prueba en vivo: escribe y ve si las reglas pasan.
 *
 * `digitsOnly` (telÃ©fono con el interruptor Â«Solo nÃºmerosÂ» encendido) hace que
 * la caja solo acepte dígitos: cualquier otro carácter ni siquiera llega a
 * escribirse. Con la regla apagada se puede escribir lo que sea. El valor
 * efectivo se DERIVA del texto escrito, asÃ­ que al encender la regla lo que ya
 * habÃ­a en la caja se depura al instante.
 */
function LivePreview({ field, t, es, language, digitsOnly = false }) {
  const [raw, setRaw] = useState("");
  const isSelect = SELECT_TYPES.includes(field.type);

  /* Opciones ya localizadas según el idioma activo.
     El municipio depende de la provincia: como la prueba en vivo es por campo
     y no hay provincia seleccionada, se muestra desactivado con un tooltip. */
  const selectOptions = useMemo(() => {
    if (field.type === "dropdown") {
      return (field.options || []).map((o) => ({
        value: o.value ?? "",
        label: o.label ?? "",
      }));
    }
    return specialOptionsFor(field.type, { language });
  }, [field.type, field.options, language]);

  // Para los selects el "texto escrito" es la opción elegida.
  const sample = isSelect ? raw : digitsOnly ? raw.replace(/\D/g, "") : raw;
  const touched = isSelect ? raw !== "" : sample.length > 0;
  const error = touched ? validateField(field, sample, t, language) : null;
  const ok = touched && !error;

  const SelectIcon = SELECT_ICONS[field.type];
  const waitingForProvince = field.type === "municipality";

  return (
    <div className="rounded-xl border border-line bg-surface/60 p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          {t("livePreview")}
        </span>
        <LiveBadge touched={touched} ok={ok} t={t} />
      </div>

      {isSelect ? (
        <PremiumSelect
          label=""
          icon={SelectIcon}
          options={selectOptions}
          value={raw}
          onChange={(val) => setRaw(val)}
          disabled={waitingForProvince}
          placeholder={
            waitingForProvince
              ? t("selectProvinceFirst")
              : t("placeholder")
          }
          error={false}
          required={field.required}
          searchable
          language={language}
          t={t}
          tooltip={waitingForProvince ? t("selectProvinceFirst") : undefined}
        />
      ) : (
        <Input
          value={sample}
          placeholder={t("livePreviewPlaceholder")}
          aria-invalid={!!error}
          inputMode={field.type === "phone" ? (digitsOnly ? "numeric" : "tel") : undefined}
          className={cn(
            "h-9 text-sm",
            ok && "border-success/50 focus:border-success focus:ring-success/12",
          )}
          onChange={(e) => setRaw(e.target.value)}
        />
      )}

      <div className="mt-1 min-h-[1rem]">
        <AnimatePresence mode="wait">
          {error ? (
            <motion.p
              key="err"
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.16 }}
              role="alert"
              className="flex items-center gap-1.5 text-xs font-medium text-danger"
            >
              <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {error}
            </motion.p>
          ) : ok ? (
            <motion.p
              key="ok"
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.16 }}
              className="flex items-center gap-1.5 text-xs font-medium text-success"
            >
              <CircleCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {t("livePreviewPass")}
            </motion.p>
          ) : (
            <motion.p
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-muted"
            >
              {es ? t("livePreviewEmpty") : t("livePreviewEmpty")}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function LiveBadge({ touched, ok, t }) {
  const label = touched ? (ok ? t("livePreviewPass") : t("livePreview")) : t("livePreviewIdle");
  return (
    <span className="flex items-center gap-1 text-[11px] font-medium text-muted">
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-1.5 w-1.5 rounded-full transition-colors",
          !touched ? "bg-slate-300 dark:bg-slate-600" : ok ? "bg-success" : "bg-danger",
        )}
      />
      {label}
    </span>
  );
}



