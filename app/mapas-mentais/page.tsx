'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { supabase } from '@/lib/supabase';
import { Network, Plus, Search, Code, X, Save, Copy, Check, Loader2, AlertTriangle, ShieldCheck, Target, Upload, Image as ImageIcon } from 'lucide-react';

interface MapaMentalItem {
  id: string;
  user_id?: string;
  materia: string;
  titulo: string;
  nucleo: string;
  fundamento: string;
  pegadinha: string;
  imagem_url?: string;
  cor: 'amarelo' | 'azul' | 'verde' | 'rosa' | 'laranja';
}

const MATERIAS_TJSP = [
  'TODAS AS MATÉRIAS',
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

export default function MapasMentaisPage() {
  const router = useRouter();
  const [filtroMateria, setFiltroMateria] = useState<string>('TODAS AS MATÉRIAS');
  const [busca, setBusca] = useState<string>('');
  const [mapas, setMapas] = useState<MapaMentalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Estados dos Modais
  const [modalJsonOpen, setModalJsonOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [mapaEmEdicao, setMapaEmEdicao] = useState<MapaMentalItem | null>(null);

  // Estados de upload de imagem
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagemUrlTemp, setImagemUrlTemp] = useState('');

  useEffect(() => {
    async function carregarMapas() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/');
          return;
        }
        setUserId(session.user.id);

        const { data, error } = await supabase
          .from('mapas_mentais')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) setMapas(data);
      } catch (err) {
        console.error('Erro ao carregar mapas mentais:', err);
      } finally {
        setLoading(false);
      }
    }
    carregarMapas();
  }, [router]);

  // Filtragem por matéria e texto de busca
  const mapasFiltrados = mapas.filter(item => {
    const matchMateria = filtroMateria === 'TODAS AS MATÉRIAS' || item.materia.toLowerCase() === filtroMateria.toLowerCase();
    const matchBusca = item.titulo.toLowerCase().includes(busca.toLowerCase()) || 
                       item.nucleo.toLowerCase().includes(busca.toLowerCase()) ||
                       item.fundamento.toLowerCase().includes(busca.toLowerCase());
    return matchMateria && matchBusca;
  });

  // Função de Upload de Imagem para o Supabase Storage (Bucket 'mapas-mentais')
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdicao = false) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `mapa-${userId}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('mapas-mentais')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('mapas-mentais')
        .getPublicUrl(filePath);

      if (isEdicao && mapaEmEdicao) {
        setMapaEmEdicao({ ...mapaEmEdicao, imagem_url: publicUrl });
      } else {
        setImagemUrlTemp(publicUrl);
      }
      alert('Imagem do mapa mental enviada com sucesso!');
    } catch (err) {
      console.error('Erro no upload da imagem:', err);
      alert('Erro ao enviar imagem. Verifique se o bucket "mapas-mentais" existe no Supabase e é público.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Adicionar Mapa Mental via JSON
  const handleAdicionarJson = async () => {
    if (!userId) return;
    try {
      const parsed = JSON.parse(jsonInput);
      const novoItem = {
        user_id: userId,
        materia: parsed.materia || 'Direito Constitucional',
        titulo: parsed.titulo || 'Mapa Estratégico',
        nucleo: parsed.nucleo || 'Núcleo central',
        fundamento: parsed.fundamento || 'Fundamento legal',
        pegadinha: parsed.pegadinha || 'Armadilha VUNESP',
        imagem_url: imagemUrlTemp || parsed.imagem_url || null,
        cor: parsed.cor || 'azul'
      };

      const { data, error } = await supabase
        .from('mapas_mentais')
        .insert([novoItem])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        setMapas([data[0], ...mapas]);
      }

      setJsonInput('');
      setImagemUrlTemp('');
      setModalJsonOpen(false);
      alert('Mapa Mental adicionado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro no formato JSON. Verifique se copiou corretamente.');
    }
  };

  // Salvar Edição
  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapaEmEdicao) return;

    try {
      const { error } = await supabase
        .from('mapas_mentais')
        .update({
          titulo: mapaEmEdicao.titulo,
          materia: mapaEmEdicao.materia,
          nucleo: mapaEmEdicao.nucleo,
          fundamento: mapaEmEdicao.fundamento,
          pegadinha: mapaEmEdicao.pegadinha,
          imagem_url: mapaEmEdicao.imagem_url,
          cor: mapaEmEdicao.cor
        })
        .eq('id', mapaEmEdicao.id);

      if (error) throw error;

      setMapas(mapas.map(p => p.id === mapaEmEdicao.id ? mapaEmEdicao : p));
      setMapaEmEdicao(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar mapa mental.');
    }
  };

  // Remover Mapa
  const handleRemover = async (id: string) => {
    if (confirm('Deseja excluir permanentemente este mapa mental?')) {
      try {
        const { error } = await supabase.from('mapas_mentais').delete().eq('id', id);
        if (error) throw error;
        setMapas(mapas.filter(p => p.id !== id));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const promptIaRecomendado = `Antes de gerar qualquer JSON, pergunte-me qual é a Matéria e o Tema exato que estou estudando agora para o concurso de Escrevente do TJSP. Assim que eu responder, você deverá criar um Mapa Mental cirúrgico e direto focado nos padrões de cobrança da VUNESP. O seu retorno deve ser estritamente em formato de objeto JSON puro (sem blocos de código markdown ou texto extra fora do JSON), seguindo exatamente esta estrutura:

