import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Settings, Save, Clock, AlertTriangle, CreditCard, MessageSquare, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Configuracoes {
  horarioFuncionamentoInicio: string;
  horarioFuncionamentoFim: string;
  tempoBloqueioProvisorioMinutos: number;
  horasMinimasCancelamento: number;
  prazoExpiracaoCreditoDias: number;
  mensagemBoasVindas: string;
  mensagemConfirmacao: string;
  mensagemCancelamento: string;
}

type ConfigFormData = {
  horarioFuncionamentoInicio: string;
  horarioFuncionamentoFim: string;
  tempoBloqueioProvisorioMinutos: number;
  horasMinimasCancelamento: number;
  prazoExpiracaoCreditoDias: number;
  mensagemBoasVindas: string;
  mensagemConfirmacao: string;
  mensagemCancelamento: string;
};

export default function ConfiguracoesPage() {
  const { isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConfigFormData>({
    defaultValues: {
      horarioFuncionamentoInicio: '08:00',
      horarioFuncionamentoFim: '18:00',
      tempoBloqueioProvisorioMinutos: 30,
      horasMinimasCancelamento: 2,
      prazoExpiracaoCreditoDias: 90,
      mensagemBoasVindas: '',
      mensagemConfirmacao: '',
      mensagemCancelamento: '',
    },
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/configuracoes');
        const cfg = res.data;
        reset({
          horarioFuncionamentoInicio: cfg.horarioFuncionamentoInicio || '08:00',
          horarioFuncionamentoFim: cfg.horarioFuncionamentoFim || '18:00',
          tempoBloqueioProvisorioMinutos: cfg.tempoBloqueioProvisorioMinutos || 30,
          horasMinimasCancelamento: cfg.horasMinimasCancelamento || 2,
          prazoExpiracaoCreditoDias: cfg.prazoExpiracaoCreditoDias || 90,
          mensagemBoasVindas: cfg.mensagemBoasVindas || '',
          mensagemConfirmacao: cfg.mensagemConfirmacao || '',
          mensagemCancelamento: cfg.mensagemCancelamento || '',
        });
      } catch (err) {
        toast.error('Erro ao carregar configurações.');
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [reset]);

  const onSubmit = async (data: ConfigFormData) => {
    setSaving(true);
    try {
      await api.put('/configuracoes', data);
      toast.success('Configurações salvas com sucesso!');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Settings size={48} className="mx-auto mb-3 text-gray-300" />
        <p className="text-lg font-medium">Acesso restrito</p>
        <p className="text-sm">Apenas administradores podem acessar configurações.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="card h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Configurações</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <Clock size={20} className="text-primary-600" />
            Horário de Funcionamento
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Abertura</label>
              <input
                type="time"
                {...register('horarioFuncionamentoInicio', { required: 'Campo obrigatório' })}
                className="input-field"
              />
              {errors.horarioFuncionamentoInicio && (
                <p className="text-red-500 text-xs mt-1">{errors.horarioFuncionamentoInicio.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fechamento</label>
              <input
                type="time"
                {...register('horarioFuncionamentoFim', { required: 'Campo obrigatório' })}
                className="input-field"
              />
              {errors.horarioFuncionamentoFim && (
                <p className="text-red-500 text-xs mt-1">{errors.horarioFuncionamentoFim.message}</p>
              )}
            </div>
          </div>

          <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <AlertTriangle size={20} className="text-primary-600" />
            Regras do Sistema
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bloqueio Provisório (minutos)
              </label>
              <input
                type="number"
                min="5"
                step="5"
                {...register('tempoBloqueioProvisorioMinutos', {
                  required: 'Campo obrigatório',
                  valueAsNumber: true,
                })}
                className="input-field"
              />
              {errors.tempoBloqueioProvisorioMinutos && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.tempoBloqueioProvisorioMinutos.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horas Mínimas p/ Cancelamento
              </label>
              <input
                type="number"
                min="1"
                {...register('horasMinimasCancelamento', {
                  required: 'Campo obrigatório',
                  valueAsNumber: true,
                })}
                className="input-field"
              />
              {errors.horasMinimasCancelamento && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.horasMinimasCancelamento.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiração de Crédito (dias)
              </label>
              <input
                type="number"
                min="1"
                {...register('prazoExpiracaoCreditoDias', {
                  required: 'Campo obrigatório',
                  valueAsNumber: true,
                })}
                className="input-field"
              />
              {errors.prazoExpiracaoCreditoDias && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.prazoExpiracaoCreditoDias.message}
                </p>
              )}
            </div>
          </div>

          <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <MessageSquare size={20} className="text-primary-600" />
            Mensagens Personalizadas
          </h2>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensagem de Boas-Vindas
              </label>
              <textarea
                rows={3}
                {...register('mensagemBoasVindas')}
                className="input-field resize-none"
                placeholder="Olá! Seja bem-vindo ao Salão & Barbearia. Como podemos ajudar?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensagem de Confirmação
              </label>
              <textarea
                rows={3}
                {...register('mensagemConfirmacao')}
                className="input-field resize-none"
                placeholder="Seu agendamento foi confirmado! Aguardamos você."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensagem de Cancelamento
              </label>
              <textarea
                rows={3}
                {...register('mensagemCancelamento')}
                className="input-field resize-none"
                placeholder="Seu agendamento foi cancelado. Esperamos vê-lo em breve!"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={saving}
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
