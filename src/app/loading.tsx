import { SkeletonBlock } from '@/components/loading/SkeletonBlock';

const premiumLoadingEnabled = process.env.NEXT_PUBLIC_ENABLE_PREMIUM_LOADING === '1';

export default function GlobalLoading() {
  if (!premiumLoadingEnabled) return null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fffdfa_0%,#fff6fb_42%,#fff9fc_100%)]">
      <div className="fixed inset-x-0 top-0 z-50 h-[2px] overflow-hidden bg-[#f4dce9]">
        <span className="block h-full w-1/3 animate-[nailify-shimmer_900ms_ease-out_infinite] bg-[linear-gradient(90deg,#f0cfe0_0%,#c24d86_55%,#7f375f_100%)]" />
      </div>

      <div className="mx-auto flex max-w-7xl items-start px-4 pt-24 sm:px-6 lg:px-8">
        <div className="w-full lg:w-7/12">
          <SkeletonBlock className="mb-5 h-5 w-32 rounded-full" />
          <SkeletonBlock className="mb-3 h-12 w-[88%] rounded-2xl" />
          <SkeletonBlock className="mb-3 h-12 w-[70%] rounded-2xl" />
          <SkeletonBlock className="mb-7 h-5 w-[62%] rounded-full" />
          <SkeletonBlock className="h-12 w-44 rounded-full" />
        </div>
        <div className="hidden w-full lg:block lg:w-5/12 lg:pl-10">
          <SkeletonBlock className="h-[420px] rounded-[28px]" />
        </div>
      </div>
    </div>
  );
}
