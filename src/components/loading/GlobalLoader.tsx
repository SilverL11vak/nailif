'use client';

interface GlobalLoaderProps {
  show: boolean;
  exiting: boolean;
  headline: string;
  helper: string;
  themeClass: string;
  reducedMotion: boolean;
}

export function GlobalLoader({ show, exiting, headline, helper, themeClass, reducedMotion }: GlobalLoaderProps) {
  if (!show) return null;

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[95] flex items-center justify-center ${themeClass} transition-all duration-300 ${
        exiting ? 'opacity-0 blur-[2px] -translate-y-1' : 'opacity-100'
      }`}
      aria-hidden="true"
    >
      <div className="relative overflow-hidden rounded-3xl border border-[#efdce8] bg-white/84 px-8 py-7 shadow-[0_26px_42px_-32px_rgba(90,53,78,0.48)] backdrop-blur-md">
        {!reducedMotion && <span className="loader-float absolute -left-3 top-3 h-2 w-2 rounded-full bg-[#d79dbc]" />}
        {!reducedMotion && (
          <span
            className="loader-float absolute -right-2 bottom-4 h-1.5 w-1.5 rounded-full bg-[#c889aa]"
            style={{ animationDelay: '0.6s' }}
          />
        )}

        <div className={`${reducedMotion ? '' : 'loader-breathe'} relative overflow-hidden`}>
          <p className="text-center text-xl font-semibold tracking-[0.08em] text-[#7a3d63]">Nailify</p>
          {!reducedMotion && (
            <span className="absolute -left-1/2 top-0 h-full w-1/2 animate-[nailify-shimmer_1200ms_ease-out_infinite] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.72),transparent)]" />
          )}
        </div>
        <p className="mt-3 text-center text-sm text-[#6e5b66]">{headline}</p>
        <p className="mt-1 text-center text-xs text-[#8a7483]">{helper}</p>
      </div>
    </div>
  );
}

export default GlobalLoader;
