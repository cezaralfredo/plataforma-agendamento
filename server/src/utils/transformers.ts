import { format, parseISO } from 'date-fns';

export function transformAgendamento(ag: any) {
  if (!ag) return ag;
  const dataHora = ag.dataHora instanceof Date ? ag.dataHora : new Date(ag.dataHora);
  const servicos = ag.servicosAgendamento?.map((sa: any) => sa.servico).filter(Boolean) || [];
  const primeiroServico = servicos[0] || ag.servico;
  const valorTotal = ag.valorPago ?? (servicos.length > 0 ? servicos.reduce((s: number, sv: any) => s + (sv.valor || 0), 0) : ag.servico?.valor ?? 0);
  return {
    ...ag,
    codigo: ag.codigoUnico,
    data: format(dataHora, 'yyyy-MM-dd'),
    hora: format(dataHora, 'HH:mm'),
    valor: valorTotal,
    servicosAgendamento: ag.servicosAgendamento || (ag.servico ? [{ servico: ag.servico }] : []),
    servico: primeiroServico,
    codigoUnico: undefined,
    valorPago: undefined,
  };
}

export function transformAgendamentoList(agendamentos: any[]) {
  return agendamentos.map(transformAgendamento);
}

export function transformCliente(cliente: any) {
  if (!cliente) return cliente;
  return {
    ...cliente,
    saldoCredito: cliente.saldoCredito ?? 0,
    totalAgendamentos: cliente._count?.agendamentos ?? 0,
    _count: undefined,
  };
}

export function transformClienteList(clientes: any[]) {
  return clientes.map(transformCliente);
}
