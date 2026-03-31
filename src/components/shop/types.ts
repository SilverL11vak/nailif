export interface ShopProduct {
  id: string;
  name: string;
  nameEt?: string;
  nameEn?: string;
  description: string;
  descriptionEt?: string;
  descriptionEn?: string;
  price: number;
  imageUrl: string | null;
  images?: string[];
  category?: string;
  categoryEt?: string;
  categoryEn?: string;
  isPopular?: boolean;
  active?: boolean;
  stock?: number;
}
