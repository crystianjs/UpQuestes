'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { supabase } from '@/lib/supabase';
import { BookOpen, CheckCircle, AlertCircle, Upload, Lightbulb, Send, Trash2, Loader2, Image as ImageIcon, Filter } from 'lucide-react';

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

interface QuestaoResolucao {
  id: string;
  materia: string;
  imagem_url: string;
  resolucao: string;
  created_at?: string;
}

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

  // Estados para Questões e Resolução com Upload e Filtro
  const [materiaResolucao, setMateriaResolucao] = useState(MATERIAS_TJSP[0]);
  const [arquivoImagem, setArquivoImagem] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resolucaoTexto, setResolucaoTexto] = useState('');
  const [salvandoResolucao, setSalvandoResolucao] = useState(false);
  const [sucessoResolucao, setSucessoResolucao] = useState(false);
  const [listaResolucoes, setListaResolucoes] = useState<QuestaoResolucao[]>([]);
  const [filtroMateria, setFiltroMateria] = useState('TODAS');

  useEffect(() => {
    async function verificarSessao() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
      } else {
        setUserId(session.user.id);
        carregarResolucoes(session.user.id);
      }
    }
    verificarSessao();
  }, [router]);

  async function carregarResolucoes(uid: string) {
    try {
      const { data, error } = await supabase
        .from('questoes_resolucao')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setListaResolucoes(data);
    } catch (err) {
      console.error('Erro ao carregar resoluções:', err);
    }
  }

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

  const handleArquivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArquivoImagem(file);
      setPreviewUrl(URL.createObjectURL(file));
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
      setAssunto('');
      setTotalFeitas(1);
      setAcertos(1);
      setErros(0);
    } catch (err: any) {
      console.error(err);
      setErro(`Erro ao guardar: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setSalvando(false);
    }
  }

  async function handleSalvarResolucao(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    if (!resolucaoTexto.trim()) {
      alert('Por favor, informe o método de resolução.');
      return;
    }

    setSalvandoResolucao(true);
    setSucessoResolucao(false);

    try {
      let imagemPublicUrl = null;

      if (arquivoImagem) {
        const fileExt = arquivoImagem.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('questoes')
          .upload(filePath, arquivoImagem);

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from('questoes')
          .getPublicUrl(filePath);

        imagemPublicUrl = publicData.publicUrl;
      }

      const novaQuestao = {
        user_id: userId,
        materia: materiaResolucao,
        imagem_url: imagemPublicUrl,
        resolucao: resolucaoTexto.trim()
      };

      const { data, error } = await supabase
        .from('questoes_resolucao')
        .insert([novaQuestao])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        setListaResolucoes([data[0], ...listaResolucoes]);
      }

      setResolucaoTexto('');
      setArquivoImagem(null);
      setPreviewUrl(null);
      setSucessoResolucao(true);
      setTimeout(() => setSucessoResolucao(false), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar resolução:', err);
      alert(`Erro ao guardar resolução: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setSalvandoResolucao(false);
    }
  }

  async function handleExcluirResolucao(id: string) {
    if (confirm('Deseja excluir permanentemente este registo de resolução?')) {
      try {
        const { error } = await supabase.from('questoes_resolucao').delete().eq('id', id);
        if (error) throw error;
        setListaResolucoes(listaResolucoes.filter(item => item.id !== id));
      } catch (err) {
        console.error(err);
      }
    }
  }

  // Filtragem das resoluções cadastradas
  const resolucoesFiltradas = filtroMateria === 'TODAS' 
    ? listaResolucoes 
    : listaResolucoes.filter(item => item.materia === filtroMateria);

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-red-600 selection:text-white">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-12">
        
        {/* Bloco 1: Registo de Questões */}
        <div className="space-y-6">
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
                <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Acertos
                </label>
                <input 
                  type="number" 
                  min={0}
                  required
                  value={acertos}
                  onChange={(e) => handleAcertosChange(e.target.value)}
                  className="w-full bg-emerald-950/20 border border-emerald-600/50 rounded-xl px-4 py-3 text-sm text-emerald-300 font-bold focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Erros
                </label>
                <input 
                  type="number" 
                  min={0}
                  readOnly
                  value={erros}
                  className="w-full bg-red-950/20 border border-red-600/50 rounded-xl px-4 py-3 text-sm text-red-400 font-bold cursor-not-allowed"
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
        </div>

        {/* Bloco 2: Questões e Resolução com Upload */}
        <div className="space-y-6 pt-6 border-t border-zinc-800">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-xl flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                Questões e Resolução
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Faça o upload do print da questão, selecione a matéria e estruture o método detalhado de resolução.
              </p>
            </div>
          </div>

          {sucessoResolucao && (
            <div className="bg-emerald-950/40 border border-emerald-600/40 p-4 rounded-xl text-emerald-400 text-sm flex items-center gap-3">
              <CheckCircle className="w-5 h-5 shrink-0" />
              Resolução guardada com sucesso!
            </div>
          )}

          <form onSubmit={handleSalvarResolucao} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Disciplina / Matéria</label>
                <select 
                  value={materiaResolucao}
                  onChange={(e) => setMateriaResolucao(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-red-600 transition-colors"
                >
                  {MATERIAS_TJSP.map((mat) => (
                    <option key={mat} value={mat}>{mat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-red-500" /> Print / Imagem da Questão (Opcional)
                </label>
                <label className="flex items-center justify-center gap-2 w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-red-600/60 rounded-xl px-4 py-3 text-xs font-semibold text-zinc-300 cursor-pointer transition-all">
                  <Upload className="w-4 h-4 text-red-500" />
                  {arquivoImagem ? arquivoImagem.name : 'Selecionar imagem do computador...'}
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleArquivoChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {previewUrl && (
              <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 p-2 flex justify-center max-h-60">
                <img src={previewUrl} alt="Preview" className="object-contain max-h-52 rounded-lg" />
                <button
                  type="button"
                  onClick={() => { setArquivoImagem(null); setPreviewUrl(null); }}
                  className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-lg text-xs font-bold shadow-md cursor-pointer"
                >
                  Remover imagem
                </button>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Método de Resolução & Comentários</label>
              <textarea 
                rows={5}
                required
                placeholder="Descreva o passo a passo de como resolver esta questão, pegada VUNESP, gabarito comentado ou armadilhas da banca..."
                value={resolucaoTexto}
                onChange={(e) => setResolucaoTexto(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-100 focus:outline-none focus:border-red-600 transition-colors leading-relaxed"
              />
            </div>

            <button 
              type="submit"
              disabled={salvandoResolucao}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-6 rounded-xl transition-colors shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {salvandoResolucao ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {salvandoResolucao ? 'A guardar resolução e imagem...' : 'Guardar Resolução da Questão'}
            </button>
          </form>

          {/* Seção de Filtro por Matéria e Listagem */}
          <div className="space-y-4 pt-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-xl">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Filter className="w-4 h-4 text-red-500" /> Resoluções Cadastradas
              </h3>
              
              <div className="w-full md:w-72">
                <select 
                  value={filtroMateria}
                  onChange={(e) => setFiltroMateria(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-red-600 transition-colors"
                >
                  <option value="TODAS">🔍 Filtrar por Matéria (Todas)</option>
                  {MATERIAS_TJSP.map((mat) => (
                    <option key={mat} value={mat}>{mat}</option>
                  ))}
                </select>
              </div>
            </div>

            {resolucoesFiltradas.length === 0 ? (
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 text-sm">
                Nenhuma resolução encontrada com o filtro selecionado.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {resolucoesFiltradas.map((item) => (
                  <div key={item.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4 relative group">
                    <div className="flex justify-between items-center">
                      <span className="bg-red-950/80 border border-red-600/40 text-red-400 text-xs px-2.5 py-0.5 rounded-lg font-bold">
                        {item.materia}
                      </span>
                      <button 
                        onClick={() => handleExcluirResolucao(item.id)}
                        title="Excluir Resolução"
                        className="text-zinc-500 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-zinc-900 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {item.imagem_url && (
                      <div className="rounded-xl overflow-hidden border border-zinc-800 max-h-80 bg-zinc-900 flex justify-center">
                        <img 
                          src={item.imagem_url} 
                          alt="Print da Questão" 
                          className="object-contain max-h-80 w-full"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      </div>
                    )}

                    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Método de Resolução:</span>
                      <p className="text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed font-sans">
                        {item.resolucao}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}