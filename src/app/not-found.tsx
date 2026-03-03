import Link from 'next/link'
import { ArrowLeft, Home } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[#FDFEFD] flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-6">
                {/* Big 404 */}
                <div className="relative">
                    <p className="text-[120px] font-black leading-none text-[#10B981]/10 select-none">404</p>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-14 w-14 rounded-2xl bg-[#10B981] text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-[#10B981]/20">
                            SM
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-extrabold text-[#064E3B] tracking-tight">Page not found</h1>
                    <p className="text-[#064E3B]/60 text-sm leading-relaxed">
                        The page you&apos;re looking for doesn&apos;t exist, was moved, or the workspace has been removed.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white px-5 py-2.5 rounded-full font-semibold text-sm transition-all shadow-md hover:-translate-y-0.5"
                    >
                        <Home className="h-4 w-4" /> Go Home
                    </Link>
                    <Link
                        href="/admin/login"
                        className="inline-flex items-center gap-2 border border-[#D1E4D1] text-[#064E3B] px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-[#ECFDF5] transition-all"
                    >
                        <ArrowLeft className="h-4 w-4" /> Admin Login
                    </Link>
                </div>
            </div>
        </div>
    )
}
