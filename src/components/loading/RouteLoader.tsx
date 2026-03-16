'use client';

interface RouteLoaderProps {
  show: boolean;
}

export function RouteLoader({ show }: RouteLoaderProps) {
  return (
    <>
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed left-0 right-0 top-0 z-[90] h-[2px] origin-left bg-[linear-gradient(90deg,#f0cfe0_0%,#c24d86_55%,#7f375f_100%)] transition-transform duration-300 ease-out ${
          show ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
        }`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-x-0 top-0 z-[89] h-16 bg-[linear-gradient(180deg,rgba(255,244,251,0.72)_0%,rgba(255,244,251,0)_100%)] transition-opacity duration-250 ${
          show ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </>
  );
}

export default RouteLoader;
