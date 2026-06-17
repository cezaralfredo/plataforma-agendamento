import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Search, User, Scissors, Users, Calendar, Clock, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Modal } from '../ui';
import api from '../../services/api';
import { useClientes } from '../../hooks/useClientes';
import { useServicos } from '../../hooks/useServicos';
import { useProfissionais } from '../../hooks/useProfissionais';

interface NovoAgendamentoModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  clienteId: string;
  servicoId: string;
  profissionalId: string;
  data: string;
  hora: string;
}

interface HorarioSlots {
  horarios: string[];
  loading: boolean;
}

export default function NovoAgendamentoModal({ open, onClose, onSuccess }: NovoAgendamentoModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [horarioState, setHorarioState] = useState<HorarioSlots>({ horarios: [], loading: false });
  const [submitting, setSubmitting] = useState(false);

  const { clientes, loading: clientesLoading } = useClientes(searchTerm);
  const { servicos, loading: servicosLoading } = useServicos();
  const { profissionais, loading: profLoading } = useProfissionais();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>();

  const selectedServicoId = watch('servicoId');
  const selectedProfissionalId = watch('profissionalId');
  const selectedData = watch('data');

  const selectedServico = servicos.find((s) => s.id === selectedServicoId);

  const profissionaisFiltrados = selectedServico
    ? profissionais.filter((p) =>
        p.ativo && p.especialidades.some(
          (esp) => esp.toLowerCase().includes(selectedServico.nome.toLowerCase())
        )
      )
    : [];

  const fetchHorarios = useCallback(async () => {
    if (!selectedProfissionalId || !selectedData) {
      setHorarioState({ horarios: [], loading: false });
      return;
    }
    setHorarioState((prev) => ({ ...prev, loading: true }));
    try {
      const res = await api.get<string[]>(`/profissionais/${selectedProfissionalId}/horarios`, {
        params: { data: selectedData },
      });
      setHorarioState({ horarios: res.data, loading: false });
    } catch {
      setHorarioState({ horarios: [], loading: false });
    }
  }, [selectedProfissionalId, selectedData]);

  useEffect(() => {
    fetchHorarios();
  }, [fetchHorarios]);

  useEffect(() => {
    if (open) {
      reset({ clienteId: '', servicoId: '', profissionalId: '', data: '', hora: '' });
      setSearchTerm('');
      setHorarioState({ horarios: [], loading: false });
    }
  }, [open, reset]);

  const hoje = format(new Date(), 'yyyy-MM-dd');

  const onSubmit = async (formData: FormData) => {
    if (!formData.clienteId || !formData.servicoId || !formData.profissionalId || !formData.data || !formData.hora) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/agendamentos', {
        clienteId: formData.clienteId,
        profissionalId: formData.profissionalId,
        servicoId: formData.servicoId,
        data: formData.data,
        hora: formData.hora,
      });
      toast.success('Agendamento criado com sucesso!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erro ao criar agendamento.');
    } finally {
      setSubmitting(false);
    }
  };

  const servicosSalao = servicos.filter((s) => s.categoria === 'SALAO' && s.ativo);
  const servicosBarbearia = servicos.filter((s) => s.categoria === 'BARBEARIA' && s.ativo);
  const servicosSemCategoria = servicos.filter((s) => s.categoria !== 'SALAO' && s.categoria !== 'BARBEARIA' && s.ativo);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Modal open={open} onClose={onClose} title="Novo Agendamento" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <span className="flex items-center gap-1.5">
              <User size={14} />
              Cliente
            </span>
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cliente por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-9 text-sm"
            />
          </div>
          <div className="mt-1 max-h-36 overflow-y-auto border border-gray-200 rounded-lg">
            {clientesLoading ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 size={16} className="animate-spin text-gray-400" />
              </div>
            ) : clientes.length === 0 ? (
              <div className="p-3 text-center">
                <AlertCircle size={16} className="mx-auto mb-1 text-gray-400" />
                <p className="text-xs text-gray-500">Cliente não encontrado</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Cadastre o cliente na página de Clientes.
                </p>
              </div>
            ) : (
              clientes.map((cliente) => (
                <label
                  key={cliente.id}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-sm transition-colors ${
                    watch('clienteId') === cliente.id
                      ? 'bg-primary-50 text-primary-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    value={cliente.id}
                    {...register('clienteId', { required: 'Selecione um cliente' })}
                    className="sr-only"
                  />
                  <User size={14} className="text-gray-400 shrink-0" />
                  <div>
                    <p className="font-medium">{cliente.nome}</p>
                    {cliente.telefone && (
                      <p className="text-xs text-gray-400">{cliente.telefone}</p>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>
          {errors.clienteId && (
            <p className="text-red-500 text-xs mt-1">{errors.clienteId.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <span className="flex items-center gap-1.5">
              <Scissors size={14} />
              Serviço
            </span>
          </label>
          {servicosLoading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 size={16} className="animate-spin text-gray-400" />
              <span className="text-sm text-gray-400">Carregando...</span>
            </div>
          ) : servicos.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum serviço disponível.</p>
          ) : (
            <select
              {...register('servicoId', { required: 'Selecione um serviço' })}
              className="input-field text-sm"
              onChange={(e) => {
                setValue('servicoId', e.target.value);
                setValue('profissionalId', '');
                setValue('hora', '');
              }}
            >
              <option value="">Selecione um serviço</option>
              {servicosSalao.length > 0 && (
                <optgroup label="Salão">
                  {servicosSalao.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} - {formatCurrency(s.valor)}
                    </option>
                  ))}
                </optgroup>
              )}
              {servicosBarbearia.length > 0 && (
                <optgroup label="Barbearia">
                  {servicosBarbearia.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} - {formatCurrency(s.valor)}
                    </option>
                  ))}
                </optgroup>
              )}
              {servicosSemCategoria.length > 0 && (
                <optgroup label="Outros">
                  {servicosSemCategoria.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} - {formatCurrency(s.valor)}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          )}
          {errors.servicoId && (
            <p className="text-red-500 text-xs mt-1">{errors.servicoId.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <span className="flex items-center gap-1.5">
              <Users size={14} />
              Profissional
            </span>
          </label>
          {profLoading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 size={16} className="animate-spin text-gray-400" />
              <span className="text-sm text-gray-400">Carregando...</span>
            </div>
          ) : !selectedServicoId ? (
            <p className="text-sm text-gray-400">Selecione um serviço primeiro.</p>
          ) : profissionaisFiltrados.length === 0 ? (
            <p className="text-sm text-gray-400">
              Nenhum profissional disponível para este serviço.
            </p>
          ) : (
            <select
              {...register('profissionalId', { required: 'Selecione um profissional' })}
              className="input-field text-sm"
              value={selectedProfissionalId}
              onChange={(e) => {
                setValue('profissionalId', e.target.value);
                setValue('hora', '');
              }}
            >
              <option value="">Selecione um profissional</option>
              {profissionaisFiltrados.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          )}
          {errors.profissionalId && (
            <p className="text-red-500 text-xs mt-1">{errors.profissionalId.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                Data
              </span>
            </label>
            <input
              type="date"
              min={hoje}
              {...register('data', { required: 'Selecione uma data' })}
              className="input-field text-sm"
            />
            {errors.data && (
              <p className="text-red-500 text-xs mt-1">{errors.data.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              Horário
            </span>
          </label>
          {!selectedProfissionalId || !selectedData ? (
            <p className="text-sm text-gray-400">
              Selecione profissional e data para ver horários.
            </p>
          ) : horarioState.loading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 size={16} className="animate-spin text-gray-400" />
              <span className="text-sm text-gray-400">Carregando horários...</span>
            </div>
          ) : horarioState.horarios.length === 0 ? (
            <p className="text-sm text-gray-400">
              Nenhum horário disponível para esta data.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-gray-200 rounded-lg">
              {horarioState.horarios.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setValue('hora', h)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    watch('hora') === h
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400 hover:text-primary-600'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          )}
          {errors.hora && (
            <p className="text-red-500 text-xs mt-1">{errors.hora.message}</p>
          )}
        </div>

        {watch('clienteId') && watch('servicoId') && watch('profissionalId') && watch('data') && watch('hora') && (
          <div className="rounded-lg border border-primary-200 bg-primary-50 p-4 space-y-2">
            <h4 className="text-sm font-semibold text-primary-800">Resumo do Agendamento</h4>
            <div className="text-sm text-primary-700 space-y-1">
              <p>
                <span className="font-medium">Cliente:</span>{' '}
                {clientes.find((c) => c.id === watch('clienteId'))?.nome || '-'}
              </p>
              <p>
                <span className="font-medium">Serviço:</span>{' '}
                {selectedServico?.nome || '-'}
              </p>
              <p>
                <span className="font-medium">Profissional:</span>{' '}
                {profissionais.find((p) => p.id === watch('profissionalId'))?.nome || '-'}
              </p>
              <p>
                <span className="font-medium">Data:</span>{' '}
                {watch('data') ? format(new Date(watch('data') + 'T12:00:00'), 'dd/MM/yyyy') : '-'}
              </p>
              <p>
                <span className="font-medium">Horário:</span> {watch('hora')}
              </p>
              {selectedServico && (
                <p className="text-base font-semibold text-primary-900 pt-1 border-t border-primary-200 mt-1">
                  Valor: {formatCurrency(selectedServico.valor)}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={submitting}>
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary flex items-center gap-2"
            disabled={submitting}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Salvando...' : 'Confirmar Agendamento'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
