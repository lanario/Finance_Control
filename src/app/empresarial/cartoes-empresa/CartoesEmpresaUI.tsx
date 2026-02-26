'use client'

import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiCreditCard,
  FiChevronDown,
  FiChevronUp,
  FiX,
  FiCheck,
  FiUpload,
  FiFileText,
} from 'react-icons/fi'
import type { Cartao, CartoesEmpresaUIProps } from './cartoes-empresa-types'

const MESES_NOMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

/**
 * View de Cartão Empresa: lista de cartões, faturas, parcelas e compras.
 * Layout (MainLayoutEmpresarial) é aplicado na page.
 */
export function CartoesEmpresaUI(p: CartoesEmpresaUIProps) {
  if (p.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse emp-text-primary">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold emp-text-primary mb-2">Cartão Empresa</h1>
          <p className="emp-text-muted">
            Gerencie os cartões de crédito da empresa e suas faturas
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => {
              p.setEditingCartao(null)
              p.setFormData({
                nome: '',
                bandeira: '',
                limite: '',
                fechamento: '',
                vencimento: '',
                cor: '#1e3a5f',
              })
              p.setShowModal(true)
            }}
            className="bg-green-600 emp-text-primary px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <FiPlus className="w-5 h-5" />
            <span>Adicionar Cartão</span>
          </button>
          <button
            type="button"
            onClick={() => {
              p.setEditingParcela(null)
              p.setParcelaFormData({
                cartao_id: '',
                descricao: '',
                valor: '',
                total_parcelas: '1',
                numero_parcela: '1',
                data_vencimento: '',
                categoria: '',
              })
              p.setShowParcelaModal(true)
            }}
            className="bg-primary emp-text-primary px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors flex items-center space-x-2"
          >
            <FiPlus className="w-5 h-5" />
            <span>Adicionar Parcela</span>
          </button>
          <button
            type="button"
            onClick={() => {
              p.setEditingCompra(null)
              p.setCompraFormData({
                cartao_id: '',
                descricao: '',
                valor: '',
                data: new Date().toISOString().split('T')[0],
                categoria: '',
                metodo_pagamento: 'cartao',
              })
              p.setShowCompraModal(true)
            }}
            className="bg-blue-600 emp-text-primary px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <FiPlus className="w-5 h-5" />
            <span>Adicionar Compra</span>
          </button>
        </div>
      </div>

      {p.cartoes.length === 0 ? (
        <div className="emp-bg-card rounded-lg shadow-md p-12 text-center border emp-border">
          <FiCreditCard className="w-16 h-16 emp-text-muted mx-auto mb-4" />
          <p className="emp-text-muted text-lg mb-2">Nenhum cartão cadastrado</p>
          <p className="emp-text-muted text-sm">
            Clique em &quot;Adicionar Cartão&quot; para começar
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Coluna esquerda: índices pares */}
          <div className="flex flex-col gap-4">
            {p.cartoes
              .filter((_, i) => i % 2 === 0)
              .map((cartao, index) => (
                <CardBlock key={cartao.id} cartao={cartao} p={p} />
              ))}
          </div>
          {/* Coluna direita: índices ímpares */}
          <div className="flex flex-col gap-4">
            {p.cartoes
              .filter((_, i) => i % 2 === 1)
              .map((cartao, index) => (
                <CardBlock key={cartao.id} cartao={cartao} p={p} />
              ))}
          </div>
        </div>
      )}

      {/* Modal Cartão */}
      {p.showModal && <ModalCartao p={p} />}
      {/* Modal Parcela */}
      {p.showParcelaModal && <ModalParcela p={p} />}
      {/* Modal Compra */}
      {p.showCompraModal && <ModalCompra p={p} />}
      {/* Modal Categoria */}
      {p.showModalCategoria && <ModalCategoria p={p} />}
      {/* Modal PDF */}
      {p.showPdfModal && <ModalPdf p={p} />}
    </div>
  )
}

