'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Sparkles, Package, Calendar, ShoppingBag, Image as ImageIcon, MessageCircle } from 'lucide-react';

interface SearchResult {
  id: string;
  name: string;
  href: string;
  category?: string;
  price?: number;
}

interface SearchResults {
  services: SearchResult[];
  products: SearchResult[];
  bookings: { id: string; customerName: string; status: string; href: string }[];
  orders: { id: string; customerName: string; status: string; href: string }[];
  gallery: { id: string; caption: string; href: string }[];
  feedback: { id: string; clientName: string; feedbackText: string; href: string }[];
}

export function AdminSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({
    services: [],
    products: [],
    bookings: [],
    orders: [],
    gallery: [],
    feedback: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Search when query changes
  useEffect(() => {
    if (query.length < 2) {
      setResults({ services: [], products: [], bookings: [], orders: [], gallery: [], feedback: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleResultClick = useCallback((href: string) => {
    setIsOpen(false);
    setQuery('');
    router.push(href);
  }, [router]);

  const totalResults =
    results.services.length +
    results.products.length +
    results.bookings.length +
    results.orders.length +
    results.gallery.length +
    results.feedback.length;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="btn-secondary btn-secondary-sm flex items-center gap-2"
      >
        <Search size={14} />
        <span className="hidden sm:inline">Otsi...</span>
        <kbd className="hidden sm:inline-flex rounded border border-[#e5e7eb] bg-[#f3f4f6] px-1.5 py-0.5 text-[10px] font-medium text-[#6b7280]">
          Ctrl+K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[15vh]">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-[#e5e7eb] px-4 py-3">
          <Search size={18} className="text-[#9ca3af]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Otsi teenuseid, tooteid, broneeringuid..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#9ca3af]"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-[#9ca3af] hover:text-[#6b7280]">
              <X size={16} />
            </button>
          )}
          <kbd className="rounded border border-[#e5e7eb] bg-[#f3f4f6] px-1.5 py-0.5 text-[10px] font-medium text-[#6b7280]">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-[#6b7280]">
              <Sparkles size={16} className="mr-2 animate-pulse" />
              Otsin...
            </div>
          ) : query.length < 2 ? (
            <div className="py-8 text-center text-sm text-[#6b7280]">
              Sisesta vähemalt 2 tähte otsimiseks
            </div>
          ) : totalResults === 0 ? (
            <div className="py-8 text-center text-sm text-[#6b7280]">
              Tulemusi ei leitud
            </div>
          ) : (
            <div className="space-y-1">
              {/* Services */}
              {results.services.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                    <Sparkles size={12} />
                    Teenused
                  </div>
                  {results.services.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleResultClick(item.href)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-[#f3f4f6]"
                    >
                      <Sparkles size={16} className="text-[#8b5cf6]" />
                      <span className="flex-1 text-sm text-[#111827]">{item.name}</span>
                      <span className="text-xs text-[#6b7280]">{item.category}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Products */}
              {results.products.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                    <Package size={12} />
                    Tooted
                  </div>
                  {results.products.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleResultClick(item.href)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-[#f3f4f6]"
                    >
                      <Package size={16} className="text-[#10b981]" />
                      <span className="flex-1 text-sm text-[#111827]">{item.name}</span>
                      <span className="text-xs text-[#6b7280]">EUR {item.price}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Bookings */}
              {results.bookings.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                    <Calendar size={12} />
                    Broneeringud
                  </div>
                  {results.bookings.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleResultClick(item.href)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-[#f3f4f6]"
                    >
                      <Calendar size={16} className="text-[#f59e0b]" />
                      <span className="flex-1 text-sm text-[#111827]">{item.customerName}</span>
                      <span className="text-xs text-[#6b7280]">{item.status}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Orders */}
              {results.orders.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                    <ShoppingBag size={12} />
                    Tellimused
                  </div>
                  {results.orders.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleResultClick(item.href)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-[#f3f4f6]"
                    >
                      <ShoppingBag size={16} className="text-[#3b82f6]" />
                      <span className="flex-1 text-sm text-[#111827]">{item.customerName}</span>
                      <span className="text-xs text-[#6b7280]">{item.status}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Gallery */}
              {results.gallery.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                    <ImageIcon size={12} aria-hidden />
                    Galerii
                  </div>
                  {results.gallery.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleResultClick(item.href)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-[#f3f4f6]"
                    >
                      <ImageIcon size={16} className="text-[#ec4899]" aria-hidden />
                      <span className="flex-1 text-sm text-[#111827] truncate">{item.caption || 'Pilt'}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Feedback */}
              {results.feedback.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                    <MessageCircle size={12} />
                    Tagasiside
                  </div>
                  {results.feedback.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleResultClick(item.href)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-[#f3f4f6]"
                    >
                      <MessageCircle size={16} className="text-[#8b5cf6]" />
                      <span className="flex-1 text-sm text-[#111827] truncate">{item.clientName}</span>
                      <span className="max-w-[120px] truncate text-xs text-[#6b7280]">&ldquo;{item.feedbackText.length > 20 ? `${item.feedbackText.slice(0, 20)}…` : item.feedbackText}&rdquo;</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-[#e5e7eb] px-4 py-2 text-xs text-[#9ca3af]">
          <span>
            {totalResults} tulemus{totalResults !== 1 ? 't' : ''}
          </span>
          <span>
            <kbd className="rounded border border-[#e5e7eb] bg-[#f3f4f6] px-1 py-0.5">↵</kbd> vali{' '}
            <kbd className="rounded border border-[#e5e7eb] bg-[#f3f4f6] px-1 py-0.5">↑↓</kbd> liigu{' '}
            <kbd className="rounded border border-[#e5e7eb] bg-[#f3f4f6] px-1 py-0.5">esc</kbd> sulge
          </span>
        </div>
      </div>

      {/* Backdrop click to close */}
      <div className="absolute inset-0 -z-10" onClick={() => setIsOpen(false)} />
    </div>
  );
}

export default AdminSearch;
