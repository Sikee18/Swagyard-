'use client';

import React, { useState } from 'react';
import { Search, X, Edit2, Trash2, Plus, Check } from 'lucide-react';

interface Variant {
  id: number;
  variantName: string;
  sizeLabel?: string | null;
  priceInPaise: number;
  stock: number;
  barcode?: string | null;
}

interface Product {
  id: number;
  name: string;
  nameTa?: string | null;
  sku?: string | null;
  priceInPaise: number;
  stockQuantity: number;
  category?: {
    id: number;
    nameEn: string;
  } | null;
  categoryId?: number | null;
  variants?: Variant[];
}

interface SearchCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  categories: { id: number; nameEn: string }[];
  onAddToCart: (product: Product, variant?: Variant) => void;
  lang?: 'en' | 'ta';
}

export function SearchCatalogModal({
  isOpen,
  onClose,
  products,
  categories,
  onAddToCart,
  lang = 'en',
}: SearchCatalogModalProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<Product | null>(null);
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  // Derive unique category names from categories prop + products
  const categoryNames = ['ALL'];
  const catSet = new Set<string>();
  categories.forEach((c) => {
    if (c.nameEn) catSet.add(c.nameEn.toUpperCase());
  });
  products.forEach((p) => {
    if (p.category?.nameEn) catSet.add(p.category.nameEn.toUpperCase());
  });
  // Ensure common retail standard categories are present
  ['PANT', 'SHIRT', 'GENERAL', 'SHOES', 'TAILORING', 'ACCESSORIES'].forEach((name) => catSet.add(name));
  categoryNames.push(...Array.from(catSet));

  // Filter products based on search query and category
  const filteredProducts = products.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      p.name?.toLowerCase().includes(q) ||
      p.nameTa?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.category?.nameEn?.toLowerCase().includes(q);

    const catName = p.category?.nameEn?.toUpperCase() || 'GENERAL';
    const matchCategory =
      selectedCategory === 'ALL' ||
      catName === selectedCategory ||
      (selectedCategory === 'ACCESSORIES' && catName.startsWith('ACCESSOR'));

    return matchSearch && matchCategory;
  });

  const handleCardClick = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      // Add first in-stock variant by default if user clicks whole card
      const inStockVar = product.variants.find((v) => v.stock > 0) || product.variants[0];
      onAddToCart(product, inStockVar);
      setAddedFeedback(`Added ${product.name} (${inStockVar.sizeLabel || inStockVar.variantName})`);
    } else {
      onAddToCart(product);
      setAddedFeedback(`Added ${product.name}`);
    }
    setTimeout(() => setAddedFeedback(null), 2000);
  };

  const handleVariantClick = (e: React.MouseEvent, product: Product, variant: Variant) => {
    e.stopPropagation();
    onAddToCart(product, variant);
    setAddedFeedback(`Added ${product.name} (${variant.sizeLabel || variant.variantName})`);
    setTimeout(() => setAddedFeedback(null), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-5xl bg-[#FCFAF7] rounded-3xl shadow-2xl border border-black/10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-white border-b border-black/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Search size={20} className="text-black" />
            <h2 className="text-lg font-black text-black tracking-tight">
              {lang === 'en' ? 'Search Catalog' : 'பட்டியலைத் தேடுக'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 text-black/60 hover:text-black flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar & Feedback Toast */}
        <div className="px-6 pt-5 pb-3 bg-white border-b border-black/5 space-y-3">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                lang === 'en'
                  ? 'Search by product name, Tamil name, or category...'
                  : 'தயாரிப்பு பெயர், தமிழ் பெயர் அல்லது பிரிவை தேடுங்கள்...'
              }
              className="w-full pl-11 pr-4 py-3 bg-[#FAF7F2] border border-black/10 rounded-2xl text-xs sm:text-sm font-medium outline-none focus:border-black focus:bg-white transition-all shadow-inner"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/40 hover:text-black text-xs font-bold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Filter Pills (Matches Image 2) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {categoryNames.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#C9B79C] text-black shadow-xs font-bold'
                      : 'bg-white text-black/70 hover:bg-black/5 border border-black/10'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {addedFeedback && (
            <div className="py-1.5 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <Check size={14} className="text-emerald-700" />
              <span>{addedFeedback}</span>
            </div>
          )}
        </div>

        {/* Products Grid (Matches Image 2) */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-black/40">
              <Search size={36} className="mb-2 opacity-30" />
              <p className="text-sm font-bold">No products found</p>
              <p className="text-xs text-black/50 mt-1">Try another search term or category filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product) => {
                const categoryLabel = product.category?.nameEn || 'GENERAL';
                const hasVariants = product.variants && product.variants.length > 0;
                const isOutOfStock = product.stockQuantity <= 0;

                return (
                  <div
                    key={product.id}
                    data-testid="catalog-product-card"
                    onClick={() => handleCardClick(product)}
                    className="bg-white rounded-2xl border border-black/10 p-4 hover:border-black/30 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group relative"
                  >
                    <div>
                      <h3 className="font-bold text-sm text-black line-clamp-1 group-hover:text-[#7A6A4F] transition-colors">
                        {product.name}
                      </h3>
                      {product.nameTa && (
                        <p className="text-[11px] text-black/45 line-clamp-1">{product.nameTa}</p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-black">
                          ₹{(product.priceInPaise / 100).toFixed(0)}
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-wider text-black/50 bg-black/5 px-2 py-0.5 rounded-md mt-1 truncate max-w-[90px]">
                          {categoryLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          title="Edit product"
                          onClick={() => {
                            setAddedFeedback(`Selected ${product.name}`);
                          }}
                          className="w-7 h-7 rounded-lg bg-black/5 hover:bg-black/10 text-black/60 flex items-center justify-center transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          title="Delete / Archive"
                          onClick={() => {
                            setAddedFeedback(`Item ${product.name} is in catalog`);
                          }}
                          className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Interactive Variant Chips */}
                    {hasVariants && (
                      <div className="mt-2.5 pt-2 border-t border-black/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                        <span className="text-[9px] font-bold text-black/40 mr-0.5">Sizes:</span>
                        {product.variants!.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            disabled={v.stock <= 0}
                            onClick={(e) => handleVariantClick(e, product, v)}
                            className="px-2 py-0.5 rounded-md bg-black/5 hover:bg-[#111111] hover:text-[#C9B79C] text-[10px] font-mono font-bold text-black/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title={`${v.sizeLabel || v.variantName} (Stock: ${v.stock})`}
                          >
                            {v.sizeLabel || v.variantName}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-black/10 flex items-center justify-between">
          <span className="text-xs text-black/50">
            Showing {filteredProducts.length} of {products.length} products
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#111111] hover:bg-[#262626] text-white text-xs font-black shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
