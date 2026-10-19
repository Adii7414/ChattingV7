import { useState } from 'react';
import { ArrowDown, ArrowUp, Megaphone, Plus, Trash2 } from 'lucide-react';
import { configureCommunity } from 'zitejs/api';
import { Switch } from '@project/components/ui/switch';
import { Checkbox } from '@project/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { cn } from '@project/components/lib/utils';
import { parseChannel, uid, type Category } from '../../lib/community';
import { Field, SaveButton, Section, input, useRun, type TabProps } from './kit';

const SLOW = [[0, 'Off'], [5, '5s'], [10, '10s'], [30, '30s'], [60, '1m'], [300, '5m'], [900, '15m'], [3600, '1h'], [21600, '6h']] as const;

export default function ChannelsTab({ d, reload }: TabProps) {
  const pos = (id: string) => { const i = d.s.channelOrder.indexOf(id); return i < 0 ? 999 : i; };
  const [order, setOrder] = useState(() => [...d.channels].sort((a, b) => pos(a.id) - pos(b.id)).map((c) => c.id));
  const [cats, setCats] = useState<Category[]>(d.s.categories);
  const [sel, setSel] = useState<string | null>(order[0] ?? null);
  const { busy, run } = useRun(reload);
  const byId = new Map(d.channels.map((c) => [c.id, c]));
  const move = (i: number, dir: -1 | 1) => setOrder((o) => { const n = [...o]; const j = i + dir; if (j < 0 || j >= n.length) return o; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const cur = sel ? byId.get(sel) : undefined;

  return (
    <div className="space-y-5">
      <Section title="Categories" desc="Group channels under headings in the sidebar.">
        {cats.map((c, i) => (
          <div key={c.id} className="flex gap-2">
            <input value={c.name} onChange={(e) => setCats(cats.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} maxLength={40} className={input} aria-label="Category name" />
            <button onClick={() => setCats(cats.filter((x) => x.id !== c.id))} aria-label="Delete category" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <button onClick={() => setCats([...cats, { id: uid(), name: 'New category' }])} className="flex items-center gap-1.5 text-sm font-medium text-primary"><Plus className="h-4 w-4" /> Add category</button>
      </Section>
      <Section title="Channel order">
        {order.map((id, i) => byId.get(id) && (
          <div key={id} className={cn('flex items-center gap-2 rounded-xl px-2 py-1.5', sel === id ? 'bg-secondary' : 'hover:bg-secondary/60')}>
            <button onClick={() => setSel(id)} className="flex-1 truncate text-left text-sm">{byId.get(id)!.emoji || '#'} {byId.get(id)!.name}</button>
            <button onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp className="h-4 w-4 text-muted-foreground" /></button>
            <button onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown className="h-4 w-4 text-muted-foreground" /></button>
          </div>
        ))}
        <SaveButton busy={busy === 'l'} onClick={() => run('l', () => configureCommunity({ communityId: d.id, action: 'layout', layout: { categories: cats.map((c) => ({ ...c, name: c.name.trim() || 'Category' })), channelOrder: order } }), 'Layout saved')}>Save categories & order</SaveButton>
      </Section>
      {cur && <ChannelEditor key={cur.id} ch={cur} d={d} reload={reload} cats={d.s.categories} />}
    </div>
  );
}

function ChannelEditor({ ch, d, reload, cats }: TabProps & { ch: TabProps['d']['channels'][number]; cats: Category[] }) {
  const s0 = parseChannel(ch.settings);
  const [c, setC] = useState({ name: ch.name, emoji: ch.emoji, ...s0 });
  const { busy, run } = useRun(reload);
  return (
    <Section title={`Edit #${ch.name}`}>
      <div className="flex gap-2"><input value={c.emoji} onChange={(e) => setC({ ...c, emoji: e.target.value })} maxLength={4} placeholder="#" aria-label="Channel emoji" className={`${input} w-14 text-center`} /><input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} maxLength={60} className={input} aria-label="Channel name" /></div>
      <Field label="Topic"><input value={c.topic} onChange={(e) => setC({ ...c, topic: e.target.value })} maxLength={300} placeholder="What’s this channel for?" className={input} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Category">
          <Select value={c.category ?? 'none'} onValueChange={(v) => setC({ ...c, category: v === 'none' ? null : v })}>
            <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="none">No category</SelectItem>{cats.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Slow mode">
          <Select value={String(c.slowmode)} onValueChange={(v) => setC({ ...c, slowmode: Number(v) })}>
            <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{SLOW.map(([v, l]) => <SelectItem key={v} value={String(v)}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
      <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"><span className="flex items-center gap-2 text-sm"><Megaphone className="h-4 w-4" /> Announcement channel (only roles with “Post in announcement channels” can write)</span><Switch checked={c.announcement} onCheckedChange={(announcement) => setC({ ...c, announcement })} /></label>
      <Field label="Who can see this channel" hint="Leave all unticked for everyone. Ticked = private to those roles (plus channel managers).">
        <div className="flex flex-wrap gap-2">
          {d.s.roles.map((r) => (
            <label key={r.id} className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm">
              <Checkbox checked={c.allowedRoles.includes(r.id)} onCheckedChange={(v) => setC({ ...c, allowedRoles: v ? [...c.allowedRoles, r.id] : c.allowedRoles.filter((x) => x !== r.id) })} />
              <span style={{ color: r.color }}>{r.name}</span>
            </label>
          ))}
          {!d.s.roles.length && <span className="text-sm text-muted-foreground">Create roles first to make private channels.</span>}
        </div>
      </Field>
      <div className="flex flex-wrap gap-2">
        <SaveButton busy={busy === 's'} onClick={() => run('s', () => configureCommunity({ communityId: d.id, action: 'channel', channel: { id: ch.id, name: c.name, emoji: c.emoji, topic: c.topic, category: c.category, slowmode: c.slowmode, announcement: c.announcement, allowedRoles: c.allowedRoles } }), 'Channel saved')}>Save channel</SaveButton>
        <SaveButton danger busy={busy === 'd'} onClick={() => run('d', () => configureCommunity({ communityId: d.id, action: 'deleteChannel', userId: ch.id }), 'Channel deleted')}>Delete channel</SaveButton>
      </div>
    </Section>
  );
}
