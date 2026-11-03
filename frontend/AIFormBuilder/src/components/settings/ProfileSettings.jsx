import { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Trash2, Upload, User, Globe, Clock, Calendar } from "lucide-react";
import { SettingsSection, SettingsSkeleton } from "./SettingsSection.jsx";
import { Input, Textarea, Select, Label, FieldError } from "../ui/Input.jsx";
import { Button } from "../ui/Button.jsx";
import { Avatar } from "../ui/Avatar.jsx";
import {
  useSettings,
  useUpdateProfile,
  useUploadAvatar,
  useDeleteAvatar,
} from "../../hooks/useSettings.js";
import { cn } from "../../lib/utils.js";

// ─── Zod schema ───────────────────────────────────────────────────────────────
const schema = z.object({
  name:       z.string().min(2, "Mínimo 2 caracteres").max(64),
  lastName:   z.string().max(64).optional().or(z.literal("")),
  username:   z.string()
               .regex(/^[a-z0-9_.-]{3,32}$/, "Solo letras minúsculas, números, puntos y guiones (3-32 chars)")
               .optional()
               .or(z.literal("")),
  bio:        z.string().max(280, "Máximo 280 caracteres").optional().or(z.literal("")),
  timezone:   z.string().min(1),
  language:   z.string().min(1),
  dateFormat: z.string().min(1),
});

// ─── Constants ────────────────────────────────────────────────────────────────
const TIMEZONES = [
  "UTC", "America/Havana", "America/New_York", "America/Chicago",
  "America/Denver", "America/Los_Angeles", "America/Mexico_City",
  "America/Bogota", "America/Lima", "America/Santiago",
  "America/Buenos_Aires", "America/Sao_Paulo",
  "Europe/Madrid", "Europe/London", "Europe/Paris",
  "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney",
];

const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
];

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (ISO)" },
];

// ─── Avatar upload zone ────────────────────────────────────────────────────────
function AvatarUploader({ name, avatarUrl }) {
  const fileRef       = useRef(null);
  const [drag, setDrag] = useState(false);
  const [preview, setPreview] = useState(null);
  const upload  = useUploadAvatar();
  const remove  = useDeleteAvatar();

  const handleFile = useCallback((file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    upload.mutate(file, { onError: () => setPreview(null) });
  }, [upload]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const currentAvatar = preview ?? avatarUrl;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
      {/* Avatar preview */}
      <div className="relative shrink-0">
        <Avatar
          name={name}
          avatarUrl={currentAvatar}
          size="lg"
          className="h-20 w-20 text-2xl ring-4 ring-white dark:ring-slate-900 shadow-md"
        />
        {(upload.isPending) && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}
      </div>

      {/* Drop / click zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={cn(
          "relative flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-5 transition-all duration-200 text-center",
          drag
            ? "border-brand-400 bg-brand-50 dark:bg-brand-900/20"
            : "border-slate-200 bg-slate-50/60 hover:border-brand-300 hover:bg-brand-50/50 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-brand-600"
        )}
      >
        <Upload className="h-5 w-5 text-muted" />
        <p className="text-sm font-medium text-fg">
          Arrastra una imagen o <span className="text-brand-600 dark:text-brand-400">selecciona</span>
        </p>
        <p className="text-xs text-muted">JPG, PNG, WEBP o GIF · máx. 4 MB</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      {/* Remove button */}
      {currentAvatar && (
        <Button
          variant="ghost"
          size="icon-sm"
          type="button"
          loading={remove.isPending}
          onClick={() => { setPreview(null); remove.mutate(); }}
          aria-label="Eliminar avatar"
          className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProfileSettings() {
  const { data, isLoading } = useSettings();
  const update = useUpdateProfile();

  const { register, handleSubmit, watch, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(schema),
    values: data
      ? {
          name:       data.name       ?? "",
          lastName:   data.lastName   ?? "",
          username:   data.username   ?? "",
          bio:        data.bio        ?? "",
          timezone:   data.timezone   ?? "UTC",
          language:   data.language   ?? "es",
          dateFormat: data.dateFormat ?? "DD/MM/YYYY",
        }
      : undefined,
  });

  const bioValue = watch("bio") ?? "";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SettingsSkeleton rows={4} />
        <SettingsSkeleton rows={3} />
      </div>
    );
  }

  const onSubmit = (values) => update.mutate(values);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>

      {/* ── Avatar ── */}
      <SettingsSection title="Foto de perfil" description="Se mostrará en tu perfil y en los formularios que publiques.">
        <AvatarUploader
          name={data?.name}
          avatarUrl={data?.avatarUrl}
        />
      </SettingsSection>

      {/* ── Información básica ── */}
      <SettingsSection title="Información personal" description="Tu nombre e identificación pública en la plataforma.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label required>Nombre</Label>
            <Input {...register("name")} placeholder="Tu nombre" invalid={!!errors.name} />
            <FieldError>{errors.name?.message}</FieldError>
          </div>
          <div>
            <Label>Apellido</Label>
            <Input {...register("lastName")} placeholder="Apellido(s)" />
            <FieldError>{errors.lastName?.message}</FieldError>
          </div>
        </div>

        <div className="mt-4">
          <Label>
            Nombre de usuario{" "}
            <span className="ml-1 text-xs font-normal text-muted">(@username)</span>
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted text-sm">@</span>
            <Input
              {...register("username")}
              placeholder="mi_usuario"
              invalid={!!errors.username}
              className="pl-7"
              autoCapitalize="none"
            />
          </div>
          <FieldError>{errors.username?.message}</FieldError>
        </div>

        <div className="mt-4">
          <Label>Biografía</Label>
          <Textarea
            {...register("bio")}
            placeholder="Cuéntanos algo sobre ti…"
            maxLength={280}
            invalid={!!errors.bio}
            className="resize-none"
          />
          <div className="mt-1 flex items-center justify-between">
            <FieldError>{errors.bio?.message}</FieldError>
            <span className={cn("ml-auto text-xs text-muted", bioValue.length > 260 && "text-amber-500")}>
              {bioValue.length}/280
            </span>
          </div>
        </div>
      </SettingsSection>

      {/* ── Zona horaria, idioma y fecha ── */}
      <SettingsSection title="Preferencias regionales" description="Controla cómo se muestran fechas, horas e idioma en la interfaz.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>
              <Clock className="inline h-3.5 w-3.5 mr-1.5 text-muted align-[-2px]" />
              Zona horaria
            </Label>
            <Select {...register("timezone")}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz.replace("_", " ")}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>
              <Globe className="inline h-3.5 w-3.5 mr-1.5 text-muted align-[-2px]" />
              Idioma
            </Label>
            <Select {...register("language")}>
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>
              <Calendar className="inline h-3.5 w-3.5 mr-1.5 text-muted align-[-2px]" />
              Formato de fecha
            </Label>
            <Select {...register("dateFormat")}>
              {DATE_FORMATS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </Select>
          </div>
        </div>
      </SettingsSection>

      {/* ── Save bar ── */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            className="sticky bottom-4 z-10 flex items-center justify-end gap-3 rounded-2xl border border-default bg-surface/90 px-5 py-3 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/90"
          >
            <span className="text-sm text-muted">Cambios sin guardar</span>
            <Button type="submit" loading={update.isPending} size="sm">
              Guardar cambios
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
