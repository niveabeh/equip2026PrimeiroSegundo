import { describe, it, expect } from 'vitest';
import { isOverdue, formatDate } from './format';
describe('prazos administrativos', () => {
  it('só sinaliza atraso em atividades abertas e anteriores a hoje', () => {
    expect(isOverdue('2026-10-01', 'pending', '2026-11-11')).toBe(true);
    expect(isOverdue('2026-10-01', 'done', '2026-11-11')).toBe(false);
    expect(isOverdue('2026-11-11', 'doing', '2026-11-11')).toBe(false);
  });
  it('mantém a data civil independente do fuso', () =>
    expect(formatDate('2027-05-22')).toBe('22/05/2027'));
});
