export const labels: Record<string, string> = {
  admin: 'Administrador institucional',
  coordinator: 'Coordenador de edição',
  collaborator: 'Colaborador operacional',
  pending: 'Pendente',
  doing: 'Em andamento',
  done: 'Concluída',
  planning: 'Em preparação',
  active: 'Em realização',
  archived: 'Arquivada',
  create: 'Criação',
  update: 'Atualização',
  status: 'Situação alterada',
  assign: 'Vínculo de acesso',
  seed: 'Base de demonstração',
  activity: 'Atividade',
  decision: 'Decisão',
  edition: 'Edição',
  stakeholder: 'Envolvido',
  user: 'Usuário',
  membership: 'Vínculo',
};
export function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value));
}
export function isOverdue(
  due: string,
  status: string,
  today = new Date().toISOString().slice(0, 10),
) {
  return status !== 'done' && due.slice(0, 10) < today;
}