{
  "materia": "Nome exato da matéria informada",
  "titulo": "Título curto focado no tema exato cobrado pela VUNESP",
  "nucleo": "O conceito central, regra ou fórmula principal cobrada na questão",
  "fundamento": "O que diz a lei, a regra técnica ou o fundamento lógico correto aplicável",
  "pegadinha": "A armadilha clássica, exceção falsa ou inversão que a VUNESP utiliza para derrubar o candidato",
  "cor": "azul"
}

O campo 'cor' pode ser estritamente: "azul", "verde", "amarelo", "rosa" ou "laranja". Retorne APENAS o JSON puro após a minha resposta.`;

  const copiarPrompt = () => {
    navigator.clipboard.writeText(promptIaRecomendado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const getCorCard = (cor: string) => {
    switch (cor) {
      case 'azul': return 'bg-sky-950/40 border-sky-600/40 text-sky-100';
      case 'verde': return 'bg-emerald-950/40 border-emerald-600/40 text-emerald-100';
      case 'amarelo': return 'bg-amber-950/40 border-amber-600/40 text-amber-100';
      case 'rosa': return 'bg-rose-950/40 border-rose-600/40 text-rose-100';
      case 'laranja': return 'bg-orange-950/40 border-orange-600/40 text-orange-100';
      default: return 'bg-zinc-900 border-zinc-800 text-zinc-100';
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-red-600 selection:text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Cabeçalho */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-950/60 border border-red-600/50 flex items-center justify-center text-red-500 shadow-lg shadow-red-950/50 shrink-0">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                  MAPAS MENTAIS TJSP
                </h1>
                <span className="bg-red-950/80 border border-red-600/40 text-red-400 text-xs px-2.5 py-0.5 rounded-lg font-bold">
                  Rede de Conhecimento
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Conecte Núcleos, Fundamentos, Pegadinhas e Mapas Visuais
              </p>
            </div>
          </div>

          <button 
            onClick={() => setModalJsonOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-red-600/20 flex items-center gap-2 transition-all cursor-pointer w-full md:w-auto justify-center"
          >
            <Code className="w-4 h-4" />
            Adicionar Novo Mapa (JSON)
          </button>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 overflow-x-auto w-full pb-2 lg:pb-0 scrollbar-thin">
            {MATERIAS_TJSP.map((cat) => (
              <button
                key={cat}
                onClick={() => setFiltroMateria(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  filtroMateria === cat
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text"
              placeholder="Buscar no mapa mental..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-100 focus:outline-none focus:border-red-600 transition-colors"
            />
          </div>
        </div>

        {/* Listagem / Loading */}
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            <p className="text-xs text-zinc-400">Carregando mapas mentais...</p>
          </div>
        ) : mapasFiltrados.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-16 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
              <Network className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Nenhum mapa mental encontrado</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Clique em "Adicionar Novo Mapa (JSON)" para injetar resumos estruturados.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mapasFiltrados.map((item) => (
              <div 
                key={item.id}
                className={`rounded-2xl p-6 border shadow-xl flex flex-col justify-between transition-transform duration-200 hover:-translate-y-1 relative group ${getCorCard(item.cor)}`}
              >
                <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity bg-black/20 p-1 rounded-lg backdrop-blur-xs">
                  <button 
                    onClick={() => setMapaEmEdicao(item)}
                    title="Editar Mapa"
                    className="p-1 rounded hover:bg-black/30 text-white transition-colors cursor-pointer"
                  >
                    <Code className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => handleRemover(item.id)}
                    title="Remover Mapa"
                    className="p-1 rounded hover:bg-rose-600 text-white transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-4 pr-12">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black tracking-widest bg-black/30 px-2.5 py-1 rounded-lg">
                      {item.materia}
                    </span>
                  </div>

                  <h3 className="text-base font-black tracking-tight text-white">
                    {item.titulo}
                  </h3>

                  {/* Blocos do Mapa Mental */}
                  <div className="space-y-3 pt-2">
                    
                    {/* Núcleo */}
                    <div className="bg-black/30 border border-white/10 rounded-xl p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-400">
                        <Target className="w-3.5 h-3.5" /> Núcleo Central
                      </div>
                      <p className="text-xs leading-relaxed text-zinc-200">
                        {item.nucleo}
                      </p>
                    </div>

                    {/* Fundamento */}
                    <div className="bg-black/30 border border-white/10 rounded-xl p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5" /> Fundamento Correto
                      </div>
                      <p className="text-xs leading-relaxed text-zinc-200">
                        {item.fundamento}
                      </p>
                    </div>

                    {/* Pegadinha */}
                    <div className="bg-red-950/40 border border-red-600/30 rounded-xl p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
                        <AlertTriangle className="w-3.5 h-3.5" /> Pegadinha VUNESP
                      </div>
                      <p className="text-xs leading-relaxed text-red-100 font-medium">
                        {item.pegadinha}
                      </p>
                    </div>

                    {/* Exibição da Imagem Anexada (se houver) */}
                    {item.imagem_url && (
                      <div className="pt-2 border-t border-white/10">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Esquema Visual Anexado:</span>
                        <a href={item.imagem_url} target="_blank" rel="noopener noreferrer">
                          <img 
                            src={item.imagem_url} 
                            alt="Esquema do Mapa" 
                            className="w-full h-36 object-cover rounded-xl border border-white/20 hover:opacity-90 transition-opacity cursor-pointer"
                          />
                        </a>
                      </div>
                    )}

                  </div>
                </div>

                <div className="pt-4 mt-6 border-t border-white/10 flex justify-between items-center text-[11px] font-bold opacity-70">
                  <span>Banco de Dados</span>
                  <span className="uppercase tracking-widest text-[9px]">TJSP 2026</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      {/* MODAL: Adicionar via JSON com Upload de Imagem */}
      {modalJsonOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-xl p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Network className="w-5 h-5 text-red-500" />
                Adicionar Novo Mapa (JSON) & Imagem
              </h3>
              <button 
                onClick={() => setModalJsonOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">
                  1. Copie o prompt otimizado:
                </span>
                <button
                  onClick={copiarPrompt}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-semibold"
                >
                  {copiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiado ? 'Copiado!' : 'Copiar Prompt'}
                </button>
              </div>
              <pre className="text-[11px] font-mono text-zinc-300 bg-black/40 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-36">
                {promptIaRecomendado}
              </pre>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                2. Cole o JSON gerado abaixo:
              </span>
              <textarea 
                rows={6}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={`{\n  "materia": "Raciocínio Lógico",\n  "titulo": "Equivalência e Negação",\n  "nucleo": "Contrapositiva e Regra do Neymar",\n  "fundamento": "Inverte e nega tudo ou nega a primeira com 'ou'",\n  "pegadinha": "Confundir equivalência com negação direta",\n  "cor": "azul"\n}`}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-100 focus:outline-none focus:border-red-600 transition-colors"
              />
            </div>

            {/* Upload de Imagem do Mapa */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-red-500" /> 3. Anexar Print do Mapa Mental (Opcional):
              </span>
              <div className="flex items-center gap-3">
                <label className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 cursor-pointer transition-all">
                  <Upload className="w-4 h-4 text-red-500" />
                  {uploadingImage ? 'Enviando imagem...' : 'Escolher do Computador'}
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} className="hidden" />
                </label>
                {imagemUrlTemp && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                    <Check className="w-3.5 h-3.5" /> Imagem anexada!
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-zinc-900">
              <button 
                onClick={() => setModalJsonOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-300 hover:bg-zinc-800 text-xs font-semibold cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAdicionarJson}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-lg shadow-red-600/20 flex items-center gap-2 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" /> Salvar no Banco
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edição com Upload de Imagem */}
      {mapaEmEdicao && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Network className="w-5 h-5 text-red-500" />
                Editar Mapa Mental & Imagem
              </h3>
              <button 
                onClick={() => setMapaEmEdicao(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarEdicao} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-zinc-400 font-semibold">Título</label>
                <input 
                  type="text"
                  value={mapaEmEdicao.titulo}
                  onChange={(e) => setMapaEmEdicao({...mapaEmEdicao, titulo: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-zinc-100 focus:outline-none focus:border-red-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-zinc-400 font-semibold">Matéria</label>
                  <input 
                    type="text"
                    value={mapaEmEdicao.materia}
                    onChange={(e) => setMapaEmEdicao({...mapaEmEdicao, materia: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-zinc-100 focus:outline-none focus:border-red-600"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-zinc-400 font-semibold">Cor</label>
                  <select 
                    value={mapaEmEdicao.cor}
                    onChange={(e) => setMapaEmEdicao({...mapaEmEdicao, cor: e.target.value as any})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-zinc-100 focus:outline-none focus:border-red-600"
                  >
                    <option value="azul">Azul</option>
                    <option value="verde">Verde</option>
                    <option value="amarelo">Amarelo</option>
                    <option value="rosa">Rosa</option>
                    <option value="laranja">Laranja</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sky-400 font-semibold">Núcleo Central</label>
                <textarea 
                  rows={2}
                  value={mapaEmEdicao.nucleo}
                  onChange={(e) => setMapaEmEdicao({...mapaEmEdicao, nucleo: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-zinc-100 focus:outline-none focus:border-red-600 leading-relaxed"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-emerald-400 font-semibold">Fundamento Correto</label>
                <textarea 
                  rows={2}
                  value={mapaEmEdicao.fundamento}
                  onChange={(e) => setMapaEmEdicao({...mapaEmEdicao, fundamento: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-zinc-100 focus:outline-none focus:border-red-600 leading-relaxed"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-red-400 font-semibold">Pegadinha VUNESP</label>
                <textarea 
                  rows={2}
                  value={mapaEmEdicao.pegadinha}
                  onChange={(e) => setMapaEmEdicao({...mapaEmEdicao, pegadinha: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-zinc-100 focus:outline-none focus:border-red-600 leading-relaxed"
                  required
                />
              </div>

              {/* Upload de Imagem na Edição */}
              <div className="space-y-2">
                <label className="text-zinc-400 font-semibold block">Alterar / Adicionar Imagem do Mapa Mental</label>
                <div className="flex items-center gap-3">
                  <label className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 cursor-pointer transition-all">
                    <Upload className="w-4 h-4 text-red-500" />
                    {uploadingImage ? 'Enviando...' : 'Escolher Arquivo'}
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} className="hidden" />
                  </label>
                  {mapaEmEdicao.imagem_url && (
                    <span className="text-xs text-emerald-400 font-semibold">Imagem ativa no mapa</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setMapaEmEdicao(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-300 hover:bg-zinc-800 font-semibold cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-600/20 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Save className="w-4 h-4" /> Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}