import type { Audit } from './models';
import { labels, formatDate } from '../shared/format';
export const fieldLabels: Record<string, string> = {
  title: 'Título',
  name: 'Nome',
  description: 'Descrição',
  owner_id: 'Responsável',
  due_date: 'Prazo',
  status: 'Situação',
  priority: 'Prioridade',
  phase: 'Etapa do evento',
  rationale: 'Justificativa',
  activity_id: 'Atividade relacionada',
  author_id: 'Autoria',
  category: 'Categoria',
  responsibility: 'Responsabilidade',
  operational_status: 'Andamento operacional',
  stakeholder_id: 'Envolvido relacionado',
  contact: 'Contato',
  contribution: 'Apoio combinado',
  counterpart: 'Condições de reconhecimento',
  notes: 'Observações',
  summary: 'Resumo e aprendizados',
  location: 'Local',
  event_date: 'Data do evento',
  year: 'Ano',
  role: 'Perfil',
  active: 'Acesso ativo',
  email: 'E-mail',
  user_id: 'Pessoa vinculada',
  note: 'Contexto',
};
export function recordData(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}
export function auditTitle(item: Audit) {
  const after = recordData(item.after_data),
    before = recordData(item.before_data);
  return String(
    after.title ||
      after.name ||
      before.title ||
      before.name ||
      labels[item.entity_type] ||
      'Registro administrativo',
  );
}
export function auditChanges(item: Audit) {
  const before = recordData(item.before_data),
    after = recordData(item.after_data);
  return Object.keys({ ...before, ...after })
    .filter((key) => fieldLabels[key] && JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map((key) => ({ key, label: fieldLabels[key], before: before[key], after: after[key] }));
}
export function displayValue(key: string, value: unknown, names: Record<string, string> = {}) {
  if (value === null || value === undefined || value === '') return 'Não informado';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (key.endsWith('_date')) return formatDate(String(value));
  const s = String(value);
  return names[s] || labels[s] || s;
}
