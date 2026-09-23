'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { supabase } from '@/lib/supabase';
import { BookMarked, Pin, CheckCircle2, Clock, AlertCircle, Edit3, Trash2, Code, X, Save, Copy, Check, Loader2, MessageSquare, Highlighter, Filter, Search } from 'lucide-react';

interface PostIt {
  id: string;
  user_id?: string;
  materia: string;
  assunto?: string;
  categoria: string;
  titulo: string;
  conteudo: string;
  status: 'Pendente' | 'Revisando' | 'Dominada';
  cor: 'amarelo' | 'azul' | 'verde' | 'rosa' | 'laranja';
  comentarios?: string;
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

const CORES_MARCA_TEXTO = [
  { name: 'Vermelho TJSP', tag: 'bg-red-600 text-white px-1 py-0.5 rounded font-bold', hex: '#dc2626' },
  { name: 'Amarelo', tag: 'bg-yellow-400 text-zinc-950 px-1 py-0.5 rounded font-bold', hex: '#facc15' },
  { name: 'Verde', tag: 'bg-emerald-600 text-white px-1 py-0.5 rounded font-bold', hex: '#059669' },
  { name: 'Azul', tag: 'bg-blue-600 text-white px-1 py-0.5 rounded font-bold', hex: '#2563eb' },
];

export default function CadernoRevisaoPage() {
  const router = useRouter();
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODAS AS MATÉRIAS');
  const [filtroAssunto, setFiltroAssunto] = useState<string>('');
  const [buscaTitulo, setBuscaTitulo] = useState<string>('');
  const [postits, setPostits] = useState<PostIt[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [modalJsonOpen, setModalJsonOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [postitEmEdicao, setPostitEmEdicao] = useState<PostIt | null>(null);
  
  const [comentariosAbertos, setComentariosAbertos] = useState<{ [key: string]: boolean }>({});
  const [textoComentarioTemp, setTextoComentarioTemp] = useState<{ [key: string]: string }>({});

  const textareaEdicaoRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    async function carregarDados() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/');
          return;
        }
        setUserId(session.user.id);

        const { data, error } = await supabase
          .from('caderno_revisao')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) setPostits(data);
      } catch (err) {
        console.error('Erro ao carregar caderno:', err);
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, [router]);

  const dominadasCount = postits.filter(p => p.status === 'Dominada').length;

  const postitsFiltrados = postits.filter(item => {
    const matchMateria = filtroCategoria === 'TODAS AS MATÉRIAS' || 
      item.materia.toLowerCase() === filtroCategoria.toLowerCase() || 
      item.categoria.toLowerCase() === filtroCategoria.toLowerCase();
      
    const matchAssunto = filtroAssunto.trim() === '' || 
      (item.assunto && item.assunto.toLowerCase().includes(filtroAssunto.toLowerCase().trim()));
      
    const matchBusca = item.titulo.toLowerCase().includes(buscaTitulo.toLowerCase().trim());

    return matchMateria && matchAssunto && matchBusca;
  });

  const aplicarDestaqueNoEditor = (colorClass: string) => {
    if (!postitEmEdicao || !textareaEdicaoRef.current) return;
    const textarea = textareaEdicaoRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start === end) {
      alert('Selecione um trecho do texto no campo de conteúdo para aplicar o marca-texto.');
      return;
    }

    const textoAtual = postitEmEdicao.conteudo;
    const selecionado = textoAtual.substring(start, end);
    
    const textoModificado = 
      textoAtual.substring(0, start) + 
      `<mark class="${colorClass}">${selecionado}</mark>` + 
      textoAtual.substring(end);

