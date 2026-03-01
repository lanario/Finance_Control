'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Image from 'next/image'
import MainLayoutEmpresarial from '@/components/Layout/MainLayoutEmpresarial'
import { supabaseEmpresarial as supabase } from '@/lib/supabase/empresarial'
import { useAuth } from '@/app/empresarial/providers'
import {
  FiPlus,
  FiX,
  FiPackage,
  FiLayers,
  FiTrash2,
  FiEye,
  FiDollarSign,
  FiImage,
  FiFolderPlus,
  FiFolder,
  FiEdit2,
  FiChevronDown,
  FiChevronRight,
} from 'react-icons/fi'

interface Categoria {
  id: string
  nome: string
  cor: string
  tipo: string
}

interface GrupoProduto {
  id: string
  nome: string
  ordem: number
}

interface GrupoServico {
  id: string
  nome: string
  ordem: number
}

interface Produto {
  id: string
  nome: string
  valor_unitario: number
  preco_custo?: number | null
  categoria_id: string | null
  grupo_produto_id?: string | null
  descricao?: string | null
  foto_url?: string | null
  ativo?: boolean
  categoria_nome?: string | null
  categoria_cor?: string | null
  grupo_nome?: string | null
}

interface Servico {
  id: string
  nome: string
  valor_unitario: number
  categoria_id: string | null
  grupo_servico_id?: string | null
  descricao?: string | null
  foto_url?: string | null
  ativo?: boolean
  categoria_nome?: string | null
  categoria_cor?: string | null
  grupo_nome?: string | null
}

const BUCKET_ITENS = 'itens'

