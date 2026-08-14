'use client'

import Link from 'next/link'
import { ArrowRight, Calculator, Lock, Link as LinkIcon, ShieldCheck, Sparkles, LogIn, Menu, X, ClipboardList, Users, Share2, ChevronDown, TrendingUp, Utensils } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { motion } from 'framer-motion'

const faqs = [
  {
    q: 'Is SuperMeal free to use?',
    a: 'Yes, completely free. Register your mess, add roommates, and start tracking — no credit card needed.',
  },
  {
    q: 'Do my roommates need an account to view balances?',
    a: 'No. You share a unique link (e.g. supermeal.app/view/your-mess) and anyone with the link can see the ledger — no login required.',
  },
  {
    q: 'How is the meal rate calculated?',
    a: 'Automatically: Total Meal Deposits ÷ Total Meals eaten that month. Every roommate pays exactly proportional to what they consumed.',
  },
  {
    q: 'Can I run multiple messes?',
    a: 'Each registered mess is isolated with its own admin, members, and data. Register a separate mess for each household.',
  },
]

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [userLoggedIn, setUserLoggedIn] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserLoggedIn(!!user)
    })
  }, [])

  return (
    <div className="min-h-screen bg-[#FDFEFD] text-[#1A2F1A] font-sans selection:bg-[#10B981]/20 overflow-x-hidden relative">

      {/* Dot grid background */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.035]"
        style={{ backgroundImage: 'radial-gradient(#10B981 1px, transparent 1px)', backgroundSize: '28px 28px' }}
      />
      {/* Top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#10B981]/10 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 -z-10" />

      {/* ── Sticky Frosted Navbar ─────────────────────────── */}
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
                <Link href="/admin/login" className="text-sm font-semibold text-[#064E3B] hover:text-[#10B981] px-2">Login</Link>
                <Link href="/register" className="text-sm font-semibold flex items-center gap-1.5 bg-[#10B981] hover:bg-[#059669] text-white px-4 py-2 rounded-full transition-all shadow-md shadow-[#10B981]/20">
                  Start Your Mess <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button className="sm:hidden p-2 rounded-lg hover:bg-[#ECFDF5] transition-colors" onClick={() => setMenuOpen(v => !v)} aria-label="Toggle menu">
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

      {/* ── Hero ─────────────────────────────────────────── */}
      <main className="pt-20 sm:pt-32 pb-16 px-4 sm:px-6 w-full relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-5 sm:space-y-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ECFDF5] border border-[#10B981]/30 text-[#10B981] text-xs sm:text-sm font-medium shadow-[0_0_12px_rgba(16,185,129,0.12)] animate-pulse">
            <Sparkles className="h-3.5 w-3.5" />
            Built for Shared Households
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.15]">
            <span className="text-[#064E3B]">Smart Mess</span>{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-400 bg-clip-text text-transparent">Management</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#064E3B] to-[#10B981]">
              for Modern Living.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-[#064E3B]/80 max-w-2xl mx-auto leading-relaxed px-2">
            Running a bachelor pad, hostel, or shared flat? SuperMeal handles the math so you don&apos;t have to fight over bills every month.
          </p>
          {!userLoggedIn && (
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register" className="inline-flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white px-8 py-3.5 rounded-full font-bold text-base transition-all shadow-lg shadow-emerald-500/25 hover:-translate-y-0.5 hover:shadow-xl hover:scale-105">
                Start Your Mess <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/admin/login" className="inline-flex items-center gap-2 bg-white border border-[#D1E4D1] text-[#064E3B] hover:border-[#10B981] px-6 py-3.5 rounded-full font-semibold text-sm transition-all hover:-translate-y-0.5">
                <LogIn className="h-4 w-4" /> Login
              </Link>
            </div>
          )}
          {userLoggedIn && (
            <Link href="/admin/dashboard" className="inline-flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white px-8 py-3.5 rounded-full font-bold text-base transition-all shadow-lg hover:-translate-y-0.5">
              Enter Dashboard <ArrowRight className="h-5 w-5" />
            </Link>
          )}
        </div>

        {/* ── Glassmorphism Stat Bar ──────────────────────────── */}
        <div className="max-w-3xl mx-auto mt-14 sm:mt-20 grid grid-cols-3 gap-4 sm:gap-6">
          {[
            { value: '100%', label: 'Free to Use', icon: Sparkles },
            { value: 'Auto', label: 'Meal Rate Calc', icon: TrendingUp },
            { value: '0 Tk', label: 'Billing Disputes', icon: Utensils },
          ].map(({ value, label, icon: Icon }) => (
            <div key={label} className="text-center backdrop-blur-md bg-white/60 border border-white/40 shadow-sm rounded-2xl p-4 sm:p-5 hover:bg-white/80 transition-all hover:-translate-y-0.5">
              <Icon className="h-5 w-5 text-[#10B981] mx-auto mb-2 opacity-70" />
              <p className="text-2xl sm:text-3xl font-extrabold text-[#10B981]">{value}</p>
              <p className="text-xs sm:text-sm text-[#064E3B]/60 mt-1 font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Floating Dashboard Mockup ──────────────────────── */}
        <div className="max-w-2xl mx-auto mt-14 sm:mt-20 px-2">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            className="rounded-2xl overflow-hidden border border-[#D1E4D1] shadow-2xl shadow-emerald-500/10 bg-white"
          >
            {/* Mock browser bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#F0FDF8] border-b border-[#E1E8E1]">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 mx-3 h-6 bg-white rounded border border-[#E1E8E1] flex items-center px-2">
                <span className="text-[10px] text-[#556B55]/60 font-mono">supermeal.app/admin/dashboard</span>
              </div>
            </div>
            {/* Mock dashboard content */}
            <div className="p-5 bg-[#FDFEFD] space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Meals', val: '284' },
                  { label: 'Meal Rate', val: '42.5 Tk' },
                  { label: 'Groceries', val: '12,070 Tk' },
                ].map(s => (
                  <div key={s.label} className="bg-white border border-[#E1E8E1] rounded-xl p-3 text-center shadow-sm">
                    <p className="text-[10px] text-[#556B55]/60 uppercase tracking-wider">{s.label}</p>
                    <p className="font-extrabold text-[#064E3B] text-sm mt-1">{s.val}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-[#E1E8E1] overflow-hidden">
                <div className="bg-[#F0FDF8] px-4 py-2 text-[10px] font-bold text-[#556B55] uppercase tracking-widest border-b border-[#E1E8E1]">Member Balances</div>
                {[
                  { name: 'Adnan', status: '+320 Tk', up: true },
                  { name: 'Moshiur', status: '−120 Tk', up: false },
                  { name: 'Rahat', status: '+80 Tk', up: true },
                ].map(m => (
                  <div key={m.name} className="flex items-center justify-between px-4 py-2 border-b border-[#F0F4F0] last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-[#ECFDF5] flex items-center justify-center text-[#10B981] text-[10px] font-bold">{m.name[0]}</div>
                      <span className="text-xs font-semibold text-[#1A2F1A]">{m.name}</span>
                    </div>
                    <span className={`text-xs font-bold ${m.up ? 'text-emerald-600' : 'text-red-500'}`}>{m.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
          <p className="text-center text-xs text-[#064E3B]/30 mt-4 font-medium">Live dashboard preview</p>
        </div>

        {/* ── Feature Bento Grid ────────────────────────── */}
        <div className="max-w-6xl mx-auto mt-16 sm:mt-24 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E1E8E1] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group">
            <div className="h-12 w-12 rounded-full bg-[#ECFDF5] flex items-center justify-center mb-5 text-[#10B981] group-hover:bg-[#10B981] group-hover:text-white transition-all">
              <Calculator className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-[#064E3B]">Automated Math</h3>
            <p className="text-[#064E3B]/70 text-sm leading-relaxed">
              Real-time meal rate (Total Meal Deposits ÷ Total Meals). No more spreadsheet headaches each month.
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

      {/* ── How It Works ─────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-16 sm:py-24 bg-white border-t border-[#E1E8E1]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-widest uppercase text-[#10B981] mb-3">Simple Process</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#064E3B]">Up and running in minutes</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 relative">
            {/* Connector line (desktop only) */}
            <div className="hidden sm:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-[#10B981]/20 via-[#10B981]/60 to-[#10B981]/20" />

            {[
              { step: '01', icon: ClipboardList, title: 'Register Your Mess', desc: 'Pick a name and unique slug for your mess. Takes 30 seconds.' },
              { step: '02', icon: Users, title: 'Add Roommates', desc: 'Add each member\'s name. Log their daily meals and grocery contributions.' },
              { step: '03', icon: Share2, title: 'Share the Link', desc: 'Send your /view/slug link. Roommates see live balances — no account needed.' },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="flex flex-col items-center text-center gap-4 relative">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-20 w-20 rounded-2xl bg-[#ECFDF5] border-2 border-[#10B981]/30 flex flex-col items-center justify-center gap-1 shadow-sm">
                    <span className="text-[10px] font-black tracking-wider text-[#10B981]/60">{step}</span>
                    <Icon className="h-7 w-7 text-[#10B981]" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-[#064E3B] mb-1">{title}</h3>
                  <p className="text-sm text-[#064E3B]/60 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 bg-[#F0FDF8] border-t border-[#D1EAD8]">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-bold tracking-widest uppercase text-[#10B981] mb-3">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#064E3B]">Common questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E1E8E1] overflow-hidden shadow-sm">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left gap-4"
                >
                  <span className="font-semibold text-[#064E3B] text-sm sm:text-base">{faq.q}</span>
                  <ChevronDown className={`h-4 w-4 text-[#10B981] shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-sm text-[#064E3B]/70 leading-relaxed border-t border-[#E1E8E1] pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 bg-white border-t border-[#D1EAD8]">
        <div className="max-w-2xl mx-auto text-center space-y-5">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#064E3B]">
            Stop the spreadsheet headache.
          </h2>
          <p className="text-base sm:text-lg text-[#064E3B]/70 leading-relaxed">
            Join shared households already using SuperMeal to automate their rates and ledgers.
          </p>
          <div className="pt-2">
            <Link href="/register" className="inline-flex items-center gap-2 bg-[#064E3B] hover:bg-[#10B981] text-white px-8 py-3.5 rounded-full font-bold text-base transition-all shadow-lg shadow-emerald-900/20 hover:-translate-y-0.5 hover:shadow-xl hover:scale-105">
              Start Your Mess — It&apos;s Free <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
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
