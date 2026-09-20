import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Filet de sécurité contre les crashs React. Sans lui, un throw dans
 * n'importe quel composant fait disparaître toute l'app — l'utilisateur
 * voit un écran vide (paraît noir en thème sombre) et rien ne l'aide à
 * revenir à un état utilisable.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err?.message ?? "" };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", err, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-[420px] text-center">
          <h1 className="font-display text-[26px] font-semibold tracking-tight text-foreground">
            Une erreur est survenue
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
            La page n'a pas pu s'afficher correctement. Rechargez la plateforme pour continuer.
          </p>
          {this.state.message && (
            <p className="mt-4 rounded-xl border border-border bg-secondary px-4 py-3 text-left text-[12px] leading-relaxed text-muted-foreground">
              {this.state.message}
            </p>
          )}
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full rounded-xl bg-foreground px-5 py-3 text-[14px] font-medium text-background transition-opacity hover:opacity-90"
            >
              Recharger
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  Object.keys(localStorage).forEach((k) => {
                    if (k.startsWith("sb-") || k.startsWith("supabase")) localStorage.removeItem(k);
                  });
                } catch { /* incognito */ }
                window.location.href = "/connexion";
              }}
              className="w-full rounded-xl border border-border bg-card px-5 py-3 text-[14px] font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Se reconnecter
            </button>
          </div>
        </div>
      </div>
    );
  }
}
