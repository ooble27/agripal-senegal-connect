import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface ProductCardProduct {
  id: string;
  name: string;
  price: number;
  unit: string;
  image_url: string | null;
  stock: number;
  categories?: { name: string; icon: string | null } | null;
}

interface ProductCardProps {
  product: ProductCardProduct;
  onAddToCart: (product: any, e: React.MouseEvent) => void;
  formatPrice: (n: number) => string;
  index?: number;
}

const ProductCard = ({ product, onAddToCart, formatPrice, index = 0 }: ProductCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
  >
    <Link to={`/produit/${product.id}`} className="block group">
      {/* Image container - square */}
      <div className="relative aspect-square rounded-xl overflow-hidden bg-surface-container mb-2">
        {product.image_url ? (
          <img
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            src={product.image_url}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-on-surface-variant/20">eco</span>
          </div>
        )}

        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
            <span className="bg-destructive text-destructive-foreground px-2 py-0.5 rounded-lg text-[10px] font-bold">
              Rupture
            </span>
          </div>
        )}

        {/* Add button */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => onAddToCart(product, e)}
          disabled={product.stock <= 0}
          className="absolute bottom-2 right-2 w-8 h-8 rounded-lg bg-surface-container-lowest/95 backdrop-blur-sm border border-border/20 flex items-center justify-center transition-shadow hover:shadow-md disabled:opacity-30"
        >
          <span className="material-symbols-outlined text-foreground text-base">add</span>
        </motion.button>
      </div>

      {/* Price */}
      <p className="text-sm md:text-base font-headline font-extrabold text-foreground">
        {formatPrice(product.price)} <span className="text-on-surface-variant font-normal text-[10px] md:text-xs">FCFA</span>
      </p>
      {/* Name */}
      <p className="text-xs md:text-sm font-headline font-bold leading-tight line-clamp-2 text-on-surface-variant mt-0.5">
        {product.name}
      </p>
      {/* Unit */}
      <p className="text-[10px] md:text-xs text-on-surface-variant/70 mt-0.5">{product.unit}</p>
    </Link>
  </motion.div>
);

export default ProductCard;
