/**
 * Landing.jsx — Production-quality animated landing page
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Camera, Brain, Sprout } from 'lucide-react';
import FertilityBadge from '../components/common/FertilityBadge';
import AppLogo from '../components/common/AppLogo';

/** Intersection Observer hook for scroll-triggered animations */
function useScrollReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

const FEATURES = [
  {
    icon: Camera, color: 'from-blue-500 to-blue-600',
    title: 'Soil Image Capture', step: '01',
    desc: 'Take a photo of your soil. SoilSense extracts color and texture features using computer vision.',
  },
  {
    icon: Brain, color: 'from-purple-500 to-purple-600',
    title: 'Fuzzy Logic Analysis', step: '02',
    desc: 'pH, moisture, and image data feed into a Mamdani fuzzy inference engine to classify soil fertility.',
  },
  {
    icon: Sprout, color: 'from-green-500 to-emerald-600',
    title: 'Crop Recommendations', step: '03',
    desc: 'Receive ranked crop recommendations — Best, Second Best, and Not Suitable — driven by your soil result.',
  },
];

export default function Landing() {
  const [heroRef, heroVisible] = useScrollReveal(0);
  const [featRef, featVisible] = useScrollReveal();
  const [ctaRef,  ctaVisible]  = useScrollReveal();

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ── Navbar ───────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 px-5 py-3
                      bg-white/80 backdrop-blur-md border-b border-gray-100/80">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <AppLogo size="sm" />
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-sm font-medium text-gray-500 hover:text-gray-900
                                         px-4 py-2 rounded-xl hover:bg-gray-100 transition-all">
              Sign In
            </Link>
            <Link to="/register" className="btn-primary text-sm px-4 py-2">
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center pt-20 pb-16 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #052e16 0%, #14532d 35%, #166534 65%, #15803d 100%)',
        }}
      >
        {/* Background elements */}
        <div className="absolute inset-0 bg-grid-pattern opacity-20" />
        <div className="absolute inset-0 bg-noise" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-green-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />

        {/* Floating orbs */}
        <div className="absolute top-32 left-1/4 w-3 h-3 bg-green-400/40 rounded-full animate-float" style={{ animationDelay: '0s' }} />
        <div className="absolute top-48 right-1/3 w-2 h-2 bg-emerald-300/30 rounded-full animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-32 left-1/3 w-4 h-4 bg-green-500/20 rounded-full animate-float" style={{ animationDelay: '2s' }} />

        <div className="relative max-w-5xl mx-auto px-5 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: copy */}
          <div className={`transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                            bg-white/10 border border-white/20 text-green-300 text-xs font-medium mb-6
                            backdrop-blur-sm">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Roxas, Oriental Mindoro · Philippines
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-white leading-[1.08] tracking-tight mb-6">
              Understand
              <br />
              <span className="text-transparent bg-clip-text"
                    style={{ backgroundImage: 'linear-gradient(90deg, #4ade80, #86efac)' }}>
                Your Soil.
              </span>
              <br />
              Grow Smarter.
            </h1>

            <p className="text-green-100/80 text-lg leading-relaxed mb-8 max-w-lg">
              SoilSense uses smartphone images, optional sensors, and
              fuzzy logic to provide rapid preliminary soil fertility
              assessment and explainable crop recommendations.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl
                           bg-white text-green-800 font-bold text-sm
                           hover:bg-green-50 hover:-translate-y-0.5 hover:shadow-lg
                           transition-all duration-200 group">
                Start Free Assessment
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link to="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl
                           border border-white/20 text-white font-semibold text-sm
                           hover:bg-white/10 hover:border-white/40 transition-all duration-200 backdrop-blur-sm">
                Sign In
              </Link>
            </div>

            {/* Trust line */}
            <p className="text-green-200/50 text-xs mt-6">
              Preliminary assessment tool · Does not replace laboratory analysis
            </p>
          </div>

          {/* Right: mock result card */}
          <div className={`transition-all duration-700 delay-200 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <div className="relative">
              {/* Glow */}
              <div className="absolute -inset-4 bg-green-400/10 rounded-3xl blur-2xl" />

              {/* Card */}
              <div className="relative bg-white/10 backdrop-blur-md rounded-3xl border border-white/20
                              p-5 shadow-card-lg animate-float"
                   style={{ animationDuration: '4s' }}>
                <div className="text-[10px] font-bold text-green-300/60 uppercase tracking-widest mb-3">
                  Sample Result
                </div>

                {/* Fertility result */}
                <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/10">
                  <div className="flex-1">
                    <div className="text-white/60 text-xs mb-1">Soil Fertility</div>
                    <FertilityBadge classification="fertile" size="lg" />
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-black text-white">82</div>
                    <div className="text-white/50 text-xs">/100</div>
                  </div>
                </div>

                {/* Measurements */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { label: 'Soil pH', value: '6.7', sub: 'Optimal' },
                    { label: 'Moisture', value: '68%', sub: 'Moderate' },
                    { label: 'Confidence', value: '90%', sub: 'High' },
                    { label: 'Image', value: 'Good', sub: '100%' },
                  ].map(m => (
                    <div key={m.label} className="bg-white/10 rounded-xl p-2.5 text-center">
                      <div className="text-white font-bold text-sm">{m.value}</div>
                      <div className="text-white/40 text-[10px]">{m.label}</div>
                    </div>
                  ))}
                </div>

                {/* Crops */}
                <div className="space-y-2">
                  {[
                    { rank: '🥇', name: 'Mango — Kinalabaw', score: 94, color: 'bg-green-400/20 text-green-300' },
                    { rank: '🥈', name: 'Lanzones',           score: 88, color: 'bg-blue-400/20 text-blue-300' },
                    { rank: '🚫', name: 'Bugambilya',         score: 28, color: 'bg-red-400/20 text-red-300' },
                  ].map(c => (
                    <div key={c.name} className={`flex items-center justify-between rounded-xl px-3 py-2 ${c.color}`}>
                      <span className="text-xs font-semibold">{c.rank} {c.name}</span>
                      <span className="text-xs font-bold">{c.score}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section ref={featRef} className="py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <div className={`text-center mb-14 transition-all duration-700 ${featVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700
                            text-xs font-bold uppercase tracking-wider mb-4">
              How It Works
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
              Three steps to soil insight
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, color, title, step, desc }, i) => (
              <div
                key={title}
                className={`
                  card-hover p-6 group
                  transition-all duration-700
                  ${featVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}
                `}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${color}
                                  flex items-center justify-center flex-shrink-0 shadow-sm
                                  group-hover:scale-110 group-hover:shadow-md transition-all duration-300`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-3xl font-black text-gray-100 group-hover:text-gray-200 transition-colors">
                    {step}
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section ref={ctaRef} className="py-16 px-5">
        <div
          className={`
            max-w-2xl mx-auto text-center rounded-3xl p-10
            transition-all duration-700
            ${ctaVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
          `}
          style={{ background: 'linear-gradient(135deg, #14532d, #166534)' }}
        >
          <h2 className="text-3xl font-black text-white mb-3">Ready to assess your soil?</h2>
          <p className="text-green-200/70 mb-8">Free to use for farmers in Roxas, Oriental Mindoro.</p>
          <Link to="/register"
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl
                       bg-white text-green-800 font-bold text-base
                       hover:bg-green-50 hover:shadow-xl hover:-translate-y-1
                       transition-all duration-200 group">
            Create Free Account
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="text-green-200/40 text-xs mt-5">
            SoilSense provides preliminary assessment only. Laboratory soil analysis remains the reference standard.
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8 text-center">
        <div className="flex items-center justify-center mb-2">
          <AppLogo size="sm" showText={true} />
        </div>
        <p className="text-xs text-gray-400 mt-2">Roxas, Oriental Mindoro, Philippines</p>
        <p className="text-xs text-gray-300 mt-1 max-w-sm mx-auto">
          Preliminary soil fertility assessment tool. Not a replacement for laboratory analysis.
        </p>
      </footer>
    </div>
  );
}