    setPostitEmEdicao({ ...postitEmEdicao, conteudo: textoModificado });
  };

  const limparDestaquesNoEditor = () => {
    if (!postitEmEdicao || !textareaEdicaoRef.current) return;
    const textarea = textareaEdicaoRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const textoAtual = postitEmEdicao.conteudo;
    const selecionado = textoAtual.substring(start, end);
    const limpo = selecionado.replace(/<\/?mark[^>]*>/g, '');

    const textoModificado = 
      textoAtual.substring(0, start) + 
      limpo + 
      textoAtual.substring(end);

    setPostitEmEdicao({ ...postitEmEdicao, conteudo: textoModificado });
  };

  const handleSalvarComentarioRodape = async (itemId: string) => {
    const textoComentario = textoComentarioTemp[itemId];
    if (!textoComentario) return;

    const itemAlvo = postits.find(p => p.id === itemId);
    if (!itemAlvo) return;

    const novoComentarioCompleto = itemAlvo.comentarios 
      ? `${itemAlvo.comentarios}\n\n- ${textoComentario}` 
      : `- ${textoComentario}`;

    try {
      const { error } = await supabase
        .from('caderno_revisao')
        .update({ comentarios: novoComentarioCompleto })
        .eq('id', itemId);

      if (error) throw error;

      setPostits(postits.map(p => p.id === itemId ? { ...p, comentarios: novoComentarioCompleto } : p));
      setTextoComentarioTemp({ ...textoComentarioTemp, [itemId]: '' });
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar comentário.');
    }
  };

  const handleAdicionarJson = async () => {
    if (!userId) return;
    try {
      let rawInput = jsonInput.trim();
      const startIdx = rawInput.indexOf('{');
      const endIdx = rawInput.lastIndexOf('}');

      if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
        throw new Error('Estrutura JSON não encontrada.');
      }

      const cleanJsonString = rawInput.substring(startIdx, endIdx + 1);
      const parsed = JSON.parse(cleanJsonString);

      const novoItem = {
        user_id: userId,
        materia: parsed.materia || 'Direito Constitucional',
        assunto: parsed.assunto || parsed.topico || null,
        categoria: parsed.categoria || 'TJSP',
        titulo: parsed.titulo || 'Resumo de Erros',
        conteudo: parsed.conteudo || parsed.resumo || 'Sem conteúdo especificado.',
        status: parsed.status || 'Pendente',
        cor: parsed.cor || 'amarelo'
      };

      const { data, error } = await supabase
        .from('caderno_revisao')
        .insert([novoItem])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        setPostits([data[0], ...postits]);
      }

      setJsonInput('');
      setModalJsonOpen(false);
      alert('Resumo salvo com sucesso no Banco!');
    } catch (err) {
      console.error('Erro ao processar JSON:', err);
      alert('Erro no formato JSON. Verifique se você colou apenas o objeto JSON gerado pela IA.');
    }
  };

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postitEmEdicao) return;

    try {
      const { error } = await supabase
        .from('caderno_revisao')
        .update({
          titulo: postitEmEdicao.titulo,
          conteudo: postitEmEdicao.conteudo,
          status: postitEmEdicao.status,
          cor: postitEmEdicao.cor,
          materia: postitEmEdicao.materia,
          assunto: postitEmEdicao.assunto?.trim() || null
        })
        .eq('id', postitEmEdicao.id);

      if (error) throw error;

      setPostits(postits.map(p => p.id === postitEmEdicao.id ? postitEmEdicao : p));
      setPostitEmEdicao(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar post-it.');
    }
  };

  const handleRemover = async (id: string) => {
    if (confirm('Deseja excluir permanentemente este resumo?')) {
      try {
        const { error } = await supabase.from('caderno_revisao').delete().eq('id', id);
        if (error) throw error;
        setPostits(postits.filter(p => p.id !== id));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const promptIaRecomendado = `Com base nos meus erros nas questões, crie um resumo objetivo e estruturado em tópicos adaptado para o concurso de Escrevente do TJSP. O retorno deve ser estritamente em formato de objeto JSON puro, seguindo exatamente esta estrutura:

{
  "materia": "Nome exato da matéria",
  "assunto": "Assunto ou tópico específico",
  "categoria": "TJSP",
  "titulo": "Título curto focado no tema",
  "conteudo": "1. Primeiro ponto essencial.\n\n2. Segundo ponto essencial.",
  "status": "Pendente",
  "cor": "amarelo"
}`;

  const copiarPrompt = () => {
    navigator.clipboard.writeText(promptIaRecomendado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const getCorPostIt = (cor: string) => {
    switch (cor) {
      case 'amarelo': return 'bg-amber-100 text-zinc-900 border-amber-300';
      case 'rosa': return 'bg-rose-100 text-zinc-900 border-rose-300';
      case 'verde': return 'bg-emerald-100 text-zinc-900 border-emerald-300';
      case 'azul': return 'bg-sky-100 text-zinc-900 border-sky-300';
      case 'laranja': return 'bg-orange-100 text-zinc-900 border-orange-300';
      default: return 'bg-amber-100 text-zinc-900 border-amber-300';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Dominada':
        return <span className="bg-emerald-900/90 text-emerald-100 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold"><CheckCircle2 className="w-3 h-3" /> Dominada</span>;
      case 'Revisando':
        return <span className="bg-amber-900/90 text-amber-100 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold"><Clock className="w-3 h-3" /> Revisando</span>;
      default:
        return <span className="bg-zinc-800 text-zinc-300 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold"><AlertCircle className="w-3 h-3" /> Pendente</span>;
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-red-600 selection:text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-950/60 border border-red-600/50 flex items-center justify-center text-red-500 shadow-lg shadow-red-950/50 shrink-0">
              <BookMarked className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">CADERNO DE REVISÃO</h1>
                <span className="bg-red-950/80 border border-red-600/40 text-red-400 text-xs px-2.5 py-0.5 rounded-lg font-bold">TJSP Escrevente</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">Cards interativos com Marca-Texto direto no Editor e Comentários</p>
            </div>
          </div>

          <button 
            onClick={() => setModalJsonOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-red-600/20 flex items-center gap-2 transition-all cursor-pointer w-full md:w-auto justify-center"
          >
            <Code className="w-4 h-4" /> Adicionar Resumo (JSON)
          </button>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto w-full pb-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            {MATERIAS_TJSP.map((cat) => (
              <button
                key={cat}
                onClick={() => setFiltroCategoria(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  filtroCategoria === cat ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-zinc-900">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text"
                placeholder="Filtrar por assunto (ex: Art. 5º, Crase)..."
                value={filtroAssunto}
                onChange={(e) => setFiltroAssunto(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-100 focus:outline-none focus:border-red-600 transition-colors"
              />
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text"
                placeholder="Buscar resumo pelo título..."
                value={buscaTitulo}
                onChange={(e) => setBuscaTitulo(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-100 focus:outline-none focus:border-red-600 transition-colors"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            <p className="text-xs text-zinc-400">Carregando seus resumos...</p>
          </div>
        ) : postits.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-16 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
              <Code className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Nenhum resumo cadastrado</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">Clique em "Adicionar Resumo (JSON)" para injetar resumos.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {postitsFiltrados.map((item) => {
              const idCard = item.id;
              const isComentarioOpen = comentariosAbertos[idCard] || false;

              return (
                <div key={idCard} className={`rounded-2xl border shadow-xl flex flex-col justify-between transition-transform duration-200 hover:-translate-y-1 relative group overflow-hidden ${getCorPostIt(item.cor)}`}>
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity bg-black/10 p-1 rounded-lg backdrop-blur-xs">
                    <button onClick={() => setPostitEmEdicao(item)} title="Editar Card" className="p-1 rounded hover:bg-black/20 text-zinc-900 transition-colors cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleRemover(idCard)} title="Remover" className="p-1 rounded hover:bg-rose-600 hover:text-white text-zinc-900 transition-colors cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex justify-between items-center pr-12 flex-wrap gap-1">
                      <span className="text-[10px] uppercase font-black tracking-widest opacity-70">{item.categoria}</span>
                      {getStatusBadge(item.status)}
                    </div>

                    {item.assunto && (
                      <div>
                        <span className="text-[10px] font-bold bg-black/10 px-2 py-0.5 rounded text-zinc-800">{item.assunto}</span>
                      </div>
                    )}

                    <h3 className="text-base font-black tracking-tight">{item.titulo}</h3>

                    <div className="max-h-[260px] overflow-y-auto pr-1 space-y-3 scrollbar-thin bg-black/5 p-2.5 rounded-xl border border-black/10">
                      <div className="text-xs leading-relaxed opacity-90 whitespace-pre-line" dangerouslySetInnerHTML={{ __html: item.conteudo || '' }} />
                    </div>
                  </div>

                  <div className="bg-black/10 border-t border-black/10 px-4 py-2.5 flex items-center justify-between text-xs">
                    <button onClick={() => setComentariosAbertos({ ...comentariosAbertos, [idCard]: !isComentarioOpen })} className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${isComentarioOpen ? 'bg-zinc-900 text-white shadow-md' : 'bg-black/20 text-zinc-900 hover:bg-black/30'}`}>
                      <MessageSquare className="w-3.5 h-3.5" /> Comentários {item.comentarios ? '• (Salvo)' : ''}
                    </button>
                    <span className="text-[10px] font-bold opacity-70 truncate max-w-[120px]" title={item.materia}>{item.materia}</span>
                  </div>

                  {isComentarioOpen && (
                    <div className="bg-zinc-950 text-zinc-100 border-t border-zinc-800 p-4 space-y-3 animate-in fade-in duration-200">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5 text-red-500" /> Anotações</h4>
                      {item.comentarios && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">{item.comentarios}</div>
                      )}
                      <div className="space-y-2">
                        <textarea rows={2} placeholder="Adicionar anotação..." value={textoComentarioTemp[idCard] || ''} onChange={(e) => setTextoComentarioTemp({ ...textoComentarioTemp, [idCard]: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-red-600" />
                        <div className="flex justify-end">
                          <button onClick={() => handleSalvarComentarioRodape(idCard)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] rounded-lg shadow-md flex items-center gap-1.5 cursor-pointer"><Save className="w-3 h-3" /> Salvar</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL EDITAR */}
      {postitEmEdicao && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2"><Edit3 className="w-5 h-5 text-red-500" /> Editar Resumo</h3>
              <button onClick={() => setPostitEmEdicao(null)} className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-900 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSalvarEdicao} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-zinc-400 font-semibold">Título</label>
                <input type="text" value={postitEmEdicao.titulo} onChange={(e) => setPostitEmEdicao({...postitEmEdicao, titulo: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-zinc-100 focus:outline-none focus:border-red-600" required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-zinc-400 font-semibold">Matéria</label>
                  <select value={postitEmEdicao.materia} onChange={(e) => setPostitEmEdicao({...postitEmEdicao, materia: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-zinc-100 focus:outline-none focus:border-red-600">
                    {MATERIAS_TJSP.filter(m => m !== 'TODAS AS MATÉRIAS').map(m => (<option key={m} value={m}>{m}</option>))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-zinc-400 font-semibold">Assunto / Tópico</label>
                  <input type="text" value={postitEmEdicao.assunto || ''} onChange={(e) => setPostitEmEdicao({...postitEmEdicao, assunto: e.target.value})} placeholder="Ex: Art. 5º, Crase..." className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-zinc-100 focus:outline-none focus:border-red-600" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-zinc-400 font-semibold">Status</label>
                  <select value={postitEmEdicao.status} onChange={(e) => setPostitEmEdicao({...postitEmEdicao, status: e.target.value as any})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-zinc-100 focus:outline-none focus:border-red-600">
                    <option value="Pendente">Pendente</option>
                    <option value="Revisando">Revisando</option>
                    <option value="Dominada">Dominada</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-zinc-400 font-semibold">Cor</label>
                  <select value={postitEmEdicao.cor} onChange={(e) => setPostitEmEdicao({...postitEmEdicao, cor: e.target.value as any})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-zinc-100 focus:outline-none focus:border-red-600">
                    <option value="amarelo">Amarelo</option>
                    <option value="rosa">Rosa</option>
                    <option value="verde">Verde</option>
                    <option value="azul">Azul</option>
                    <option value="laranja">Laranja</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t border-zinc-900">
                <div className="flex justify-between items-center">
                  <label className="text-zinc-300 font-bold flex items-center gap-1.5"><Highlighter className="w-3.5 h-3.5 text-red-500" /> Conteúdo</label>
                  <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                    {CORES_MARCA_TEXTO.map((cor) => (
                      <button key={cor.name} type="button" onClick={() => aplicarDestaqueNoEditor(cor.tag)} className={`text-[10px] px-2 py-1 rounded font-bold cursor-pointer ${cor.tag}`}>{cor.name}</button>
                    ))}
                    <button type="button" onClick={limparDestaquesNoEditor} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] px-2 py-1 rounded font-semibold cursor-pointer">Limpar</button>
                  </div>
                </div>
                <textarea ref={textareaEdicaoRef} rows={8} value={postitEmEdicao.conteudo} onChange={(e) => setPostitEmEdicao({...postitEmEdicao, conteudo: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-zinc-100 font-mono text-xs focus:outline-none focus:border-red-600 leading-relaxed" required />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-900">
                <button type="button" onClick={() => setPostitEmEdicao(null)} className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-300 hover:bg-zinc-800 text-xs font-semibold cursor-pointer">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-lg shadow-red-600/20 flex items-center gap-2 cursor-pointer"><Save className="w-4 h-4" /> Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL JSON */}
      {modalJsonOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-xl p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2"><Code className="w-5 h-5 text-red-500" /> Adicionar Resumo (JSON)</h3>
              <button onClick={() => setModalJsonOpen(false)} className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-900 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-red-400 uppercase">1. Copie o prompt:</span>
                <button onClick={copiarPrompt} className="bg-zinc-800 text-zinc-200 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer font-semibold">{copiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}{copiado ? 'Copiado!' : 'Copiar'}</button>
              </div>
              <pre className="text-[11px] font-mono text-zinc-300 bg-black/40 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{promptIaRecomendado}</pre>
            </div>
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">2. Cole o JSON:</span>
              <textarea rows={6} value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} placeholder={`{\n  "materia": "Direito Constitucional",\n  "assunto": "Art. 5º",\n  "categoria": "TJSP",\n  "titulo": "Direitos",\n  "conteudo": "Texto",\n  "status": "Pendente",\n  "cor": "amarelo"\n}`} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-100 focus:outline-none focus:border-red-600" />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-zinc-900">
              <button onClick={() => setModalJsonOpen(false)} className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-300 text-xs font-semibold cursor-pointer">Cancelar</button>
              <button onClick={handleAdicionarJson} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-lg shadow-red-600/20 flex items-center gap-2 cursor-pointer"><Code className="w-4 h-4" /> Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}