import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import DevenirProducteur from "./pages/DevenirProducteur";
import SellerDashboard from "./pages/SellerDashboard";
import ProductDetail from "./pages/ProductDetail";
import Auth from "./pages/Auth";
import Checkout from "./pages/Checkout";
import MyOrders from "./pages/MyOrders";
import BuyerAccount from "./pages/BuyerAccount";
import Marche from "./pages/Marche";
import ShopPage from "./pages/ShopPage";
import NotFound from "./pages/NotFound";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider } from "./contexts/AuthContext";
import CartDrawer from "./components/CartDrawer";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Toaster />
            <Sonner />
            <CartDrawer />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/marche" element={<Marche />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/devenir-producteur" element={<DevenirProducteur />} />
              <Route path="/dashboard" element={<SellerDashboard />} />
              <Route path="/produit/:id" element={<ProductDetail />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/mes-commandes" element={<MyOrders />} />
              <Route path="/mon-compte" element={<BuyerAccount />} />
              <Route path="/boutique/:id" element={<ShopPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
