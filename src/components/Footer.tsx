import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="w-full rounded-t-[3rem] mt-20 bg-inverse-surface">
      <div className="flex flex-col md:flex-row justify-between items-center px-12 py-10 w-full">
        <div className="flex flex-col items-center md:items-start gap-4">
          <div className="text-lg font-bold text-surface font-headline">Agrumen</div>
          <div className="font-headline font-medium text-xs text-inverse-on-surface">
            © 2024 Agrumen Senegal. The Digital Agronomist.
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-8 mt-8 md:mt-0">
          <a href="#" className="font-headline font-medium text-xs text-inverse-on-surface hover:text-surface transition-colors">Privacy Policy</a>
          <a href="#" className="font-headline font-medium text-xs text-inverse-on-surface hover:text-surface transition-colors">Terms of Service</a>
          <a href="#" className="font-headline font-medium text-xs text-inverse-on-surface hover:text-surface transition-colors">Shipping Info</a>
          <a href="#" className="font-headline font-medium text-xs text-inverse-on-surface hover:text-surface transition-colors">Contact Us</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
