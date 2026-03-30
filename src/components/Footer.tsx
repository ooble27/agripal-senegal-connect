import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="w-full rounded-t-[2rem] md:rounded-t-[3rem] mt-16 md:mt-20 bg-inverse-surface">
      <div className="flex flex-col md:flex-row justify-between items-center px-6 md:px-12 py-8 md:py-10 w-full gap-6">
        <div className="flex flex-col items-center md:items-start gap-3">
          <Link to="/" className="text-lg font-bold text-surface font-headline">Agrumen</Link>
          <div className="font-headline font-medium text-xs text-inverse-on-surface text-center md:text-left">
            © 2025 Agrumen Sénégal. L'Agronome Digital.
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-6 md:gap-8">
          <a href="#" className="font-headline font-medium text-xs text-inverse-on-surface hover:text-surface transition-colors">Confidentialité</a>
          <a href="#" className="font-headline font-medium text-xs text-inverse-on-surface hover:text-surface transition-colors">CGU</a>
          <a href="#" className="font-headline font-medium text-xs text-inverse-on-surface hover:text-surface transition-colors">Livraison</a>
          <a href="#" className="font-headline font-medium text-xs text-inverse-on-surface hover:text-surface transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
