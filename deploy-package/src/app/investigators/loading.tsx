export default function InvestigatorsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-white pb-20 pt-16">
      <div className="lira-container flex flex-col gap-12">
        {/* Header Skeleton */}
        <div className="relative overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/80 px-8 py-12 shadow-[0_30px_80px_-45px_rgba(30,64,175,0.35)]">
          <div className="animate-pulse">
            <div className="h-6 w-32 bg-slate-200 rounded-full mb-4"></div>
            <div className="h-12 w-3/4 bg-slate-200 rounded-lg mb-4"></div>
            <div className="h-4 w-full bg-slate-200 rounded mb-2"></div>
            <div className="h-4 w-2/3 bg-slate-200 rounded mb-8"></div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-3xl border border-slate-100 bg-white/90 p-6">
                  <div className="h-3 w-16 bg-slate-200 rounded mb-4"></div>
                  <div className="h-8 w-20 bg-slate-200 rounded mb-3"></div>
                  <div className="h-3 w-full bg-slate-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <section className="flex flex-col gap-8">
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-slate-200 rounded mb-2"></div>
            <div className="h-4 w-96 bg-slate-200 rounded"></div>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse rounded-[32px] border border-slate-100 bg-white/90 shadow-lg">
                <div className="aspect-square w-full bg-slate-200"></div>
                <div className="p-6 space-y-4">
                  <div className="h-6 w-32 bg-slate-200 rounded"></div>
                  <div className="h-4 w-full bg-slate-200 rounded"></div>
                  <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
                  <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="h-16 bg-slate-200 rounded-3xl"></div>
                    ))}
                  </div>
                  <div className="h-10 w-full bg-slate-200 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}