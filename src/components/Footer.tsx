import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="w-full bg-inverse-surface mt-20">
      <div className="max-w-[1440px] mx-auto px-8 md:px-12 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-4">
            <div className="text-lg font-extrabold text-surface font-headline">Agrumen</div>
            <p className="text-xs text-inverse-on-surface leading-relaxed uppercase tracking-widest">
              La plateforme qui rapproche la terre des dakarois. Qualité, fraîcheur et équité.
            </p>
          </div>
          <div>
            <h5 className="text-sm font-bold text-surface mb-4">Liens Rapides</h5>
            <div className="flex flex-col gap-3">
              <a href="#" className="text-xs text-inverse-on-surface hover:text-surface transition-colors uppercase tracking-wider">Conditions Générales</a>
              <a href="#" className="text-xs text-inverse-on-surface hover:text-surface transition-colors uppercase tracking-wider">Confidentialité</a>
            </div>
          </div>
          <div>
            <h5 className="text-sm font-bold text-surface mb-4">Support</h5>
            <div className="flex flex-col gap-3">
              <a href="#" className="text-xs text-inverse-on-surface hover:text-surface transition-colors uppercase tracking-wider">Contact Support</a>
              <a href="#" className="text-xs text-inverse-on-surface hover:text-surface transition-colors uppercase tracking-wider">Aide Producteur</a>
            </div>
          </div>
          <div>
            <h5 className="text-sm font-bold text-surface mb-4">Partenariat</h5>
            <div className="flex flex-col gap-3">
              <Link to="/devenir-producteur" className="text-xs text-inverse-on-surface hover:text-surface transition-colors uppercase tracking-wider">Devenir Partenaire</Link>
              <a href="#" className="text-xs text-inverse-on-surface hover:text-surface transition-colors uppercase tracking-wider">Investisseurs</a>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-inverse-on-surface text-center md:text-left">
            © 2024 Agrumen Sénégal. Propulsé par Hyper-Organic Precision.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
