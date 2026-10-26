import React from 'react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { Globe } from 'lucide-react';

export const LanguageToggle: React.FC<{ variant?: 'light' | 'outline' }> = ({ variant = 'outline' }) => {
  const { lang, setLang } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Language selector"
      className="inline-flex items-center p-0.5 rounded-xl bg-[#f5faf7] border border-[#dcebe2] shadow-2xs select-none"
    >
      <button
        type="button"
        onClick={() => setLang('bn')}
        className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
          lang === 'bn'
            ? 'bg-[#0b6b45] text-white shadow-xs'
            : 'text-[#688177] hover:text-[#12352a]'
        }`}
      >
        <span>বাংলা</span>
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
          lang === 'en'
            ? 'bg-[#0b6b45] text-white shadow-xs'
            : 'text-[#688177] hover:text-[#12352a]'
        }`}
      >
        <span>English</span>
      </button>
    </div>
  );
};
