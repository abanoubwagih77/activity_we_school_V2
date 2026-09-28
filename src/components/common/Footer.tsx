import React from 'react';
import { Phone, ShieldCheck, Code, Sparkles, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 py-6 px-4 transition-colors" dir="rtl">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        {/* Brand & Rights */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-right">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
            <span className="w-2 h-2 rounded-full bg-[#5B2D82] animate-pulse" />
            <span>منصة الأنشطة الصفية التفاعلية</span>
            <span className="text-slate-400 dark:text-slate-600">|</span>
            <span className="text-slate-600 dark:text-slate-400 font-normal">
              جميع الحقوق محفوظة © {currentYear}
            </span>
          </div>
        </div>

        {/* Engineer Signature & Contact */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/60 text-[#5B2D82] dark:text-purple-300 font-bold shadow-xs">
            <Code className="w-3.5 h-3.5" />
            <span>تطوير وبرمجة:</span>
            <span className="font-black text-slate-900 dark:text-white">مهندس أبانوب وجيه</span>
            <span className="font-mono text-[11px] opacity-80" dir="ltr">(Eng/ Abanoub Wagih)</span>
          </div>

          <a
            href="tel:01012348828"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all cursor-pointer shadow-xs"
            title="الاتصال المباشر بالمهندس أبانوب وجيه"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-mono font-bold text-[12px]" dir="ltr">01012348828</span>
          </a>
        </div>
      </div>
    </footer>
  );
};