export default function ProdutosServicosPage() {
  const { session } = useAuth()
  const [abaAtiva, setAbaAtiva] = useState<'produtos' | 'servicos' | 'grupos'>('produtos')
  const [tipoGrupoCriar, setTipoGrupoCriar] = useState<'produto' | 'servico'>('produto')
  const [editingGrupo, setEditingGrupo] = useState<{ tipo: 'produto' | 'servico'; id: string; nome: string } | null>(null)
  const [showModalEditarGrupo, setShowModalEditarGrupo] = useState(false)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [gruposProdutos, setGruposProdutos] = useState<GrupoProduto[]>([])
  const [gruposServicos, setGruposServicos] = useState<GrupoServico[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showModalGrupo, setShowModalGrupo] = useState(false)
  const [editingItem, setEditingItem] = useState<Produto | Servico | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [formGrupoNome, setFormGrupoNome] = useState('')

  const [formProduto, setFormProduto] = useState({
    nome: '',
    descricao: '',
    valor_unitario: '',
    preco_custo: '',
    categoria_id: '',
    grupo_produto_id: '',
  })
  const [formServico, setFormServico] = useState({
    nome: '',
    descricao: '',
    valor_unitario: '',
    categoria_id: '',
    grupo_servico_id: '',
  })
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [expandedGrupos, setExpandedGrupos] = useState<Record<string, boolean>>({})

  const userId = session?.user?.id

  const loadCategorias = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('categorias')
      .select('id, nome, cor, tipo')
      .eq('user_id', userId)
      .eq('tipo', 'receita')
      .eq('ativo', true)
      .order('nome')
    setCategorias((data as Categoria[]) || [])
  }, [userId])

  const loadGruposProdutos = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('grupo_produtos')
      .select('id, nome, ordem')
      .eq('user_id', userId)
      .order('ordem')
      .order('nome')
    setGruposProdutos((data as GrupoProduto[]) || [])
  }, [userId])

  const loadGruposServicos = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('grupo_servicos')
      .select('id, nome, ordem')
      .eq('user_id', userId)
      .order('ordem')
      .order('nome')
    setGruposServicos((data as GrupoServico[]) || [])
  }, [userId])

  const loadProdutos = useCallback(async () => {
    if (!userId) return
    let produtosData: (Produto & { grupo_produto_id?: string | null })[] | null = null
    let { data, error: produtosError } = await supabase
      .from('produtos')
      .select('id, nome, valor_unitario, preco_custo, categoria_id, descricao, foto_url, ativo, grupo_produto_id')
      .eq('user_id', userId)
      .order('nome')
    if (produtosError) {
      const res = await supabase
        .from('produtos')
        .select('id, nome, valor_unitario, preco_custo, categoria_id, descricao, foto_url, ativo')
        .eq('user_id', userId)
        .order('nome')
      produtosError = res.error
      produtosData = (res.data || []).map((p) => ({ ...p, grupo_produto_id: null }))
    } else {
      produtosData = data || []
    }
    if (produtosError) {
      console.error('Erro ao carregar produtos:', produtosError)
      setProdutos([])
      return
    }

    const { data: catsData } = await supabase
      .from('categorias')
      .select('id, nome, cor')
      .eq('user_id', userId)
      .eq('tipo', 'receita')
    const cats = (catsData as Categoria[]) || []
    const mapNome = new Map(cats.map((c) => [c.id, c.nome]))
    const mapCor = new Map(cats.map((c) => [c.id, c.cor]))

    const { data: gruposData } = await supabase
      .from('grupo_produtos')
      .select('id, nome')
      .eq('user_id', userId)
    const mapGrupoNome = new Map((gruposData as { id: string; nome: string }[] || []).map((g) => [g.id, g.nome]))

    const list = (produtosData || []) as (Produto & { foto_url?: string | null })[]
    setProdutos(
      list.map((p) => ({
        ...p,
        foto_url: p.foto_url ?? null,
        categoria_nome: p.categoria_id ? mapNome.get(p.categoria_id) ?? null : null,
        categoria_cor: p.categoria_id ? mapCor.get(p.categoria_id) ?? null : null,
        grupo_nome: p.grupo_produto_id ? mapGrupoNome.get(p.grupo_produto_id) ?? null : null,
      }))
    )
  }, [userId])

  const loadServicos = useCallback(async () => {
    if (!userId) return
    let servicosData: (Servico & { grupo_servico_id?: string | null })[] | null = null
    let { data, error: servicosError } = await supabase
      .from('servicos')
      .select('id, nome, valor_unitario, categoria_id, descricao, ativo, grupo_servico_id')
      .eq('user_id', userId)
      .order('nome')
    if (servicosError) {
      const res = await supabase
        .from('servicos')
        .select('id, nome, valor_unitario, categoria_id, descricao, ativo')
        .eq('user_id', userId)
        .order('nome')
      servicosError = res.error
      servicosData = (res.data || []).map((s) => ({ ...s, grupo_servico_id: null }))
    } else {
      servicosData = data || []
    }
    if (servicosError) {
      console.error('Erro ao carregar serviços:', servicosError)
      setServicos([])
      return
    }

    const { data: catsData } = await supabase
      .from('categorias')
      .select('id, nome, cor')
      .eq('user_id', userId)
      .eq('tipo', 'receita')
    const cats = (catsData as Categoria[]) || []
    const mapNome = new Map(cats.map((c) => [c.id, c.nome]))
    const mapCor = new Map(cats.map((c) => [c.id, c.cor]))

    const { data: gruposData } = await supabase
      .from('grupo_servicos')
      .select('id, nome')
      .eq('user_id', userId)
    const mapGrupoNome = new Map((gruposData as { id: string; nome: string }[] || []).map((g) => [g.id, g.nome]))

    const list = (servicosData || []) as (Servico & { foto_url?: string | null })[]
    setServicos(
      list.map((s) => ({
        ...s,
        foto_url: (s as { foto_url?: string | null }).foto_url ?? null,
        categoria_nome: s.categoria_id ? mapNome.get(s.categoria_id) ?? null : null,
        categoria_cor: s.categoria_id ? mapCor.get(s.categoria_id) ?? null : null,
        grupo_nome: s.grupo_servico_id ? mapGrupoNome.get(s.grupo_servico_id) ?? null : null,
      }))
    )
  }, [userId])

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    loadCategorias().then(() => {
      loadGruposProdutos().then(() => loadGruposServicos()).then(() => {
        loadProdutos().then(() => loadServicos()).finally(() => setLoading(false))
      })
    })
  }, [userId, loadCategorias, loadGruposProdutos, loadGruposServicos, loadProdutos, loadServicos])

  function openNew() {
    setEditingItem(null)
    setFormProduto({ nome: '', descricao: '', valor_unitario: '', preco_custo: '', categoria_id: '', grupo_produto_id: '' })
    setFormServico({ nome: '', descricao: '', valor_unitario: '', categoria_id: '', grupo_servico_id: '' })
    setFotoFile(null)
    setFotoPreview(null)
    setShowModal(true)
  }

  function openNewGrupo(tipo?: 'produto' | 'servico') {
    const t = tipo ?? (abaAtiva === 'servicos' ? 'servico' : 'produto')
    setTipoGrupoCriar(t)
    setFormGrupoNome('')
    setShowModalGrupo(true)
  }

  async function handleCriarGrupo(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !formGrupoNome.trim()) return
    const nome = formGrupoNome.trim()
    const tipo = abaAtiva === 'grupos' ? tipoGrupoCriar : (abaAtiva === 'servicos' ? 'servico' : 'produto')
    const table = tipo === 'produto' ? 'grupo_produtos' : 'grupo_servicos'
    const { error } = await supabase.from(table).insert({ user_id: userId, nome })
    if (error) {
      console.error('Erro ao criar grupo:', error)
      alert('Erro ao criar grupo. Tente novamente.')
      return
    }
    setShowModalGrupo(false)
    setFormGrupoNome('')
    loadGruposProdutos()
    loadGruposServicos()
    loadProdutos()
    loadServicos()
  }

  function openEditarGrupo(tipo: 'produto' | 'servico', id: string, nome: string) {
    setEditingGrupo({ tipo, id, nome })
    setFormGrupoNome(nome)
    setShowModalEditarGrupo(true)
  }

  async function handleSalvarEdicaoGrupo(e: React.FormEvent) {
    e.preventDefault()
    if (!editingGrupo || !formGrupoNome.trim()) return
    const table = editingGrupo.tipo === 'produto' ? 'grupo_produtos' : 'grupo_servicos'
    const { error } = await supabase.from(table).update({ nome: formGrupoNome.trim() }).eq('id', editingGrupo.id)
    if (error) {
      console.error('Erro ao editar grupo:', error)
      alert('Erro ao editar grupo.')
      return
    }
    setShowModalEditarGrupo(false)
    setEditingGrupo(null)
    setFormGrupoNome('')
    loadGruposProdutos()
    loadGruposServicos()
    loadProdutos()
    loadServicos()
  }

  function handleExcluirGrupo(tipo: 'produto' | 'servico', id: string, nome: string) {
    if (!confirm(`Excluir o grupo "${nome}"? Os itens continuarão cadastrados, mas sem grupo.`)) return
    const table = tipo === 'produto' ? 'grupo_produtos' : 'grupo_servicos'
    supabase
      .from(table)
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error(error)
          alert('Erro ao excluir grupo.')
        } else {
          loadGruposProdutos()
          loadGruposServicos()
          loadProdutos()
          loadServicos()
        }
      })
  }

  function openEdit(item: Produto | Servico) {
    setEditingItem(item)
    if ('preco_custo' in item) {
      setFormProduto({
        nome: item.nome,
        descricao: item.descricao || '',
        valor_unitario: String(item.valor_unitario ?? ''),
        preco_custo: item.preco_custo != null ? String(item.preco_custo) : '',
        categoria_id: item.categoria_id || '',
        grupo_produto_id: item.grupo_produto_id || '',
      })
    } else {
      const servico = item as Servico
      setFormServico({
        nome: servico.nome,
        descricao: servico.descricao || '',
        valor_unitario: String(servico.valor_unitario ?? ''),
        categoria_id: servico.categoria_id || '',
        grupo_servico_id: servico.grupo_servico_id || '',
      })
    }
    setFotoPreview(item.foto_url || null)
    setFotoFile(null)
    setShowModal(true)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) {
      alert('Imagem deve ter no máximo 5MB.')
      return
    }
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  async function uploadFoto(itemId: string): Promise<string | null> {
    if (!userId || !fotoFile) return null
    const ext = fotoFile.name.split('.').pop() || 'jpg'
    const path = `${userId}/${abaAtiva}/${itemId}.${ext}`
    const { error } = await supabase.storage.from(BUCKET_ITENS).upload(path, fotoFile, {
      upsert: true,
      contentType: fotoFile.type,
    })
    if (error) {
      console.error('Erro upload foto:', error)
      return null
    }
    const { data: { publicUrl } } = supabase.storage.from(BUCKET_ITENS).getPublicUrl(path)
    return publicUrl
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return

    async function submit() {
      try {
        const isProduto = abaAtiva === 'produtos'
        const nome = isProduto ? formProduto.nome.trim() : formServico.nome.trim()
        const valor = isProduto
          ? parseFloat(formProduto.valor_unitario) || 0
          : parseFloat(formServico.valor_unitario) || 0
        const categoria_id = isProduto ? formProduto.categoria_id || null : formServico.categoria_id || null
        const grupo_id = isProduto ? formProduto.grupo_produto_id || null : formServico.grupo_servico_id || null
        const descricao = isProduto ? formProduto.descricao.trim() || null : formServico.descricao.trim() || null

        if (editingItem) {
          let fotoUrl: string | null = editingItem.foto_url || null
          if (fotoFile) {
            setUploadingPhoto(true)
            fotoUrl = await uploadFoto(editingItem.id)
            setUploadingPhoto(false)
          }
          const table = isProduto ? 'produtos' : 'servicos'
          const payload: Record<string, unknown> = {
            nome,
            valor_unitario: valor,
            categoria_id,
            descricao,
            updated_at: new Date().toISOString(),
          }
          if (isProduto) {
            (payload as Record<string, unknown>).preco_custo = formProduto.preco_custo ? parseFloat(formProduto.preco_custo) : null
            if (grupo_id) (payload as Record<string, unknown>).grupo_produto_id = grupo_id
          } else {
            if (grupo_id) (payload as Record<string, unknown>).grupo_servico_id = grupo_id
          }
          if (fotoUrl !== undefined) (payload as Record<string, unknown>).foto_url = fotoUrl
          const { error } = await supabase.from(table).update(payload).eq('id', editingItem.id)
          if (error) throw error
        } else {
          const insertPayload: Record<string, unknown> = {
            user_id: userId,
            nome,
            valor_unitario: valor,
            categoria_id,
            descricao,
            ativo: true,
          }
          if (isProduto) {
            insertPayload.preco_custo = formProduto.preco_custo ? parseFloat(formProduto.preco_custo) : null
            if (grupo_id) insertPayload.grupo_produto_id = grupo_id
            const { data: inserted, error } = await supabase
              .from('produtos')
              .insert(insertPayload)
              .select('id')
              .single()
            if (error) throw error
            if (fotoFile && inserted?.id) {
              setUploadingPhoto(true)
              const url = await uploadFoto(inserted.id)
              setUploadingPhoto(false)
              if (url) await supabase.from('produtos').update({ foto_url: url }).eq('id', inserted.id)
            }
          } else {
            if (grupo_id) insertPayload.grupo_servico_id = grupo_id
            const { data: inserted, error } = await supabase
              .from('servicos')
              .insert(insertPayload)
              .select('id')
              .single()
            if (error) throw error
            if (fotoFile && inserted?.id) {
              setUploadingPhoto(true)
              const url = await uploadFoto(inserted.id)
              setUploadingPhoto(false)
              if (url) {
                const { error: updateErr } = await supabase.from('servicos').update({ foto_url: url }).eq('id', inserted.id)
                if (updateErr) console.warn('Foto do serviço não salva (coluna foto_url pode não existir):', updateErr.message)
              }
            }
          }
        }
        setShowModal(false)
        setEditingItem(null)
        await loadProdutos()
        await loadServicos()
      } catch (err) {
        console.error('Erro ao salvar:', err)
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : ''
        alert(msg ? `Erro ao salvar: ${msg}` : 'Erro ao salvar. Tente novamente.')
      }
    }
    submit()
  }

  function handleDelete(item: Produto | Servico) {
    if (!confirm(`Excluir "${item.nome}"?`)) return
    const table = 'preco_custo' in item ? 'produtos' : 'servicos'
    supabase
      .from(table)
      .delete()
      .eq('id', item.id)
      .then(({ error }) => {
        if (error) {
          console.error(error)
          alert('Erro ao excluir.')
        } else {
          loadProdutos()
          loadServicos()
        }
      })
  }

  const listaAgrupada = useMemo(() => {
    const lista = abaAtiva === 'produtos' ? produtos : abaAtiva === 'servicos' ? servicos : []
    const isProduto = abaAtiva === 'produtos'
    const map = new Map<string, { key: string; nome: string; items: (Produto | Servico)[] }>()
    lista.forEach((item) => {
      const gid = isProduto ? (item as Produto).grupo_produto_id : (item as Servico).grupo_servico_id
      const key = gid || '__sem_grupo__'
      const nome = key === '__sem_grupo__' ? 'Sem grupo' : ((item as Produto).grupo_nome || (item as Servico).grupo_nome || 'Sem nome')
      if (!map.has(key)) map.set(key, { key, nome, items: [] })
      map.get(key)!.items.push(item)
    })
    const arr = Array.from(map.values())
    arr.sort((a, b) => {
      if (a.key === '__sem_grupo__') return -1
      if (b.key === '__sem_grupo__') return 1
      return a.nome.localeCompare(b.nome)
    })
    return arr
  }, [abaAtiva, produtos, servicos])

  function toggleGrupo(key: string) {
    setExpandedGrupos((prev) => ({ ...prev, [key]: prev[key] === false }))
  }

  if (loading && produtos.length === 0 && servicos.length === 0) {
    return (
      <MainLayoutEmpresarial>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse emp-text-primary text-xl">Carregando...</div>
        </div>
      </MainLayoutEmpresarial>
    )
  }

  return (
    <MainLayoutEmpresarial>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold emp-text-primary mb-2">Produtos e Serviços</h1>
            <p className="emp-text-muted">
              Cadastre produtos e serviços com foto, categoria e preços para uso em vendas e orçamentos
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {abaAtiva === 'grupos' ? (
              <>
                <button
                  type="button"
                  onClick={() => openNewGrupo('produto')}
                  className="flex items-center justify-center space-x-2 emp-input-bg hover:opacity-90 emp-text-primary px-4 py-2 rounded-lg transition-colors border emp-border"
                >
                  <FiFolderPlus className="w-5 h-5" />
                  <span>Novo Grupo de Produto</span>
                </button>
                <button
                  type="button"
                  onClick={() => openNewGrupo('servico')}
                  className="flex items-center justify-center space-x-2 emp-input-bg hover:opacity-90 emp-text-primary px-4 py-2 rounded-lg transition-colors border emp-border"
                >
                  <FiFolderPlus className="w-5 h-5" />
                  <span>Novo Grupo de Serviço</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openNewGrupo()}
                  className="flex items-center justify-center space-x-2 emp-input-bg hover:opacity-90 emp-text-primary px-4 py-2 rounded-lg transition-colors border emp-border"
                >
                  <FiFolderPlus className="w-5 h-5" />
                  <span>Novo Grupo de {abaAtiva === 'produtos' ? 'Produto' : 'Serviço'}</span>
                </button>
                <button
                  onClick={openNew}
                  className="flex items-center justify-center space-x-2 hover:opacity-90 emp-text-primary px-4 py-2 rounded-lg transition-colors"
                >
                  <FiPlus className="w-5 h-5" />
                  <span>Novo {abaAtiva === 'produtos' ? 'Produto' : 'Serviço'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Abas */}
        <div className="flex gap-2 border-b emp-border pb-2">
          <button
            type="button"
            onClick={() => setAbaAtiva('produtos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              abaAtiva === 'produtos' ? 'emp-text-primary' : 'emp-bg-card emp-text-muted hover:emp-input-bg'
            }`}
            style={abaAtiva === 'produtos' ? { backgroundColor: 'var(--emp-accent)' } : undefined}
          >
            <FiPackage className="w-5 h-5" />
            Produtos
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('servicos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              abaAtiva === 'servicos' ? 'emp-text-primary' : 'emp-bg-card emp-text-muted hover:emp-input-bg'
            }`}
            style={abaAtiva === 'servicos' ? { backgroundColor: 'var(--emp-accent)' } : undefined}
          >
            <FiLayers className="w-5 h-5" />
            Serviços
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('grupos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              abaAtiva === 'grupos' ? 'emp-text-primary' : 'emp-bg-card emp-text-muted hover:emp-input-bg'
            }`}
            style={abaAtiva === 'grupos' ? { backgroundColor: 'var(--emp-accent)' } : undefined}
          >
            <FiFolder className="w-5 h-5" />
            Grupos
          </button>
        </div>

        {/* Aba Grupos: gerenciar grupos de produtos e serviços */}
        {abaAtiva === 'grupos' && (
          <div className="space-y-8">
            <div className="emp-bg-card rounded-xl border emp-border p-6">
              <h2 className="text-lg font-semibold emp-text-primary mb-4 flex items-center gap-2">
                <FiPackage className="w-5 h-5 emp-text-muted" />
                Grupos de Produtos
              </h2>
              {gruposProdutos.length === 0 ? (
                <p className="emp-text-muted">Nenhum grupo de produtos. Crie um acima.</p>
              ) : (
                <ul className="space-y-2">
                  {gruposProdutos.map((g) => (
                    <li
                      key={g.id}
                      className="flex items-center justify-between gap-4 py-3 px-4 emp-bg-card rounded-lg border emp-border"
                    >
                      <span className="font-medium emp-text-primary">{g.nome}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditarGrupo('produto', g.id, g.nome)}
                          className="p-2 rounded-lg emp-text-muted hover:emp-text-primary hover:emp-input-bg transition-colors"
                          title="Editar"
                        >
                          <FiEdit2 className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExcluirGrupo('produto', g.id, g.nome)}
                          className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                          title="Excluir"
                        >
                          <FiTrash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="emp-bg-card rounded-xl border emp-border p-6">
              <h2 className="text-lg font-semibold emp-text-primary mb-4 flex items-center gap-2">
                <FiLayers className="w-5 h-5 emp-text-muted" />
                Grupos de Serviços
              </h2>
              {gruposServicos.length === 0 ? (
                <p className="emp-text-muted">Nenhum grupo de serviços. Crie um acima.</p>
              ) : (
                <ul className="space-y-2">
                  {gruposServicos.map((g) => (
                    <li
                      key={g.id}
                      className="flex items-center justify-between gap-4 py-3 px-4 emp-bg-card rounded-lg border emp-border"
                    >
                      <span className="font-medium emp-text-primary">{g.nome}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditarGrupo('servico', g.id, g.nome)}
                          className="p-2 rounded-lg emp-text-muted hover:emp-text-primary hover:emp-input-bg transition-colors"
                          title="Editar"
                        >
                          <FiEdit2 className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExcluirGrupo('servico', g.id, g.nome)}
                          className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                          title="Excluir"
                        >
                          <FiTrash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Lista agrupada por grupo (pastas expansíveis) */}
        {abaAtiva !== 'grupos' && (
        <>
        {listaAgrupada.length === 0 ? (
          <div className="text-center py-12 emp-text-muted emp-bg-card rounded-xl border emp-border">
            Nenhum {abaAtiva === 'produtos' ? 'produto' : 'serviço'} cadastrado. Clique em &quot;Novo {abaAtiva === 'produtos' ? 'Produto' : 'Serviço'}&quot;.
          </div>
        ) : (
          <div className="space-y-4">
            {listaAgrupada.map((grupo) => {
              const expanded = expandedGrupos[grupo.key] !== false
              return (
                <div key={grupo.key} className="emp-bg-card/50 rounded-xl border emp-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleGrupo(grupo.key)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:emp-input-bg/50 transition-colors"
                  >
                    {expanded ? (
                      <FiChevronDown className="w-5 h-5 emp-text-muted shrink-0" />
                    ) : (
                      <FiChevronRight className="w-5 h-5 emp-text-muted shrink-0" />
                    )}
                    <FiFolder className="w-5 h-5 emp-text-muted shrink-0" />
                    <span className="font-medium emp-text-primary">{grupo.nome}</span>
                    <span className="text-sm emp-text-muted">({grupo.items.length})</span>
                  </button>
                  {expanded && (
                    <div className="px-4 pb-4 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {grupo.items.map((item) => {
                          const isProduto = 'preco_custo' in item
                          const catCor = (item as Produto).categoria_cor || (item as Servico).categoria_cor
                          const catNome = (item as Produto).categoria_nome || (item as Servico).categoria_nome
                          return (
                            <div
                              key={item.id}
                              className="emp-bg-card rounded-xl border emp-border p-5 flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:opacity-95"
                            >
                              <div className="flex items-start gap-3 mb-3">
                                <div className="w-14 h-14 rounded-full emp-input-bg flex items-center justify-center overflow-hidden shrink-0 border emp-border">
                                  {item.foto_url ? (
                                    <Image
                                      src={item.foto_url}
                                      alt={item.nome}
                                      width={56}
                                      height={56}
                                      className="object-cover w-full h-full"
                                      unoptimized
                                    />
                                  ) : (
                                    <FiPackage className="w-7 h-7 emp-text-primary/70" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold emp-text-primary truncate">{item.nome}</p>
                                  <div className="flex flex-wrap items-center gap-1 mt-1">
                                    {catNome && (
                                      <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium emp-text-primary"
                                        style={{ backgroundColor: catCor || 'var(--emp-accent)' }}
                                      >
                                        {catNome}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-1 text-sm emp-text-secondary mb-4">
                                <p className="flex items-center gap-1">
                                  <FiDollarSign className="w-4 h-4 text-green-400" />
                                  Venda: R$ {Number(item.valor_unitario).toFixed(2)}
                                </p>
                                {isProduto && (item as Produto).preco_custo != null && (
                                  <p className="flex items-center gap-1 emp-text-muted">
                                    Custo: R$ {Number((item as Produto).preco_custo).toFixed(2)}
                                  </p>
                                )}
                              </div>
                              <div className="mt-auto flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEdit(item)}
                                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg emp-text-primary transition-colors font-medium hover:opacity-90"
                                  style={{ backgroundColor: 'var(--emp-accent)' }}
                                >
                                  <FiEye className="w-4 h-4" />
                                  Ver Detalhes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(item)}
                                  className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                                  title="Excluir"
                                >
                                  <FiTrash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        </>
        )}
      </div>

      {/* Modal Novo/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="emp-bg-card rounded-xl border emp-border w-full max-w-md shadow-xl my-8">
            <div className="flex items-center justify-between p-6 border-b emp-border">
              <h2 className="text-xl font-bold emp-text-primary">
                {editingItem ? 'Editar' : 'Novo'} {abaAtiva === 'produtos' ? 'Produto' : 'Serviço'}
              </h2>
              <button
                type="button"
                onClick={() => { setShowModal(false); setEditingItem(null) }}
                className="p-2 emp-text-muted hover:emp-text-primary rounded-lg hover:emp-input-bg"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Foto */}
              <div>
                <label className="block text-sm font-medium emp-text-secondary mb-2">Foto</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full emp-input-bg flex items-center justify-center overflow-hidden shrink-0 border emp-border">
                    {fotoPreview ? (
                      <Image src={fotoPreview} alt="Preview" width={80} height={80} className="object-cover w-full h-full" unoptimized />
                    ) : (
                      <FiImage className="w-10 h-10 emp-text-primary/50" />
                    )}
                  </div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                      disabled={uploadingPhoto}
                    />
                    <span className="px-3 py-2 emp-input-bg hover:opacity-90 emp-text-primary rounded-lg text-sm inline-block">
                      {uploadingPhoto ? 'Enviando...' : 'Alterar'}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium emp-text-secondary mb-1">Nome *</label>
                <input
                  type="text"
                  required
                  value={abaAtiva === 'produtos' ? formProduto.nome : formServico.nome}
                  onChange={(e) =>
                    abaAtiva === 'produtos'
                      ? setFormProduto((f) => ({ ...f, nome: e.target.value }))
                      : setFormServico((f) => ({ ...f, nome: e.target.value }))
                  }
                  className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--emp-accent)]"
                  placeholder="Nome do item"
                />
              </div>

              <div>
                <label className="block text-sm font-medium emp-text-secondary mb-1">Categoria</label>
                <select
                  value={abaAtiva === 'produtos' ? formProduto.categoria_id : formServico.categoria_id}
                  onChange={(e) =>
                    abaAtiva === 'produtos'
                      ? setFormProduto((f) => ({ ...f, categoria_id: e.target.value }))
                      : setFormServico((f) => ({ ...f, categoria_id: e.target.value }))
                  }
                  className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--emp-accent)]"
                >
                  <option value="">Sem categoria</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium emp-text-secondary mb-1">Grupo (pasta)</label>
                <select
                  value={abaAtiva === 'produtos' ? formProduto.grupo_produto_id : formServico.grupo_servico_id}
                  onChange={(e) =>
                    abaAtiva === 'produtos'
                      ? setFormProduto((f) => ({ ...f, grupo_produto_id: e.target.value }))
                      : setFormServico((f) => ({ ...f, grupo_servico_id: e.target.value }))
                  }
                  className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--emp-accent)]"
                >
                  <option value="">Nenhum grupo</option>
                  {abaAtiva === 'produtos'
                    ? gruposProdutos.map((g) => (
                        <option key={g.id} value={g.id}>{g.nome}</option>
                      ))
                    : gruposServicos.map((g) => (
                        <option key={g.id} value={g.id}>{g.nome}</option>
                      ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium emp-text-secondary mb-1">Preço de venda (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={abaAtiva === 'produtos' ? formProduto.valor_unitario : formServico.valor_unitario}
                  onChange={(e) =>
                    abaAtiva === 'produtos'
                      ? setFormProduto((f) => ({ ...f, valor_unitario: e.target.value }))
                      : setFormServico((f) => ({ ...f, valor_unitario: e.target.value }))
                  }
                  className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--emp-accent)]"
                  placeholder="0,00"
                />
              </div>

              {abaAtiva === 'produtos' && (
                <div>
                  <label className="block text-sm font-medium emp-text-secondary mb-1">Preço de custo (R$) - apenas produtos</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formProduto.preco_custo}
                    onChange={(e) => setFormProduto((f) => ({ ...f, preco_custo: e.target.value }))}
                    className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--emp-accent)]"
                    placeholder="0,00"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium emp-text-secondary mb-1">Descrição (opcional)</label>
                <input
                  type="text"
                  value={abaAtiva === 'produtos' ? formProduto.descricao : formServico.descricao}
                  onChange={(e) =>
                    abaAtiva === 'produtos'
                      ? setFormProduto((f) => ({ ...f, descricao: e.target.value }))
                      : setFormServico((f) => ({ ...f, descricao: e.target.value }))
                  }
                  className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--emp-accent)]"
                  placeholder="Breve descrição"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingItem(null) }}
                  className="flex-1 px-4 py-2 border emp-border rounded-lg emp-text-secondary hover:emp-input-bg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploadingPhoto}
                  className="flex-1 px-4 py-2 hover:opacity-90 emp-text-primary rounded-lg disabled:opacity-50"
                >
                  {editingItem ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Novo Grupo */}
      {showModalGrupo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="emp-bg-card rounded-xl border emp-border w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between p-6 border-b emp-border">
              <h2 className="text-xl font-bold emp-text-primary">
                Novo Grupo de {abaAtiva === 'grupos' ? (tipoGrupoCriar === 'produto' ? 'Produto' : 'Serviço') : (abaAtiva === 'produtos' ? 'Produto' : 'Serviço')}
              </h2>
              <button
                type="button"
                onClick={() => { setShowModalGrupo(false); setFormGrupoNome('') }}
                className="p-2 emp-text-muted hover:emp-text-primary rounded-lg hover:emp-input-bg"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCriarGrupo} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium emp-text-secondary mb-1">Nome do grupo</label>
                <input
                  type="text"
                  required
                  value={formGrupoNome}
                  onChange={(e) => setFormGrupoNome(e.target.value)}
                  className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--emp-accent)]"
                  placeholder="Ex: Eletrônicos, Consultoria..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModalGrupo(false); setFormGrupoNome('') }}
                  className="flex-1 px-4 py-2 border emp-border rounded-lg emp-text-secondary hover:emp-input-bg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 hover:opacity-90 emp-text-primary rounded-lg"
                >
                  Criar grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Grupo */}
      {showModalEditarGrupo && editingGrupo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="emp-bg-card rounded-xl border emp-border w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between p-6 border-b emp-border">
              <h2 className="text-xl font-bold emp-text-primary">
                Editar Grupo de {editingGrupo.tipo === 'produto' ? 'Produto' : 'Serviço'}
              </h2>
              <button
                type="button"
                onClick={() => { setShowModalEditarGrupo(false); setEditingGrupo(null); setFormGrupoNome('') }}
                className="p-2 emp-text-muted hover:emp-text-primary rounded-lg hover:emp-input-bg"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSalvarEdicaoGrupo} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium emp-text-secondary mb-1">Nome do grupo</label>
                <input
                  type="text"
                  required
                  value={formGrupoNome}
                  onChange={(e) => setFormGrupoNome(e.target.value)}
                  className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--emp-accent)]"
                  placeholder="Ex: Eletrônicos, Consultoria..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModalEditarGrupo(false); setEditingGrupo(null); setFormGrupoNome('') }}
                  className="flex-1 px-4 py-2 border emp-border rounded-lg emp-text-secondary hover:emp-input-bg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 hover:opacity-90 emp-text-primary rounded-lg"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayoutEmpresarial>
  )
}
