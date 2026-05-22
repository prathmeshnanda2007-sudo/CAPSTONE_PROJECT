import { Link } from 'react-router-dom';
import AnoAI from '../components/ui/animated-shader-background';
import { ShaderAnimation } from '../components/ui/shader-animation';
import { GlassEffect, GlassFilter } from '../components/ui/liquid-glass';
import { Database, ArrowRight, Key, Sparkles } from 'lucide-react';

export const Landing = () => {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-x-hidden bg-black py-20 lg:py-0">
      {/* Required for Liquid Glass effect */}
      <GlassFilter />

      {/* Aurora Background Animation */}
      <div className="absolute inset-0 z-0">
        <AnoAI />
      </div>

      {/* Gradient overlay to ensure text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/40 z-[1] pointer-events-none" />

      {/* Content Container */}
      <div className="relative z-10 container mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        
        {/* Left Column: Hero Text & Buttons */}
        <div className="flex flex-col items-start text-left max-w-2xl">
          <div className="inline-flex items-center gap-3 mb-8 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md animate-fade-in animate-float">
            <Database className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-medium text-blue-200 tracking-wide uppercase">Village API Platform</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 drop-shadow-2xl animate-fade-in [animation-delay:200ms]">
            The Next Generation of <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
              B2B Data Integration
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-xl drop-shadow-md animate-fade-in [animation-delay:400ms] leading-relaxed">
            A powerful, scalable, and secure platform to connect, manage, and distribute your village-level data across your entire enterprise infrastructure.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-fade-in [animation-delay:600ms]">
            <Link
              to="/register"
              className="group inline-flex items-center justify-center gap-2 bg-white text-black font-semibold py-3 px-8 rounded-xl hover:bg-gray-100 transition-all duration-200 hover:scale-105"
            >
              Request Access
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="group inline-flex items-center justify-center gap-2 bg-white/10 text-white font-semibold py-3 px-8 rounded-xl border border-white/20 hover:bg-white/20 backdrop-blur-md transition-all duration-200"
            >
              <Key className="w-4 h-4" />
              Log In
            </Link>
          </div>
        </div>

        {/* Right Column: Liquid Glass Showcase Card */}
        <div className="w-full relative animate-fade-in [animation-delay:800ms] hidden lg:block">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl blur-xl opacity-30 animate-pulse" />
          
          <GlassEffect className="rounded-3xl h-[500px] border border-white/10 hover:scale-[1.02] transition-transform duration-500 cursor-default">
            {/* The Original Shader Animation */}
            <div className="absolute inset-0 z-0">
              <ShaderAnimation />
            </div>
            
            {/* Overlay Text inside the Liquid Glass Card */}
            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center pointer-events-none bg-black/40">
              <Sparkles className="w-12 h-12 text-white/80 mb-4 animate-float" />
              <span className="text-center text-4xl font-bold tracking-tight text-white drop-shadow-lg">
                High-Performance<br />Data Processing
              </span>
            </div>
          </GlassEffect>
        </div>

      </div>
    </div>
  );
};
