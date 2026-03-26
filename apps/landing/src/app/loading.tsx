export default function Loading() {
    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header skeleton */}
            <div className="py-5 px-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 animate-pulse" />
                        <div className="w-24 h-5 rounded bg-gray-100 animate-pulse" />
                    </div>
                    <div className="hidden md:flex items-center gap-6">
                        {[80, 70, 60, 50, 70].map((w, i) => (
                            <div key={i} className="h-4 rounded bg-gray-100 animate-pulse" style={{ width: w }} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Hero skeleton */}
            <div className="flex-1 flex items-center justify-center px-6 pt-12">
                <div className="max-w-7xl w-full grid lg:grid-cols-2 gap-12 items-center">
                    <div className="text-center lg:text-start space-y-6">
                        {/* Badge */}
                        <div className="inline-flex w-64 h-8 rounded-full bg-gray-100 animate-pulse" />
                        {/* Title lines */}
                        <div className="space-y-3">
                            <div className="h-12 w-3/4 rounded-lg bg-gray-100 animate-pulse mx-auto lg:mx-0" />
                            <div className="h-12 w-full rounded-lg bg-gray-100 animate-pulse" />
                            <div className="h-12 w-2/3 rounded-lg bg-gray-100 animate-pulse mx-auto lg:mx-0" />
                        </div>
                        {/* Subtitle */}
                        <div className="space-y-2 max-w-xl mx-auto lg:mx-0">
                            <div className="h-4 w-full rounded bg-gray-100 animate-pulse" />
                            <div className="h-4 w-4/5 rounded bg-gray-100 animate-pulse" />
                        </div>
                        {/* CTAs */}
                        <div className="flex gap-4 justify-center lg:justify-start">
                            <div className="w-44 h-14 rounded-full bg-teal-50 animate-pulse" />
                            <div className="w-44 h-14 rounded-full border border-gray-200 animate-pulse" />
                        </div>
                    </div>
                    {/* Doctor image placeholder */}
                    <div className="hidden lg:flex justify-center">
                        <div className="w-80 h-[400px] rounded-3xl bg-gray-100 animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    );
}
