import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="w-full mt-20 bg-surface-container-low">
      <div className="max-w-[1440px] mx-auto px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-4">
            <div className="text-lg font-black text-foreground font-headline">Agrumen<span className="text-primary">.</span></div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-on-surface-variant leading-relaxed">
              La plateforme qui rapproche la terre des Sénégalais. Qualité, fraîcheur et équité.
            </p>
          </div>
          <div>
            <h5 className="text-xs font-bold mb-4 uppercase tracking-widest">Liens Rapides</h5>
            <div className="flex flex-col gap-3 text-[10px] uppercase tracking-widest">
              <a href="#" className="text-on-surface-variant hover:text-foreground underline decoration-primary-container decoration-2 underline-offset-4">Conditions Générales</a>
              <a href="#" className="text-on-surface-variant hover:text-foreground underline decoration-primary-container decoration-2 underline-offset-4">Confidentialité</a>
            </div>
          </div>
          <div>
            <h5 className="text-xs font-bold mb-4 uppercase tracking-widest">Support</h5>
            <div className="flex flex-col gap-3 text-[10px] uppercase tracking-widest text-on-surface-variant">
              <a href="#" className="hover:text-foreground">Contact Support</a>
              <a href="#" className="hover:text-foreground">Aide Vendeur</a>
            </div>
          </div>
          <div>
            <h5 className="text-xs font-bold mb-4 uppercase tracking-widest">Partenariat</h5>
            <div className="flex flex-col gap-3 text-[10px] uppercase tracking-widest text-on-surface-variant">
              <a href="#" className="hover:text-foreground">Devenir Partenaire</a>
              <a href="#" className="hover:text-foreground">Investisseurs</a>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
            © 2024 Agrumen Sénégal. The Digital Agronomist.
          </p>
          <div className="flex gap-3">
            <Link to="/" className="text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-foreground">Privacy Policy</Link>
            <Link to="/" className="text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-foreground">Terms of Service</Link>
            <Link to="/" className="text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-foreground">Shipping Info</Link>
            <Link to="/" className="text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-foreground">Contact Us</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
