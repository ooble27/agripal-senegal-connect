import { Link } from "react-router-dom";

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
}

const ProductCard = ({ product, onAddToCart, formatPrice }: ProductCardProps) => (
  <Link to={`/produit/${product.id}`} className="block group">
    {/* Image container - square */}
    <div className="relative aspect-square rounded-xl overflow-hidden bg-surface-container mb-2">
      {product.image_url ? (
        <img
          alt={product.name}
          className="w-full h-full object-cover"
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

      {/* Add button - bottom right */}
      <button
        onClick={(e) => onAddToCart(product, e)}
        disabled={product.stock <= 0}
        className="absolute bottom-2 right-2 w-8 h-8 rounded-lg bg-surface-container-lowest/95 backdrop-blur-sm border border-border/20 flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30"
      >
        <span className="material-symbols-outlined text-foreground text-base">add</span>
      </button>
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
);

export default ProductCard;
