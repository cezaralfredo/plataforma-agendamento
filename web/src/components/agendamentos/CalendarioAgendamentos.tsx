import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, parse, startOfWeek, getDay, addHours, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, dateFnsLocalizer, type Event, type ViewsProps } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { CalendarSkeleton } from '../ui';
import api from '../../services/api';
import type { Agendamento } from '../../hooks/useAgendamentos';

const locales = {
  'pt-BR': ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const PROFESSIONAL_COLORS = [
  '#7c3aed',
  '#2563eb',
  '#059669',
  '#d97706',
  '#dc2626',
  '#0891b2',
  '#4f46e5',
  '#be185d',
  '#65a30d',
  '#0d9488',
];

interface CalendarioAgendamentosProps {
  onSelectEvent?: (event: any) => void;
}

interface CalendarEvent extends Event {
  resource: Agendamento;
  profissionalNome: string;
}

export default function CalendarioAgendamentos({ onSelectEvent }: CalendarioAgendamentosProps) {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date());

  const fetchAgendamentos = useCallback(async (start: Date, end: Date) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        dataInicio: format(start, 'yyyy-MM-dd'),
        dataFim: format(end, 'yyyy-MM-dd'),
      };
      const res = await api.get<{ agendamentos: Agendamento[] }>('/agendamentos', { params });
      setAgendamentos(res.data.agendamentos || res.data as any);
    } catch {
      setAgendamentos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const start = startOfWeek(date, { weekStartsOn: 0 });
    const end = addHours(start, 24 * 42);
    fetchAgendamentos(start, end);
  }, [date, fetchAgendamentos]);

  const profissionalColorMap = useMemo(() => {
    const map = new Map<string, string>();
    const uniqueProfissionais = [...new Set(agendamentos.map((a) => a.profissional?.id || a.profissional?.nome || ''))];
    uniqueProfissionais.forEach((id, index) => {
      map.set(id, PROFESSIONAL_COLORS[index % PROFESSIONAL_COLORS.length]);
    });
    return map;
  }, [agendamentos]);

  const events: CalendarEvent[] = useMemo(() => {
    return agendamentos.map((ag) => {
      const dataStr = typeof ag.data === 'string' ? ag.data : ag.data;
      const baseDate = parseISO(dataStr);
      const [hours, minutes] = (ag.hora || '00:00').split(':').map(Number);
      const startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes);
      const duracaoMinutos = ag.servico?.duracaoMinutos || 60;
      const endDate = new Date(startDate.getTime() + duracaoMinutos * 60000);
      const profissionalKey = ag.profissional?.id || ag.profissional?.nome || '';

      return {
        title: `${ag.cliente?.nome || 'Cliente'} - ${ag.servico?.nome || 'Serviço'}`,
        start: startDate,
        end: endDate,
        resource: ag,
        profissionalNome: ag.profissional?.nome || '',
      };
    });
  }, [agendamentos]);

  const eventPropGetter = useCallback(
    (event: CalendarEvent) => {
      const key = event.resource?.profissional?.id || event.resource?.profissional?.nome || '';
      const color = profissionalColorMap.get(key) || '#7c3aed';
      return {
        style: {
          backgroundColor: color,
          borderColor: color,
          borderRadius: '6px',
          opacity: event.resource?.status === 'CANCELADO' ? 0.5 : 1,
        },
      };
    },
    [profissionalColorMap],
  );

  const components = useMemo(
    () => ({
      event: ({ event }: { event: CalendarEvent }) => (
        <div className="truncate px-1 text-xs leading-tight">
          <p className="font-medium truncate">{event.resource?.cliente?.nome || 'Cliente'}</p>
          <p className="truncate opacity-80">
            {event.resource?.servicosAgendamento?.length
              ? event.resource.servicosAgendamento.map(sa => sa.servico.nome).join(', ').length > 22
                ? event.resource.servicosAgendamento.map(sa => sa.servico.nome).join(', ').substring(0, 22) + '...'
                : event.resource.servicosAgendamento.map(sa => sa.servico.nome).join(', ')
              : event.resource?.servico?.nome || 'Serviço'}
          </p>
        </div>
      ),
      toolbar: (toolbar: any) => (
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => toolbar.onNavigate('TODAY')}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={() => toolbar.onNavigate('PREV')}
              className="px-2 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              &lt;
            </button>
            <button
              onClick={() => toolbar.onNavigate('NEXT')}
              className="px-2 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              &gt;
            </button>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">
            {format(toolbar.date, "MMMM 'de' yyyy", { locale: ptBR })}
          </h3>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            {toolbar.views.map((view: string) => (
              <button
                key={view}
                onClick={() => toolbar.onView(view)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  toolbar.view === view
                    ? 'bg-white text-gray-800 shadow-sm font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {view === 'month' ? 'Mês' : view === 'week' ? 'Semana' : 'Dia'}
              </button>
            ))}
          </div>
        </div>
      ),
    }),
    [],
  );

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      onSelectEvent?.(event.resource);
    },
    [onSelectEvent],
  );

  if (loading && agendamentos.length === 0) {
    return <CalendarSkeleton />;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        views={['month', 'week', 'day']}
        defaultView="month"
        date={date}
        onNavigate={(newDate: Date) => setDate(newDate)}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={eventPropGetter}
        components={components}
        culture="pt-BR"
        messages={{
          next: 'Próximo',
          previous: 'Anterior',
          today: 'Hoje',
          month: 'Mês',
          week: 'Semana',
          day: 'Dia',
          noEventsInRange: 'Nenhum agendamento neste período.',
        }}
      />
    </div>
  );
}
