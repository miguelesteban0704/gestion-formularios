import { useNavigate } from "react-router-dom";
import { FolderOpen, Plus } from "lucide-react";
import { PageHeader } from "./Insights.jsx";
import { Button } from "../components/ui/Button.jsx";
import { FormsBrowser } from "../components/forms/FormsBrowser.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { builderPath } from "../lib/routes.js";

export default function MyForms() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  return (
    <div className="animate-page-enter mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <PageHeader
        icon={FolderOpen}
        title={t("myForms")}
        subtitle={t("allFormsDescription")}
        right={
          <Button onClick={() => navigate(builderPath(language, "new", {}, user?.entity?.code))}>
            <Plus className="h-4 w-4" /> {t("newForm")}
          </Button>
        }
      />
      <div className="mt-6">
        <FormsBrowser title="" />
      </div>
    </div>
  );
}
