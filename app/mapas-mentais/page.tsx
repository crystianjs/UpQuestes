'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { supabase } from '@/lib/supabase';
import { Network, Plus, Search, Trash2, X, Save, Loader2, Upload, Edit3 } from 'lucide-react';

interface MapaMentalItem {
  id: string;
  user_id?: string;
  materia: string;
  titulo: string;
  imagem_url?: string;
  cor?: string;
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

  // Estados do Modal de Adicionar
  const [modalOpen, setModalOpen] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaMateria, setNovaMateria] = useState('Raciocínio Lógico');
  const [imagemUrlTemp, setImagemUrlTemp] = useState('');

  // Estado de Edição
  const [mapaEmEdicao, setMapaEmEdicao] = useState<MapaMentalItem | null>(null);

  // Estado de upload de imagem
  const [uploadingImage, setUploadingImage] = useState(false);

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

  const mapasFiltrados = mapas.filter(item => {
    const matchMateria = filtroMateria === 'TODAS AS MATÉRIAS' || item.materia.toLowerCase() === filtroMateria.toLowerCase();
    const matchBusca = item.titulo.toLowerCase().includes(busca.toLowerCase());
    return matchMateria && matchBusca;
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdicao = false) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      
      if (!['jpg', 'jpeg', 'png'].includes(fileExt || '')) {
        alert('Por favor, envie apenas arquivos nos formatos JPG, JPEG ou PNG.');
        setUploadingImage(false);
        return;
      }

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
    } catch (err) {
      console.error('Erro no upload da imagem:', err);
      alert('Erro ao enviar imagem. Verifique o bucket no Supabase.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAdicionarMapa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    if (!imagemUrlTemp) {
      alert('Por favor, faça o upload de uma imagem para o mapa mental.');
      return;
    }

    try {
      const novoItem = {
        user_id: userId,
        materia: novaMateria,
        titulo: novoTitulo,
        imagem_url: imagemUrlTemp,
        cor: 'branco'
      };

      const { data, error } = await supabase
        .from('mapas_mentais')
        .insert([novoItem])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        setMapas([data[0], ...mapas]);
      }

      setNovoTitulo('');
      setImagemUrlTemp('');
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar mapa mental.');
    }
  };

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapaEmEdicao) return;

    try {
      const { error } = await supabase
        .from('mapas_mentais')
        .update({
          titulo: mapaEmEdicao.titulo,
          materia: mapaEmEdicao.materia,
          imagem_url: mapaEmEdicao.imagem_url,
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

  const handleRemover = async (id: string) => {
    if (confirm('Deseja excluir permanentemente este mapa mental?')) {
      try {
        const { error } = await supabase.from('mapas_mentais').delete().eq('id', id);
        if (error) throw error;
        setMapas(mapas.filter(p => p.id !== id));
      } catch (err) {
        console.error(err);
        alert('Erro ao excluir mapa mental.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-red-600 selection:text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Cabeçalho */}
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-950/60 border border-red-600/40 flex items-center justify-center text-red-500 shadow-lg shadow-red-950/50 shrink-0">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                  MAPAS MENTAIS TJSP
                </h1>
                <span className="bg-red-950/80 border border-red-600/40 text-red-400 text-xs px-2.5 py-0.5 rounded-lg font-bold">
                  VUNESP
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Esquemas visuais focados no padrão de cobrança da banca
              </p>
            </div>
          </div>

          <button 
            onClick={() => setModalOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-red-600/20 flex items-center gap-2 transition-all cursor-pointer w-full md:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            Novo Mapa Mental
          </button>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 overflow-x-auto w-full pb-2 lg:pb-0 scrollbar-thin">
            {MATERIAS_TJSP.map((cat) => (
              <button
                key={cat}
                onClick={() => setFiltroMateria(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  filtroMateria === cat
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/80'
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
              placeholder="Buscar mapa pelo título..."
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
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-16 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
              <Network className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Nenhum mapa mental encontrado</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Adicione o seu primeiro print gerado pelo prompt da VUNESP.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mapasFiltrados.map((item) => (
              <div 
                key={item.id}
                className="bg-[#fcfbf9] text-zinc-950 border border-zinc-300 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all duration-200 group relative"
              >
                {/* Topo do Card: Matéria e Ações Discretas */}
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 bg-red-100 px-3 py-1 rounded-md">
                    {item.materia}
                  </span>

                  <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setMapaEmEdicao(item)}
                      title="Editar"
                      className="p-1.5 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-700 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleRemover(item.id)}
                      title="Excluir"
                      className="p-1.5 rounded-lg bg-zinc-200 hover:bg-rose-200 text-zinc-700 hover:text-rose-700 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Título do Mapa */}
                <div className="mb-4">
                  <h3 className="text-lg font-black tracking-tight text-zinc-900 leading-snug">
                    {item.titulo}
                  </h3>
                </div>

                {/* Imagem em Tamanho Amplo (Estilo Caderno) */}
                {item.imagem_url && (
                  <div className="relative rounded-xl overflow-hidden border border-zinc-300 bg-white shadow-inner">
                    <a href={item.imagem_url} target="_blank" rel="noopener noreferrer">
                      <img 
                        src={item.imagem_url} 
                        alt={item.titulo} 
                        className="w-full h-auto max-h-[500px] object-contain hover:scale-[1.01] transition-transform duration-300 cursor-pointer mx-auto bg-white p-1"
                      />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </main>

      {/* MODAL: Adicionar Novo Mapa */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Network className="w-5 h-5 text-red-500" />
                Adicionar Novo Mapa Mental
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdicionarMapa} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-zinc-400 font-semibold">Título do Mapa</label>
                <input 
                  type="text"
                  value={novoTitulo}
                  onChange={(e) => setNovoTitulo(e.target.value)}
                  placeholder="Ex: Regra Geral de Crase"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-zinc-100 focus:outline-none focus:border-red-600"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-400 font-semibold">Matéria</label>
                <select 
                  value={novaMateria}
                  onChange={(e) => setNovaMateria(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-zinc-100 focus:outline-none focus:border-red-600"
                >
                  {MATERIAS_TJSP.filter(m => m !== 'TODAS AS MATÉRIAS').map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-zinc-400 font-semibold block">Print do Mapa Mental (JPG, PNG, JPEG)</label>
                <label className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs px-4 py-3 rounded-xl font-semibold flex items-center gap-2 cursor-pointer transition-all w-full justify-center">
                  <Upload className="w-4 h-4 text-red-500" />
                  {uploadingImage ? 'Enviando imagem...' : 'Selecionar Print do Computador'}
                  <input type="file" accept=".jpg, .jpeg, .png" onChange={(e) => handleImageUpload(e, false)} className="hidden" />
                </label>
                {imagemUrlTemp && (
                  <div className="mt-2 space-y-1">
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      ✓ Imagem carregada com sucesso!
                    </span>
                    <img src={imagemUrlTemp} alt="Pré-visualização" className="w-full h-40 object-contain bg-white rounded-lg border border-zinc-800 p-1" />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900">
                <button 
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-300 hover:bg-zinc-800 font-semibold cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-600/20 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" /> Salvar Mapa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edição */}
      {mapaEmEdicao && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Network className="w-5 h-5 text-red-500" />
                Editar Mapa Mental
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

              <div className="space-y-1.5">
                <label className="text-zinc-400 font-semibold">Matéria</label>
                <select 
                  value={mapaEmEdicao.materia}
                  onChange={(e) => setMapaEmEdicao({...mapaEmEdicao, materia: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-zinc-100 focus:outline-none focus:border-red-600"
                >
                  {MATERIAS_TJSP.filter(m => m !== 'TODAS AS MATÉRIAS').map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-zinc-400 font-semibold block">Alterar Print (JPG, PNG, JPEG)</label>
                <label className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs px-4 py-3 rounded-xl font-semibold flex items-center gap-2 cursor-pointer transition-all w-full justify-center">
                  <Upload className="w-4 h-4 text-red-500" />
                  {uploadingImage ? 'Enviando...' : 'Escolher Novo Print'}
                  <input type="file" accept=".jpg, .jpeg, .png" onChange={(e) => handleImageUpload(e, true)} className="hidden" />
                </label>
                {mapaEmEdicao.imagem_url && (
                  <div className="mt-2">
                    <img src={mapaEmEdicao.imagem_url} alt="Atual" className="w-full h-40 object-contain bg-white rounded-lg border border-zinc-800 p-1" />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900">
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