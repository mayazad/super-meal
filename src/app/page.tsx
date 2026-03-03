'use client'

import Link from 'next/link'
import { ArrowRight, Calculator, Lock, Link as LinkIcon, ShieldCheck, Sparkles, LogIn, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useEffect } from 'react'

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [userLoggedIn, setUserLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserLoggedIn(!!user)
    })
  }, [])

  return (
    <div className="min-h-screen bg-[#FDFEFD] text-[#1A2F1A] font-sans selection:bg-[#10B981]/20 overflow-x-hidden relative">
      {/* Soft background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[280px] bg-[#10B981]/10 blur-[80px] rounded-full pointer-events-none -translate-y-1/2 -z-10" />

      {/* Sticky Frosted Navbar */}
      <nav className="border-b border-[#E1E8E1] bg-white/70 backdrop-blur-md sticky top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="h-7 w-7 rounded bg-[#10B981] text-white flex items-center justify-center font-bold text-xs shadow-sm">SM</div>
            <span className="font-bold text-lg tracking-tight text-[#064E3B]">SuperMeal</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden sm:flex items-center gap-3">
            {userLoggedIn ? (
              <Link href="/admin/dashboard" className="text-sm font-semibold bg-[#10B981] hover:bg-[#059669] text-white px-5 py-2 rounded-full transition-all shadow-md">
                Enter Dashboard
              </Link>
            ) : (
              <>
                <Link href="/admin/login" className="text-sm font-semibold text-[#064E3B] hover:text-[#10B981] px-2">
                  Login
                </Link>
                <Link href="/register" className="text-sm font-semibold flex items-center gap-1.5 bg-[#10B981] hover:bg-[#059669] text-white px-4 py-2 rounded-full transition-all shadow-md shadow-[#10B981]/20">
                  Start Your Mess <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            className="sm:hidden p-2 rounded-lg hover:bg-[#ECFDF5] transition-colors"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-5 w-5 text-[#064E3B]" /> : <Menu className="h-5 w-5 text-[#064E3B]" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {menuOpen && (
          <div className="sm:hidden border-t border-[#E1E8E1] bg-white/95 backdrop-blur-md px-4 py-4 space-y-3">
            {userLoggedIn ? (
              <Link href="/admin/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center justify-center h-11 w-full rounded-xl bg-[#10B981] text-white font-semibold text-sm gap-2">
                Enter Dashboard
              </Link>
            ) : (
              <>
                <Link href="/admin/login" onClick={() => setMenuOpen(false)} className="flex items-center justify-center h-11 w-full rounded-xl border border-[#E1E8E1] text-[#064E3B] font-semibold text-sm gap-2">
                  <LogIn className="h-4 w-4" /> Login
                </Link>
                <Link href="/register" onClick={() => setMenuOpen(false)} className="flex items-center justify-center h-11 w-full rounded-xl bg-[#10B981] text-white font-semibold text-sm gap-2">
                  Start Your Mess <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Hero */}
      <main className="pt-20 sm:pt-32 pb-16 px-4 sm:px-6 w-full relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-5 sm:space-y-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ECFDF5] border border-[#10B981]/30 text-[#10B981] text-xs sm:text-sm font-medium shadow-[0_0_12px_rgba(16,185,129,0.12)] animate-pulse">
            <Sparkles className="h-3.5 w-3.5" />
            Built for Shared Households
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.15] text-[#064E3B]">
            Smart Mess Management{' '}
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#064E3B] to-[#10B981]">
              for Modern Living.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-[#064E3B]/80 max-w-2xl mx-auto leading-relaxed px-2">
            Automated meal rates, utility tracking, and transparent ledgers for shared households.
          </p>
          {/* Single primary CTA in hero */}
          {!userLoggedIn && (
            <div className="pt-2">
              <Link href="/register" className="inline-flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white h-13 px-8 py-3.5 rounded-full font-bold text-base transition-all shadow-lg hover:-translate-y-0.5 hover:shadow-xl">
                Start Your Mess <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="mt-3 text-sm text-[#064E3B]/50">Already have an account? <Link href="/admin/login" className="underline hover:text-[#10B981]">Log in</Link></p>
            </div>
          )}
          {userLoggedIn && (
            <Link href="/admin/dashboard" className="inline-flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white h-13 px-8 py-3.5 rounded-full font-bold text-base transition-all shadow-lg hover:-translate-y-0.5">
              Enter Dashboard <ArrowRight className="h-5 w-5" />
            </Link>
          )}
        </div>

        {/* Bento Grid */}
        <div className="max-w-6xl mx-auto mt-16 sm:mt-24 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E1E8E1] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group">
            <div className="h-12 w-12 rounded-full bg-[#ECFDF5] flex items-center justify-center mb-5 text-[#10B981] group-hover:bg-[#10B981] group-hover:text-white transition-all">
              <Calculator className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-[#064E3B]">Automated Math</h3>
            <p className="text-[#064E3B]/70 text-sm leading-relaxed">
              Real-time meal rate (Total Grocery ÷ Total Meals). No more spreadsheet headaches each month.
            </p>
          </div>

          <div className="bg-[#064E3B] rounded-3xl p-6 sm:p-8 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all group">
            <div className="h-12 w-12 rounded-full bg-[#10B981]/20 flex items-center justify-center mb-5 text-[#10B981] group-hover:bg-[#10B981] group-hover:text-white transition-all border border-[#10B981]/30">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-white">Multi-Tenant Isolation</h3>
            <p className="text-emerald-50 text-sm leading-relaxed opacity-90 font-medium">
              Your data is yours. Completely private — every mess runs as an isolated, secure sandbox.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E1E8E1] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group sm:col-span-2 md:col-span-1">
            <div className="h-12 w-12 rounded-full bg-[#ECFDF5] flex items-center justify-center mb-5 text-[#10B981] group-hover:bg-[#10B981] group-hover:text-white transition-all">
              <LinkIcon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-[#064E3B]">Read-Only Views</h3>
            <p className="text-[#064E3B]/70 text-sm leading-relaxed">
              Share a unique link so roommates can check their balance anytime from their phone. No login needed.
            </p>
          </div>
        </div>
      </main>

      {/* Final CTA Section */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 bg-[#F0FDF8] border-t border-[#D1EAD8]">
        <div className="max-w-2xl mx-auto text-center space-y-5">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#064E3B]">
            Stop the spreadsheet headache.
          </h2>
          <p className="text-base sm:text-lg text-[#064E3B]/70 leading-relaxed">
            Join shared households already using SuperMeal to automate their rates and ledgers.
          </p>
          <div className="pt-2">
            <Link href="/register" className="inline-flex items-center gap-2 bg-[#064E3B] hover:bg-[#10B981] text-white h-13 px-8 py-3.5 rounded-full font-bold text-base transition-all shadow-lg hover:-translate-y-0.5 hover:shadow-xl">
              Start Your Mess — It's Free <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E1E8E1] bg-white py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#10B981]" />
            <span className="font-bold tracking-tight text-[#064E3B] text-sm">SuperMeal</span>
          </div>
          <p className="text-xs sm:text-sm text-[#064E3B]/70 font-medium">
            Crafted by <span className="font-mono font-bold text-[#064E3B]">MayazAD</span> | Powered by SuperMeal
          </p>
        </div>
      </footer>
    </div>
  )
}
