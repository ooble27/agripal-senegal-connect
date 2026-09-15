import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

const NotFound = () => {
  const t = useT();

  return (
    <div className="app-type min-h-screen bg-background">
      <Header />
      <div className="mx-auto flex max-w-[1120px] flex-col items-center justify-center gap-4 px-6 py-48 text-center">
        <p className="font-display text-7xl font-extrabold tracking-tight text-primary">404</p>
        <p className="text-lg text-muted-foreground">{t("404.text")}</p>
        <Button asChild variant="primary" shape="pill" className="mt-2">
          <Link to="/">{t("404.back")}</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
