
-- Create product_images table for multiple images per product
CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view product images
CREATE POLICY "Anyone can view product images"
  ON public.product_images FOR SELECT
  USING (true);

-- Sellers can manage their product images
CREATE POLICY "Sellers can insert product images"
  ON public.product_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.shops s ON p.shop_id = s.id
      WHERE p.id = product_id AND s.seller_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can delete product images"
  ON public.product_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.shops s ON p.shop_id = s.id
      WHERE p.id = product_id AND s.seller_id = auth.uid()
    )
  );