/** Bloco de um cartão: cabeçalho, faturas expansíveis, parcelas */
function CardBlock({ cartao, p }: { cartao: Cartao; p: CartoesEmpresaUIProps }) {
  const faturas = p.faturasPorCartao[cartao.id] || []
  const isExpanded = p.cartaoExpanded === cartao.id
  const limiteDisponivel = p.calcularLimiteDisponivel(cartao.id, cartao.limite)
  const totalGasto = cartao.limite - limiteDisponivel
  const cor = cartao.cor || '#1e3a5f'

  return (
    <div
      className="emp-bg-card rounded-lg shadow-md border emp-border overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-200 flex flex-col"
      style={{ borderLeftWidth: '4px', borderLeftColor: cor }}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-2">
              <h3 className="text-2xl font-semibold emp-text-primary" style={{ color: cor }}>
                {cartao.nome}
              </h3>
              <span
                className="px-3 py-1 rounded-full text-sm font-medium border"
                style={{
                  backgroundColor: `${cor}20`,
                  color: cor,
                  borderColor: `${cor}40`,
                }}
              >
                {cartao.bandeira}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="emp-text-muted">Limite:</span>
                <p className="emp-text-primary font-semibold">R$ {p.formatarMoeda(cartao.limite)}</p>
              </div>
              <div>
                <span className="emp-text-muted">Gasto Total:</span>
                <p className="text-red-400 font-semibold">R$ {p.formatarMoeda(totalGasto)}</p>
              </div>
              <div>
                <span className="emp-text-muted">Disponível:</span>
                <p className="text-green-400 font-semibold">R$ {p.formatarMoeda(limiteDisponivel)}</p>
              </div>
              <div>
                <span className="emp-text-muted">Fechamento:</span>
                <p className="emp-text-primary">Dia {cartao.fechamento}</p>
              </div>
              <div>
                <span className="emp-text-muted">Vencimento:</span>
                <p className="emp-text-primary">Dia {cartao.vencimento}</p>
              </div>
            </div>
          </div>
          <div className="flex space-x-2 ml-4">
            <button
              type="button"
              onClick={() => p.handleUploadPdf(cartao.id)}
              className="p-2 rounded-lg emp-input-bg hover:emp-input-bg text-green-400 transition-colors"
              title="Upload PDF da Fatura"
            >
              <FiUpload className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => p.handleEdit(cartao)}
              className="p-2 rounded-lg emp-input-bg hover:emp-input-bg text-blue-400 transition-colors"
              title="Editar"
            >
              <FiEdit className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => p.handleDelete(cartao.id)}
              className="p-2 rounded-lg emp-input-bg hover:emp-input-bg text-red-400 transition-colors"
              title="Excluir"
            >
              <FiTrash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {faturas.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              p.toggleCartao(cartao.id)
            }}
            className="w-full flex items-center justify-between p-4 emp-input-bg/50 rounded-lg hover:emp-input-bg transition-colors text-left mt-4"
          >
            <div className="flex items-center space-x-3">
              {isExpanded ? (
                <FiChevronUp className="w-5 h-5 emp-text-muted" />
              ) : (
                <FiChevronDown className="w-5 h-5 emp-text-muted" />
              )}
              <span className="emp-text-primary font-medium">Faturas ({faturas.length})</span>
            </div>
            <span className="emp-text-muted text-sm">Total: R$ {p.formatarMoeda(totalGasto)}</span>
          </button>
        )}
      </div>

      {isExpanded && faturas.length > 0 && (
        <div className="border-t emp-border">
          <div className="p-6 space-y-4">
            {faturas.map((fatura) => {
              const faturaKey = `${fatura.ano}-${String(fatura.mes + 1).padStart(2, '0')}`
              const faturaExpandidaKey = `${cartao.id}-${faturaKey}`
              const isFaturaExpandida = p.faturasExpandidas[faturaExpandidaKey] || false
              return (
                <div
                  key={faturaKey}
                  className={`rounded-lg border ${
                    fatura.paga ? 'bg-green-900/20 border-green-700/50' : 'emp-input-bg/50 emp-border'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => p.toggleFatura(cartao.id, faturaKey)}
                    className="w-full flex items-center justify-between p-4 hover:emp-input-bg/30 transition-colors rounded-t-lg"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      {isFaturaExpandida ? (
                        <FiChevronUp className="w-5 h-5 emp-text-muted flex-shrink-0" />
                      ) : (
                        <FiChevronDown className="w-5 h-5 emp-text-muted flex-shrink-0" />
                      )}
                      <div className="flex-1 text-left">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-lg font-semibold emp-text-primary">
                            Fatura {fatura.mesNome}/{fatura.ano}
                          </h4>
                          {fatura.paga && (
                            <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs font-medium border border-green-600/40 flex items-center space-x-1">
                              <FiCheck className="w-3 h-3" />
                              <span>Paga</span>
                            </span>
                          )}
                        </div>
                        <p className="text-sm emp-text-muted">
                          Fecha: {p.formatDate(fatura.dataFechamento)} • Vence: {p.formatDate(fatura.dataVencimento)}
                        </p>
                        {fatura.paga && fatura.dataPagamento && (
                          <p className="text-xs text-green-400 mt-1">
                            Paga em: {p.formatDate(fatura.dataPagamento)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4 flex items-center space-x-4">
                      <div>
                        <p className={`text-xl font-bold ${fatura.paga ? 'text-green-400' : 'text-red-400'}`}>
                          R$ {p.formatarMoeda(fatura.total)}
                        </p>
                        <p className="text-xs emp-text-muted">
                          {fatura.compras.length} compra{fatura.compras.length !== 1 ? 's' : ''}
                          {fatura.parcelas.length > 0 &&
                            ` • ${fatura.parcelas.length} parcela${fatura.parcelas.length !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                      {!fatura.paga && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            p.handleMarcarFaturaPaga(cartao.id, fatura.mes, fatura.ano, fatura.total)
                          }}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 emp-text-primary rounded text-xs font-medium transition-colors"
                        >
                          Marcar como Paga
                        </button>
                      )}
                      {fatura.paga && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            p.handleDesmarcarFaturaPaga(cartao.id, fatura.mes, fatura.ano)
                          }}
                          className="px-3 py-1 emp-input-bg hover:emp-input-bg emp-text-primary rounded text-xs font-medium transition-colors"
                        >
                          Desmarcar
                        </button>
                      )}
                    </div>
                  </button>

                  {isFaturaExpandida && (
                    <div className="p-4 pt-0 border-t emp-border/50">
                      {fatura.compras.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs emp-text-muted font-medium mb-2">Compras:</p>
                          {fatura.compras.map((compra) => (
                            <div
                              key={compra.id}
                              className="flex items-center justify-between p-3 emp-bg-card rounded-lg border emp-border"
                            >
                              <div className="flex-1">
                                <p className="emp-text-primary font-medium">{compra.descricao}</p>
                                <p className="text-xs emp-text-muted">
                                  {p.formatDate(compra.data)} • {compra.categoria}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2 ml-4">
                                <p className="emp-text-primary font-semibold">R$ {p.formatarMoeda(compra.valor)}</p>
                                <button
                                  type="button"
                                  onClick={() => p.handleEditCompra(compra)}
                                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 emp-text-primary rounded text-xs font-medium transition-colors"
                                  title="Editar compra"
                                >
                                  <FiEdit className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => p.handleDeleteCompra(compra.id)}
                                  className="px-2 py-1 bg-red-600 hover:bg-red-700 emp-text-primary rounded text-xs font-medium transition-colors"
                                  title="Excluir compra"
                                >
                                  <FiTrash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {fatura.parcelas.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs emp-text-muted font-medium mb-2">Parcelas:</p>
                          {fatura.parcelas.map((parcela) => (
                            <div
                              key={parcela.id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                parcela.paga ? 'bg-green-900/20 border-green-700/50' : 'emp-bg-card emp-border'
                              }`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <p className="emp-text-primary font-medium">{parcela.descricao}</p>
                                  {parcela.paga && (
                                    <span className="px-2 py-0.5 bg-green-600/20 text-green-400 rounded text-xs font-medium border border-green-600/40">
                                      Paga
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs emp-text-muted mt-1">
                                  Vence: {p.formatDate(parcela.data_vencimento)} • {parcela.categoria}
                                  {parcela.numero_parcela && ` • ${parcela.numero_parcela}/${parcela.total_parcelas}`}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2 ml-4">
                                <p className={`font-semibold ${parcela.paga ? 'text-green-400' : 'emp-text-primary'}`}>
                                  R$ {p.formatarMoeda(parcela.valor)}
                                </p>
                                {!parcela.paga && (
                                  <button
                                    type="button"
                                    onClick={() => p.handleMarcarParcelaPaga(parcela.id)}
                                    className="px-2 py-1 bg-green-600 hover:bg-green-700 emp-text-primary rounded text-xs font-medium transition-colors"
                                    title="Marcar como paga"
                                  >
                                    <FiCheck className="w-4 h-4" />
                                  </button>
                                )}
                                {parcela.paga && (
                                  <button
                                    type="button"
                                    onClick={() => p.handleDesmarcarParcelaPaga(parcela.id)}
                                    className="px-2 py-1 emp-input-bg hover:emp-input-bg emp-text-primary rounded text-xs font-medium transition-colors"
                                    title="Desmarcar como paga"
                                  >
                                    <FiX className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => p.handleEditParcela(parcela)}
                                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 emp-text-primary rounded text-xs font-medium transition-colors"
                                  title="Editar parcela"
                                >
                                  <FiEdit className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => p.handleDeleteParcela(parcela.id)}
                                  className="px-2 py-1 bg-red-600 hover:bg-red-700 emp-text-primary rounded text-xs font-medium transition-colors"
                                  title="Excluir parcela"
                                >
                                  <FiTrash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {faturas.length === 0 && (
        <div className="border-t emp-border p-6">
          <p className="emp-text-muted text-center">Nenhuma compra registrada neste cartão</p>
        </div>
      )}

      {/* Seção Parcelas do cartão */}
      {(() => {
        const parcelasDoCartao = p.parcelasPorCartao[cartao.id] || []
        const parcelasAtivas = parcelasDoCartao.filter((x) => !x.paga)
        const totalPendente = parcelasAtivas.reduce((sum, x) => sum + x.valor, 0)
        const parcelasExpanded = p.parcelasCartaoExpanded === cartao.id
        if (parcelasDoCartao.length === 0) return null
        return (
          <div className="border-t emp-border">
            <button
              type="button"
              onClick={() => p.toggleParcelasCartao(cartao.id)}
              className="w-full flex items-center justify-between p-4 emp-input-bg/50 rounded-lg hover:emp-input-bg transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                {parcelasExpanded ? (
                  <FiChevronUp className="w-5 h-5 emp-text-muted" />
                ) : (
                  <FiChevronDown className="w-5 h-5 emp-text-muted" />
                )}
                <span className="emp-text-primary font-medium">Parcelas ({parcelasDoCartao.length})</span>
                {parcelasAtivas.length > 0 && (
                  <span className="px-2 py-1 bg-red-600/20 text-red-400 rounded text-xs font-medium border border-red-600/40">
                    {parcelasAtivas.length} pendente{parcelasAtivas.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className={`text-sm font-medium ${parcelasAtivas.length > 0 ? 'text-red-400' : 'emp-text-muted'}`}>
                  R$ {p.formatarMoeda(totalPendente)} pendente
                </span>
              </div>
            </button>
            {parcelasExpanded && (
              <div className="p-6 space-y-2">
                {[...parcelasDoCartao]
                  .sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())
                  .map((parcela) => (
                    <div
                      key={parcela.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        parcela.paga ? 'bg-gray-900/50 emp-border/50 opacity-60' : 'emp-bg-card emp-border'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          {parcela.paga && (
                            <span className="px-2 py-0.5 bg-green-600/20 text-green-400 rounded text-xs font-medium border border-green-600/40">
                              Paga
                            </span>
                          )}
                          <p className={`font-medium ${parcela.paga ? 'emp-text-muted' : 'emp-text-primary'}`}>
                            {parcela.descricao}
                          </p>
                          {parcela.numero_parcela && (
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                parcela.paga ? 'emp-input-bg emp-text-muted' : 'emp-input-bg emp-text-secondary'
                              }`}
                            >
                              {parcela.numero_parcela}/{parcela.total_parcelas}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-1 ${parcela.paga ? 'emp-text-muted' : 'emp-text-muted'}`}>
                          Vence: {new Date(parcela.data_vencimento).toLocaleDateString('pt-BR')} • {parcela.categoria}
                          {parcela.paga && parcela.data_pagamento && (
                            <span className="ml-2">• Paga em: {p.formatDate(parcela.data_pagamento)}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <p className={`font-semibold ${parcela.paga ? 'emp-text-muted' : 'emp-text-primary'}`}>
                          R$ {parcela.valor.toFixed(2)}
                        </p>
                        {!parcela.paga ? (
                          <button
                            type="button"
                            onClick={() => p.handleMarcarParcelaPaga(parcela.id)}
                            className="px-2 py-1 bg-green-600 hover:bg-green-700 emp-text-primary rounded text-xs font-medium transition-colors"
                            title="Marcar como paga"
                          >
                            <FiCheck className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => p.handleDesmarcarParcelaPaga(parcela.id)}
                            className="px-2 py-1 emp-input-bg hover:emp-input-bg emp-text-primary rounded text-xs font-medium transition-colors"
                            title="Desmarcar como paga"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => p.handleEditParcela(parcela)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            parcela.paga ? 'emp-input-bg hover:emp-input-bg emp-text-secondary' : 'bg-blue-600 hover:bg-blue-700 emp-text-primary'
                          }`}
                          title="Editar parcela"
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => p.handleDeleteParcela(parcela.id)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            parcela.paga ? 'emp-input-bg hover:emp-input-bg emp-text-secondary' : 'bg-red-600 hover:bg-red-700 emp-text-primary'
                          }`}
                          title="Excluir parcela"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}

function ModalCartao({ p }: { p: CartoesEmpresaUIProps }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="emp-bg-card rounded-lg p-8 w-full max-w-md border emp-border">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold emp-text-primary">
            {p.editingCartao ? 'Editar Cartão' : 'Novo Cartão'}
          </h2>
          <button
            type="button"
            onClick={() => {
              p.setShowModal(false)
              p.setEditingCartao(null)
            }}
            className="emp-text-muted hover:emp-text-primary transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={p.handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium emp-text-secondary mb-2">Nome do Cartão</label>
            <input
              type="text"
              value={p.formData.nome}
              onChange={(e) => p.setFormData({ ...p.formData, nome: e.target.value })}
              required
              className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: Nubank, Itaú..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium emp-text-secondary mb-2">Bandeira</label>
            <select
              value={p.formData.bandeira}
              onChange={(e) => p.setFormData({ ...p.formData, bandeira: e.target.value })}
              required
              className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Selecione...</option>
              <option value="Visa">Visa</option>
              <option value="Mastercard">Mastercard</option>
              <option value="Elo">Elo</option>
              <option value="American Express">American Express</option>
              <option value="Hipercard">Hipercard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium emp-text-secondary mb-2">Limite (R$)</label>
            <input
              type="number"
              step="0.01"
              value={p.formData.limite}
              onChange={(e) => p.setFormData({ ...p.formData, limite: e.target.value })}
              required
              className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0.00"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium emp-text-secondary mb-2">Fechamento (dia)</label>
              <input
                type="number"
                min={1}
                max={31}
                value={p.formData.fechamento}
                onChange={(e) => p.setFormData({ ...p.formData, fechamento: e.target.value })}
                required
                className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ex: 10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium emp-text-secondary mb-2">Vencimento (dia)</label>
              <input
                type="number"
                min={1}
                max={31}
                value={p.formData.vencimento}
                onChange={(e) => p.setFormData({ ...p.formData, vencimento: e.target.value })}
                required
                className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ex: 15"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium emp-text-secondary mb-2">Cor do Cartão</label>
            <div className="flex items-center space-x-4">
              <input
                type="color"
                value={p.formData.cor}
                onChange={(e) => p.setFormData({ ...p.formData, cor: e.target.value })}
                className="w-16 h-10 rounded cursor-pointer"
                title="Escolha uma cor para o cartão"
              />
              <input
                type="text"
                value={p.formData.cor}
                onChange={(e) => p.setFormData({ ...p.formData, cor: e.target.value })}
                className="flex-1 px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="#1e3a5f"
                pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
              />
            </div>
          </div>
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={() => {
                p.setShowModal(false)
                p.setEditingCartao(null)
              }}
              className="flex-1 px-4 py-2 border emp-border rounded-lg emp-text-secondary hover:emp-input-bg transition-colors"
            >
              Cancelar
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-primary emp-text-primary rounded-lg hover:bg-primary-dark transition-colors">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalParcela({ p }: { p: CartoesEmpresaUIProps }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="emp-bg-card rounded-lg p-8 w-full max-w-md border emp-border">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold emp-text-primary">
            {p.editingParcela ? 'Editar Parcela' : 'Nova Parcela em Andamento'}
          </h2>
          <button
            type="button"
            onClick={() => {
              p.setShowParcelaModal(false)
              p.setEditingParcela(null)
              p.setParcelaFormData({
                cartao_id: '',
                descricao: '',
                valor: '',
                total_parcelas: '1',
                numero_parcela: '1',
                data_vencimento: '',
                categoria: '',
              })
            }}
            className="emp-text-muted hover:emp-text-primary transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={p.handleSubmitParcela} className="space-y-4">
          <div>
            <label className="block text-sm font-medium emp-text-secondary mb-2">Cartão</label>
            <select
              value={p.parcelaFormData.cartao_id}
              onChange={(e) => p.setParcelaFormData({ ...p.parcelaFormData, cartao_id: e.target.value })}
              required
              className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Selecione um cartão...</option>
              {p.cartoes.map((cartao) => (
                <option key={cartao.id} value={cartao.id}>
                  {cartao.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium emp-text-secondary mb-2">Descrição</label>
            <input
              type="text"
              value={p.parcelaFormData.descricao}
              onChange={(e) => p.setParcelaFormData({ ...p.parcelaFormData, descricao: e.target.value })}
              required
              className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: Parcela de notebook..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium emp-text-secondary mb-2">Valor da Parcela (R$)</label>
            <input
              type="number"
              step="0.01"
              value={p.parcelaFormData.valor}
              onChange={(e) => p.setParcelaFormData({ ...p.parcelaFormData, valor: e.target.value })}
              required
              className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0.00"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium emp-text-secondary mb-2">Número da Parcela</label>
              <input
                type="number"
                min={1}
                value={p.parcelaFormData.numero_parcela}
                onChange={(e) => p.setParcelaFormData({ ...p.parcelaFormData, numero_parcela: e.target.value })}
                required
                className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ex: 1, 2, 3..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium emp-text-secondary mb-2">Total de Parcelas</label>
              <input
                type="number"
                min={1}
                value={p.parcelaFormData.total_parcelas}
                onChange={(e) => p.setParcelaFormData({ ...p.parcelaFormData, total_parcelas: e.target.value })}
                required
                className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ex: 3, 6, 12..."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium emp-text-secondary mb-2">Data da Primeira Parcela</label>
            <input
              type="date"
              value={p.parcelaFormData.data_vencimento}
              onChange={(e) => p.setParcelaFormData({ ...p.parcelaFormData, data_vencimento: e.target.value })}
              required
              className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium emp-text-secondary mb-2">Categoria</label>
            <div className="flex items-center space-x-2">
              <select
                value={p.parcelaFormData.categoria}
                onChange={(e) => p.setParcelaFormData({ ...p.parcelaFormData, categoria: e.target.value })}
                required
                className="flex-1 px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Selecione uma categoria...</option>
                {p.categoriasDespesa.map((cat) => (
                  <option key={cat.id} value={cat.nome}>
                    {cat.nome}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => p.setShowModalCategoria(true)}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 emp-text-primary rounded-lg transition-colors"
                title="Adicionar nova categoria"
              >
                <FiPlus className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={() => {
                p.setShowParcelaModal(false)
                p.setEditingParcela(null)
                p.setParcelaFormData({
                  cartao_id: '',
                  descricao: '',
                  valor: '',
                  total_parcelas: '1',
                  numero_parcela: '1',
                  data_vencimento: '',
                  categoria: '',
                })
              }}
              className="flex-1 px-4 py-2 border emp-border rounded-lg emp-text-secondary hover:emp-input-bg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 emp-text-primary rounded-lg hover:bg-green-700 transition-colors"
            >
              {p.editingParcela ? 'Atualizar Parcela' : 'Salvar Parcela'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalCompra({ p }: { p: CartoesEmpresaUIProps }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="emp-bg-card rounded-lg p-8 w-full max-w-md border emp-border">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold emp-text-primary">
            {p.editingCompra ? 'Editar Compra' : 'Nova Compra'}
          </h2>
          <button
            type="button"
            onClick={() => {
              p.setShowCompraModal(false)
              p.setEditingCompra(null)
              p.setCompraFormData({
                cartao_id: '',
                descricao: '',
                valor: '',
                data: new Date().toISOString().split('T')[0],
                categoria: '',
                metodo_pagamento: 'cartao',
              })
            }}
            className="emp-text-muted hover:emp-text-primary transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={p.handleSubmitCompra} className="space-y-4">
          <div>
            <label className="block text-sm font-medium emp-text-secondary mb-2">Cartão</label>
            <select
              value={p.compraFormData.cartao_id}
              onChange={(e) => p.setCompraFormData({ ...p.compraFormData, cartao_id: e.target.value })}
              required
              className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Selecione um cartão...</option>
              {p.cartoes.map((cartao) => (
                <option key={cartao.id} value={cartao.id}>
                  {cartao.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium emp-text-secondary mb-2">Descrição</label>
            <input
              type="text"
              value={p.compraFormData.descricao}
              onChange={(e) => p.setCompraFormData({ ...p.compraFormData, descricao: e.target.value })}
              required
              className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: Supermercado, Restaurante..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium emp-text-secondary mb-2">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              value={p.compraFormData.valor}
              onChange={(e) => p.setCompraFormData({ ...p.compraFormData, valor: e.target.value })}
              required
              className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium emp-text-secondary mb-2">Data</label>
            <input
              type="date"
              value={p.compraFormData.data}
              onChange={(e) => p.setCompraFormData({ ...p.compraFormData, data: e.target.value })}
              required
              className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium emp-text-secondary mb-2">Categoria</label>
            <div className="flex items-center space-x-2">
              <select
                value={p.compraFormData.categoria}
                onChange={(e) => p.setCompraFormData({ ...p.compraFormData, categoria: e.target.value })}
                required
                className="flex-1 px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Selecione uma categoria...</option>
                {p.categoriasDespesa.map((cat) => (
                  <option key={cat.id} value={cat.nome}>
                    {cat.nome}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => p.setShowModalCategoria(true)}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 emp-text-primary rounded-lg transition-colors"
                title="Adicionar nova categoria"
              >
                <FiPlus className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={() => {
                p.setShowCompraModal(false)
                p.setEditingCompra(null)
                p.setCompraFormData({
                  cartao_id: '',
                  descricao: '',
                  valor: '',
                  data: new Date().toISOString().split('T')[0],
                  categoria: '',
                  metodo_pagamento: 'cartao',
                })
              }}
              className="flex-1 px-4 py-2 border emp-border rounded-lg emp-text-secondary hover:emp-input-bg transition-colors"
            >
              Cancelar
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-primary emp-text-primary rounded-lg hover:bg-primary-dark transition-colors">
              {p.editingCompra ? 'Atualizar Compra' : 'Salvar Compra'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalCategoria({ p }: { p: CartoesEmpresaUIProps }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="emp-bg-card rounded-lg border emp-border w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold emp-text-primary">Nova Categoria de Gasto</h2>
            <button
              type="button"
              onClick={() => {
                p.setShowModalCategoria(false)
                p.setFormDataCategoria({ nome: '', descricao: '', cor: '#6366f1' })
              }}
              className="emp-text-muted hover:emp-text-primary transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
          <form onSubmit={p.handleCriarCategoria} className="space-y-4">
            <div>
              <label className="block text-sm emp-text-muted mb-1">Nome da Categoria *</label>
              <input
                type="text"
                required
                value={p.formDataCategoria.nome}
                onChange={(e) => p.setFormDataCategoria({ ...p.formDataCategoria, nome: e.target.value })}
                className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:border-purple-500"
                placeholder="Ex: Alimentação, Transporte, Lazer"
              />
            </div>
            <div>
              <label className="block text-sm emp-text-muted mb-1">Descrição</label>
              <textarea
                value={p.formDataCategoria.descricao}
                onChange={(e) => p.setFormDataCategoria({ ...p.formDataCategoria, descricao: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:border-purple-500"
                placeholder="Descrição da categoria (opcional)"
              />
            </div>
            <div>
              <label className="block text-sm emp-text-muted mb-1">Cor</label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={p.formDataCategoria.cor}
                  onChange={(e) => p.setFormDataCategoria({ ...p.formDataCategoria, cor: e.target.value })}
                  className="w-16 h-10 emp-input-bg border emp-border rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={p.formDataCategoria.cor}
                  onChange={(e) => p.setFormDataCategoria({ ...p.formDataCategoria, cor: e.target.value })}
                  className="flex-1 px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:border-purple-500"
                  placeholder="#6366f1"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  p.setShowModalCategoria(false)
                  p.setFormDataCategoria({ nome: '', descricao: '', cor: '#6366f1' })
                }}
                className="px-4 py-2 emp-input-bg hover:emp-input-bg emp-text-primary rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 emp-text-primary rounded-lg transition-colors">
                Criar Categoria
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function ModalPdf({ p }: { p: CartoesEmpresaUIProps }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="emp-bg-card rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto border emp-border">
        <div className="p-6 border-b emp-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FiFileText className="w-6 h-6 text-green-400" />
              <h2 className="text-2xl font-bold emp-text-primary">Upload de Fatura em PDF</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                p.setShowPdfModal(false)
                p.setTransacoesExtraidas([])
              }}
              className="emp-text-muted hover:emp-text-primary transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {p.transacoesExtraidas.length === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium emp-text-secondary mb-2">
                  Selecione o arquivo PDF da fatura
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) p.handleProcessarPdf(file)
                  }}
                  disabled={p.processandoPdf}
                  className="w-full px-4 py-2 emp-input-bg border emp-border rounded-lg emp-text-primary focus:outline-none focus:ring-2 focus:ring-primary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:emp-text-primary hover:file:bg-primary-dark"
                />
              </div>
              {p.processandoPdf && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                  <p className="emp-text-muted">Processando PDF...</p>
                </div>
              )}
              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                  <strong>Dica:</strong> O sistema tentará extrair automaticamente as transações do PDF. Você poderá
                  revisar e editar as informações antes de confirmar.
                </p>
              </div>
            </div>
          )}

          {p.transacoesExtraidas.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold emp-text-primary">
                    Transações Extraídas ({p.transacoesExtraidas.length})
                  </h3>
                  <p className="text-sm emp-text-muted">Revise e edite as informações antes de confirmar</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div>
                    <label className="block text-xs emp-text-muted mb-1">Mês</label>
                    <select
                      value={p.mesReferencia}
                      onChange={(e) => {
                        const novoMes = parseInt(e.target.value, 10)
                        p.setMesReferencia(novoMes)
                        const ultimoDiaDoMes = new Date(p.anoReferencia, novoMes, 0).getDate()
                        const diaAjustado = Math.min(new Date().getDate(), ultimoDiaDoMes)
                        const novaData = new Date(p.anoReferencia, novoMes - 1, diaAjustado)
                        const dataFormatada = novaData.toISOString().split('T')[0]
                        p.setTransacoesExtraidas(
                          p.transacoesExtraidas.map((t) => ({ ...t, data: dataFormatada }))
                        )
                      }}
                      className="px-3 py-1 emp-input-bg border emp-border rounded emp-text-primary text-sm"
                    >
                      {MESES_NOMES.map((mes, index) => (
                        <option key={mes} value={index + 1}>
                          {mes}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs emp-text-muted mb-1">Ano</label>
                    <input
                      type="number"
                      value={p.anoReferencia}
                      onChange={(e) => {
                        const novoAno = parseInt(e.target.value, 10)
                        p.setAnoReferencia(novoAno)
                        const ultimoDiaDoMes = new Date(novoAno, p.mesReferencia, 0).getDate()
                        const diaAjustado = Math.min(new Date().getDate(), ultimoDiaDoMes)
                        const novaData = new Date(novoAno, p.mesReferencia - 1, diaAjustado)
                        const dataFormatada = novaData.toISOString().split('T')[0]
                        p.setTransacoesExtraidas(
                          p.transacoesExtraidas.map((t) => ({ ...t, data: dataFormatada }))
                        )
                      }}
                      min={2020}
                      max={2100}
                      className="px-3 py-1 emp-input-bg border emp-border rounded emp-text-primary text-sm w-20"
                    />
                  </div>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-3">
                {p.transacoesExtraidas.map((transacao, index) => (
                  <div key={index} className="emp-input-bg rounded-lg p-5 border emp-border">
                    <div className="grid grid-cols-12 gap-4 items-start">
                      <div className="col-span-4">
                        <label className="block text-xs emp-text-muted mb-1">Descrição</label>
                        <input
                          type="text"
                          value={transacao.descricao}
                          onChange={(e) => p.handleEditarTransacao(index, 'descricao', e.target.value)}
                          className="w-full px-3 py-2 emp-bg-card border emp-border rounded emp-text-primary text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs emp-text-muted mb-1">Valor (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={transacao.valor}
                          onChange={(e) =>
                            p.handleEditarTransacao(index, 'valor', parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-3 py-2 emp-bg-card border emp-border rounded emp-text-primary text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs emp-text-muted mb-1">Data</label>
                        <input
                          type="text"
                          value={p.formatarDataParaInput(transacao.data)}
                          onChange={(e) => {
                            const valorComMascara = p.aplicarMascaraData(e.target.value)
                            p.handleEditarTransacao(index, 'data', valorComMascara)
                          }}
                          placeholder="DD/MM/YYYY"
                          maxLength={10}
                          className="w-full px-3 py-2 emp-bg-card border emp-border rounded emp-text-primary text-sm"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs emp-text-muted mb-1">Categoria</label>
                        <div className="flex items-center space-x-2">
                          <select
                            value={transacao.categoria || ''}
                            onChange={(e) => p.handleEditarTransacao(index, 'categoria', e.target.value)}
                            className="flex-1 px-3 py-2 emp-bg-card border emp-border rounded emp-text-primary text-sm"
                          >
                            <option value="">Selecione...</option>
                            {p.categoriasDespesa.map((cat) => (
                              <option key={cat.id} value={cat.nome}>
                                {cat.nome}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => p.setShowModalCategoria(true)}
                            className="p-2 bg-purple-600 hover:bg-purple-700 emp-text-primary rounded transition-colors flex-shrink-0"
                            title="Adicionar nova categoria"
                          >
                            <FiPlus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="col-span-1 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => p.handleRemoverTransacao(index)}
                          className="p-2 text-red-400 hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
                          title="Remover"
                        >
                          <FiTrash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t emp-border">
                <div className="emp-text-primary">
                  <span className="emp-text-muted">Total: </span>
                  <span className="text-xl font-bold">
                    R$ {p.formatarMoeda(p.transacoesExtraidas.reduce((sum, t) => sum + t.valor, 0))}
                  </span>
                </div>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      p.setShowPdfModal(false)
                      p.setTransacoesExtraidas([])
                    }}
                    className="px-4 py-2 border emp-border rounded-lg emp-text-secondary hover:emp-input-bg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={p.handleConfirmarTransacoes}
                    disabled={p.uploadingPdf || p.transacoesExtraidas.length === 0}
                    className="px-4 py-2 bg-green-600 emp-text-primary rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {p.uploadingPdf ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <FiCheck className="w-5 h-5" />
                        <span>Confirmar e Criar Despesas</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
