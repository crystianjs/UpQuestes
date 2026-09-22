'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { supabase } from '@/lib/supabase';
import { BookOpen, CheckCircle, AlertCircle } from 'lucide-react';

// Matérias oficiais do TJSP (VUNESP)
const MATERIAS_TJSP = [
  'Língua Portuguesa',
  'Direito Penal',
  'Direito Processual Penal',
  'Direito Processual Civil',
  'Direito Constitucional',
  'Direito Administrativo',
  'Normas da Corregedoria',
  'Matemática',
  'Raciocínio Lógico',
  'Informática',
  'Atualidades',
  'Estatuto da Pessoa com Deficiência'
];

export default function QuestoesPage() {
  const router = useRouter();
  const [materia, setMateria] = useState(MATERIAS_TJSP[0]);
  const [assunto, setAssunto] = useState('');
  const [totalFeitas, setTotalFeitas] = useState<number | ''>(1);
  const [acertos, setAcertos] = useState<number | ''>(1);
  const [erros, setErros] = useState<number | ''>(0);
  
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function verificarSessao() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
      } else {
        setUserId(session.user.id);
      }
    }
    verificarSessao();
  }, [router]);

  // Atualiza automaticamente os erros quando altera o total ou acertos
  const handleTotalChange = (val: string) => {
    const num = val === '' ? '' : Number(val);
    setTotalFeitas(num);
    if (typeof num === 'number' && typeof acertos === 'number' && num >= acertos) {
      setErros(num - acertos);
    }
  };

  const handleAcertosChange = (val: string) => {
    const num = val === '' ? '' : Number(val);
    setAcertos(num);
    if (typeof num === 'number' && typeof totalFeitas === 'number' && totalFeitas >= num) {
      setErros(totalFeitas - num);
    }
  };

  async function handleSalvarQuestoes(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    if (totalFeitas === '' || acertos === '' || erros === '') {
      setErro('Preencha todos os campos numéricos corretamente.');
      return;
    }

    if (acertos + erros !== totalFeitas) {
      setErro('A soma de acertos e erros deve ser igual ao total de questões feitas.');
      return;
    }

    setSalvando(true);
    setErro('');
    setSucesso(false);

    try {
      const { error } = await supabase.from('user_questions').insert([
        {
          materia: materia,
          assunto: assunto.trim() || null,
          total_feitas: totalFeitas,
          acertos: acertos,
          erros: erros,
          user_id: userId
        }
      ]);

      if (error) throw error;

      setSucesso(true);
      // Reset parcial útil
      setAssunto('');
      setTotalFeitas(1);
      setAcertos(1);
      setErros(0);
    } catch (err: any) {
      console.error('Detalhe completo do erro do Supabase:', err);
      setErro(`Erro ao guardar: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-red-600 selection:text-white">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-red-500" />
            Registo de Questões — UPQUESTÕES
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Registe o seu progresso individual isolado por conta.
          </p>
        </div>

        {sucesso && (
          <div className="bg-emerald-950/40 border border-emerald-600/40 p-4 rounded-xl text-emerald-400 text-sm flex items-center gap-3">
            <CheckCircle className="w-5 h-5 shrink-0" />
            Registo de questões guardado com sucesso!
          </div>
        )}

        {erro && (
          <div className="bg-red-950/40 border border-red-600/40 p-4 rounded-xl text-red-400 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {erro}
          </div>
        )}

        <form onSubmit={handleSalvarQuestoes} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Disciplina / Matéria</label>
              <select 
                value={materia}
                onChange={(e) => setMateria(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-red-600 transition-colors"
              >
                {MATERIAS_TJSP.map((mat) => (
                  <option key={mat} value={mat}>{mat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Assunto / Tópico (Opcional)</label>
              <input 
                type="text"
                placeholder="Ex: Negação de Proposições, Art. 5º CF..."
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-red-600 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Feitas</label>
              <input 
                type="number" 
                min={1}
                required
                value={totalFeitas}
                onChange={(e) => handleTotalChange(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-red-600 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Acertos</label>
              <input 
                type="number" 
                min={0}
                required
                value={acertos}
                onChange={(e) => handleAcertosChange(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-red-600 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Erros</label>
              <input 
                type="number" 
                min={0}
                readOnly
                value={erros}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-400 cursor-not-allowed"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={salvando}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-6 rounded-xl transition-colors shadow-lg shadow-red-600/20 disabled:opacity-50 cursor-pointer"
          >
            {salvando ? 'A guardar...' : 'Guardar Registo de Questões'}
          </button>

        </form>

      </main>
    </div>
  );
}