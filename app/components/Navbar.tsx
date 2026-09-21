'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, LogOut } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => pathname === path;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <nav className="bg-zinc-950 border-b border-zinc-800 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
      
      {/* Logotipo */}
      <div className="flex items-center gap-6">
        <Link href="/desempenho" className="font-black text-red-600 tracking-wider text-lg flex items-center">
          UPQUEST<span className="text-white">OES</span>
        </Link>
        <div className="hidden lg:flex items-center gap-2 bg-red-950/30 border border-red-600/30 px-3 py-1 rounded-lg text-xs font-semibold text-red-400">
          <ShieldAlert className="w-3.5 h-3.5" />
          TJSP / VUNESP
        </div>
      </div>

      {/* Links de Navegação */}
      <div className="flex items-center gap-1.5 md:gap-3 overflow-x-auto max-w-full pb-2 md:pb-0 text-xs md:text-sm font-medium">
        <Link 
          href="/desempenho" 
          className={`px-3 py-2 rounded-xl transition-all ${isActive('/desempenho') ? 'bg-red-600 text-white font-bold shadow-lg shadow-red-600/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
        >
          Desempenho
        </Link>
        <Link 
          href="/questoes" 
          className={`px-3 py-2 rounded-xl transition-all ${isActive('/questoes') ? 'bg-red-600 text-white font-bold shadow-lg shadow-red-600/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
        >
          Questões
        </Link>
        <Link 
          href="/redacao" 
          className={`px-3 py-2 rounded-xl transition-all ${isActive('/redacao') ? 'bg-red-600 text-white font-bold shadow-lg shadow-red-600/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
        >
          Redação
        </Link>
        <Link 
          href="/caderno-revisao" 
          className={`px-3 py-2 rounded-xl transition-all ${isActive('/caderno-revisao') ? 'bg-red-600 text-white font-bold shadow-lg shadow-red-600/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
        >
          Caderno de Revisão
        </Link>
        <Link 
          href="/mapas-mentais" 
          className={`px-3 py-2 rounded-xl transition-all ${isActive('/mapas-mentais') ? 'bg-red-600 text-white font-bold shadow-lg shadow-red-600/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
        >
          Mapas Mentais
        </Link>
      </div>

      {/* Botão de Sair */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 bg-zinc-900 hover:bg-red-950/40 border border-zinc-800 hover:border-red-600/40 px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-red-400 transition-all cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        Sair
      </button>

    </nav>
  );
}