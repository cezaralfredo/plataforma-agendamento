import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../ui';
import api from '../../services/api';

interface ClienteFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cliente?: {
    id: string;
    nome: string;
    telefone: string;
    email?: string;
  } | null;
}

interface FormData {
  nome: string;
  telefone: string;
  email: string;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function ClienteFormModal({ open, onClose, onSuccess, cliente }: ClienteFormModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: { nome: '', telefone: '', email: '' },
  });

  const telefoneValue = watch('telefone');

  useEffect(() => {
    if (open) {
      if (cliente) {
        reset({
          nome: cliente.nome,
          telefone: cliente.telefone || '',
          email: cliente.email || '',
        });
      } else {
        reset({ nome: '', telefone: '', email: '' });
      }
    }
  }, [open, cliente, reset]);

  useEffect(() => {
    const formatted = formatPhone(telefoneValue || '');
    if (formatted !== telefoneValue) {
      setValue('telefone', formatted, { shouldValidate: false });
    }
  }, [telefoneValue, setValue]);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const payload = {
        nome: data.nome.trim(),
        telefone: data.telefone.replace(/\D/g, ''),
        email: data.email.trim() || undefined,
      };

      if (cliente) {
        await api.put(`/clientes/${cliente.id}`, payload);
        toast.success('Cliente atualizado com sucesso!');
      } else {
        await api.post('/clientes', payload);
        toast.success('Cliente cadastrado com sucesso!');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erro ao salvar cliente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={cliente ? 'Editar Cliente' : 'Novo Cliente'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
          <input
            type="text"
            placeholder="Nome completo"
            {...register('nome', {
              required: 'Nome é obrigatório',
              minLength: { value: 2, message: 'Mínimo de 2 caracteres' },
            })}
            className="input-field"
          />
          {errors.nome && (
            <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
          <input
            type="text"
            placeholder="(11) 99999-9999"
            {...register('telefone', {
              required: 'Telefone é obrigatório',
              validate: (value) => {
                const digits = value.replace(/\D/g, '');
                if (digits.length < 10) return 'Telefone inválido';
                if (digits.length > 11) return 'Telefone inválido';
                return true;
              },
            })}
            className="input-field"
            maxLength={16}
          />
          {errors.telefone && (
            <p className="text-red-500 text-xs mt-1">{errors.telefone.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input
            type="email"
            placeholder="email@exemplo.com"
            {...register('email', {
              pattern: {
                value: /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Email inválido',
              },
            })}
            className="input-field"
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={submitting}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={submitting}>
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Salvando...' : cliente ? 'Salvar' : 'Cadastrar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
