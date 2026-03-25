export default function Loading() {
    return (
        <div className="min-h-screen bg-[#0A0E1A] flex flex-col">
            {/* Header skeleton */}
            <div className="py-5 px-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-[#1E293B] animate-pulse" />
                        <div className="w-24 h-5 rounded bg-[#1E293B] animate-pulse" />
                    </div>
                    <div className="hidden md:flex items-center gap-6">
                        {[80, 70, 60, 50, 70].map((w, i) => (
                            <div key={i} className="h-4 rounded bg-[#1E293B] animate-pulse" style={{ width: w }} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Hero skeleton */}
            <div className="flex-1 flex items-center justify-center px-6 pt-12">
                <div className="max-w-7xl w-full grid lg:grid-cols-2 gap-12 items-center">
                    <div className="text-center lg:text-start space-y-6">
                        {/* Badge */}
                        <div className="inline-flex w-64 h-8 rounded-full bg-[#1E293B] animate-pulse" />
                        {/* Title lines */}
                        <div className="space-y-3">
                            <div className="h-12 w-3/4 rounded-lg bg-[#1E293B] animate-pulse mx-auto lg:mx-0" />
                            <div className="h-12 w-full rounded-lg bg-gradient-to-r from-[#1E293B] to-[#2DD4BF]/10 animate-pulse" />
                            <div className="h-12 w-2/3 rounded-lg bg-[#1E293B] animate-pulse mx-auto lg:mx-0" />
                        </div>
                        {/* Subtitle */}
                        <div className="space-y-2 max-w-xl mx-auto lg:mx-0">
                            <div className="h-4 w-full rounded bg-[#1E293B] animate-pulse" />
                            <div className="h-4 w-4/5 rounded bg-[#1E293B] animate-pulse" />
                        </div>
                        {/* CTAs */}
                        <div className="flex gap-4 justify-center lg:justify-start">
                            <div className="w-44 h-14 rounded-full bg-[#2DD4BF]/20 animate-pulse" />
                            <div className="w-44 h-14 rounded-full border border-[#1E293B] animate-pulse" />
                        </div>
                    </div>
                    {/* Phone mockup */}
                    <div className="hidden lg:flex justify-center">
                        <div className="w-72 h-[500px] rounded-3xl bg-[#1E293B] animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    );
}
