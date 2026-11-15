import { visitorPublic, jobPublic, contactPublic } from './domain.mjs';
import {gatheringArchiveBucket} from './gatheringProduct.mjs';

// Private shelves are projected from saved reports, never generated during browsing.
export function roomShelf(store, domain, room) {
  const role = room === 'archive' ? 'archivist' : room;
  const all = store.all('visits');
  const reports = store.all('reports');
  const visits = all.filter(v => v.kind !== 'anonymous').reverse().map(v => {
    const job = domain.jobs(v.id, true).find(j => j.roleId === role);
    const report = reports.filter(r => r.visitId === v.id && r.roleId === role && r.inputVersion === v.inputVersion && r.filterVersion === job?.filterVersion && !r.historical).at(-1);
    return { ...visitorPublic(v), job: job ? jobPublic(job) : null, report: report || null, contact: contactPublic(domain.contact(v.id)) };
  });
  const cards = visits.flatMap(v => {
    if (!v.report) return [];
    const c = v.report.content;
    if (role === 'specialist') return (c.project_cards || []).map((project, i) => ({ ...project, id: `${v.report.id}:${i}`, visitId: v.id, author: v.name, reportId: v.report.id }));
    if (role === 'curator') return [{ id: v.report.id, visitId: v.id, author: v.name, title: `${v.name}带来的阅读重点`, summary: c.summary, relevance: c.relevance, source_refs: c.source_refs }];
    return [];
  });
  const gatherings=store.all(gatheringArchiveBucket(domain.config().islandId)).filter(a=>a.agent===role).reverse();
  return { room, specialty: domain.config().filter.specialty || '', anonymousCount: all.filter(v => v.kind === 'anonymous').length, visits, cards, gatherings };
}
