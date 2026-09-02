import React from "react";

export default function StudentLoading() {
  return (
    <div className="space-y-8 animate-pulse text-right" dir="rtl">
      {/* Welcome Banner Skeleton */}
      <div className="bg-slate-800/80 rounded-3xl p-6 md:p-8 space-y-4">
        <div className="h-7 bg-slate-700/60 rounded-lg w-1/3" />
        <div className="h-4 bg-slate-700/60 rounded-lg w-1/2" />
        <div className="flex gap-4 pt-2">
          <div className="h-12 bg-slate-700/60 rounded-2xl w-20" />
          <div className="h-12 bg-slate-700/60 rounded-2xl w-20" />
          <div className="h-12 bg-slate-700/60 rounded-2xl w-20" />
        </div>
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column (8 cols): Course Cards Skeleton */}
        <div className="lg:col-span-8 space-y-6">
          <div className="h-6 bg-slate-800/80 rounded-lg w-1/4" />
          <div className="grid sm:grid-cols-2 gap-6">
            {[1, 2].map((idx) => (
              <div key={idx} className="bg-slate-850 border border-slate-800/40 rounded-2xl h-80 flex flex-col justify-between p-5 space-y-4">
                <div className="aspect-video bg-slate-800/60 rounded-xl w-full" />
                <div className="h-5 bg-slate-800/60 rounded-lg w-3/4" />
                <div className="h-4 bg-slate-800/60 rounded-lg w-1/2" />
                <div className="h-8 bg-slate-800/60 rounded-xl w-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (4 cols): Sidebar Skeleton */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-850 border border-slate-800/40 rounded-2xl p-6 h-56 space-y-4">
            <div className="h-5 bg-slate-800/60 rounded-lg w-1/2" />
            <div className="h-4 bg-slate-800/60 rounded-lg w-full" />
            <div className="h-10 bg-slate-800/60 rounded-xl w-full" />
          </div>
          <div className="bg-slate-850 border border-slate-800/40 rounded-2xl p-6 h-48 space-y-4">
            <div className="h-5 bg-slate-800/60 rounded-lg w-2/3" />
            <div className="h-4 bg-slate-800/60 rounded-lg w-full" />
            <div className="h-4 bg-slate-800/60 rounded-lg w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}
