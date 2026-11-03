import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Shield, Bell, Palette, Database, ChevronRight,
} from "lucide-react";
import { cn } from "../../lib/utils.js";

const TABS = [
  { to: "/settings",              end: true, icon: User,    label: "Perfil",            description: "Nombre, avatar y datos personales" },
  { to: "/settings/security",     end: false, icon: Shield,  label: "Seguridad",         description: "Contraseña, 2FA y sesiones" },
  { to: "/settings/notifications",end: false, icon: Bell,    label: "Notificaciones",    description: "Email, push y resúmenes" },
  { to: "/settings/appearance",   end: false, icon: Palette, label: "Apariencia",        description: "Tema, modo oscuro y acento" },
  { to: "/settings/account",      end: false, icon: Database, label: "Cuenta y datos",   description: "Exportar y zona de peligro" },
];

const linkVariants = {
  initial: { x: -6, opacity: 0 },
  animate: { x: 0, opacity: 1 },
};

export default function SettingsLayout() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-app">
      {/* Page header */}
      <div className="border-b border-default bg-surface/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex h-14 items-center gap-2 text-sm text-muted">
            <span className="text-fg font-medium">Configuración</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">

          {/* ── Sidebar ── */}
          <aside className="w-full lg:w-60 shrink-0">
            <div className="lg:sticky lg:top-24 space-y-1">
              {TABS.map((tab, i) => (
                <motion.div
                  key={tab.to}
                  variants={linkVariants}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: i * 0.05, duration: 0.25 }}
                >
                  <NavLink
                    to={tab.to}
                    end={tab.end}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center gap-3 rounded-[20px] px-3 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer",
                        isActive
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-900/25 dark:text-brand-300"
                          : "text-muted hover:bg-surface-2 hover:text-fg dark:hover:bg-slate-800/60"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={cn(
                            "grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-all duration-150",
                            isActive
                              ? "border-brand-200 bg-brand-100 text-brand-600 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-400"
                              : "border-default bg-surface-2 text-muted group-hover:border-brand-200 group-hover:text-brand-500 dark:border-slate-700 dark:bg-slate-800"
                          )}
                        >
                          <tab.icon className="h-4 w-4" />
                        </span>
                        <span className="truncate">{tab.label}</span>
                        {isActive && (
                          <ChevronRight className="ml-auto h-3.5 w-3.5 text-brand-400 dark:text-brand-500 shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                </motion.div>
              ))}
            </div>
          </aside>

          {/* ── Content panel ── */}
          <main className="min-w-0 flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
