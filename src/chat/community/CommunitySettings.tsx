import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, BarChart3, CalendarDays, Hash, History, Palette, Shield, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { getCommunity } from 'zitejs/api';
import { Skeleton } from '@project/components/ui/skeleton';
import { cn } from '@project/components/lib/utils';
import { parseCommunity } from '../../lib/community';
import { useChat } from '../store';
import type { Data } from './kit';
import ProfileTab from './ProfileTab';
import RolesTab from './RolesTab';
import MembersTab from './MembersTab';
import ChannelsTab from './ChannelsTab';
import ModerationTab, { AuditTab } from './ModerationTab';
import EventsTab from './EventsTab';
import InsightsTab from './InsightsTab';
import CustomiseTab from './CustomiseTab';
import VerificationTab from './VerificationTab';
import { Verified } from '../official';
import { errorMessage } from '../../lib/errors';

const TABS = [
  { k: 'profile', l: 'Look & profile', i: Palette, need: 'manageCommunity', g: 'General' },
  { k: 'customise', l: 'Customise', i: Sparkles, need: 'manageCommunity', g: 'General' },
  { k: 'channels', l: 'Channels', i: Hash, need: 'manageChannels', g: 'General' },
  { k: 'events', l: 'Events', i: CalendarDays, need: null, g: 'General' },
  { k: 'members', l: 'Members', i: Users, need: null, g: 'People' },
  { k: 'roles', l: 'Roles', i: ShieldCheck, need: 'manageRoles', g: 'People' },
  { k: 'moderation', l: 'Moderation', i: Shield, need: null, g: 'Safety' },
  { k: 'audit', l: 'Audit log', i: History, need: 'manageCommunity', g: 'Safety' },
  { k: 'insights', l: 'Insights', i: BarChart3, need: null, g: 'Growth' },
  { k: 'verification', l: 'Verification', i: BadgeCheck, need: 'manageCommunity', g: 'Growth' },
] as const;
type K = (typeof TABS)[number]['k'];

export default function CommunitySettings() {
  const { communityId = '' } = useParams();
  const { refresh } = useChat();
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<K | null>(null);
  const load = useCallback(async () => {
    try { const r = await getCommunity({ communityId }); setD({ ...r, id: communityId, s: parseCommunity(r.settings) }); setErr(null); } catch (e) { setErr(errorMessage(e, 'You don’t have access to this community.')); }
    refresh();
  }, [communityId, refresh]);
  useEffect(() => { setD(null); load(); }, [load]);

  if (err) return <section className="grid flex-1 place-items-center px-6 text-center text-muted-foreground"><div><p>{err}</p><Link to="/app" className="mt-2 inline-block underline">Go back</Link></div></section>;
  const tabs = d ? TABS.filter((t) => !t.need || d.myPerms.includes(t.need)) : [];
  const active = tab && tabs.some((t) => t.k === tab) ? tab : tabs[0]?.k;
  const props = d ? { d, reload: load } : null;
  const groups = [...new Set(tabs.map((t) => t.g))];
  const accent = d?.s.accent ?? '#0f766e';

  const badge = (k: K) => k === 'moderation' && d && d.pending.length > 0 && <span className="ml-auto rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground">{d.pending.length}</span>;

  return (
    <section className="flex min-w-0 flex-1 overflow-hidden">
      <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-card/40 md:flex">
        <div className="h-20 shrink-0" style={{ background: d?.s.banner ? `url(${d.s.banner}) center/cover` : `linear-gradient(135deg, ${accent}, ${accent}66)` }} />
        <div className="px-4">
          <div className="-mt-7 grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border-4 border-background bg-secondary text-2xl">{d?.s.icon ? <img src={d.s.icon} alt="" className="h-full w-full object-cover" /> : d?.emoji || d?.name[0]}</div>
          {d ? <p className="mt-2 flex items-center gap-1 font-semibold"><span className="truncate">{d.name}</span>{d.verified && <Verified community />}</p> : <Skeleton className="mt-2 h-5 w-32" />}
          <Link to="/app" className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Back to chats</Link>
        </div>
        <nav className="mt-5 space-y-4 px-3 pb-6">
          {!d && <Skeleton className="h-64 rounded-xl" />}
          {groups.map((g) => (
            <div key={g}>
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g}</p>
              {tabs.filter((t) => t.g === g).map((t) => (
                <button key={t.k} onClick={() => setTab(t.k)} className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition', active === t.k ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}>
                  <t.i className="h-4 w-4" />{t.l}{badge(t.k)}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:hidden">
          <Link to="/app" className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft className="h-3 w-3" /> {d?.name ?? 'Back'}</Link>
          <div className="mt-2 flex gap-1.5 overflow-x-auto">
            {tabs.map((t) => (
              <button key={t.k} onClick={() => setTab(t.k)} className={cn('flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm', active === t.k ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground')}>
                <t.i className="h-3.5 w-3.5" />{t.l}
              </button>
            ))}
          </div>
        </div>
        <div className="mx-auto w-full max-w-4xl px-4 py-6 pb-16 sm:px-8 sm:py-10">
          {active && <h1 className="mb-5 text-2xl font-semibold tracking-tight">{TABS.find((t) => t.k === active)?.l}</h1>}
          {!props ? <Skeleton className="h-96 rounded-3xl" /> : (
            <div key={`${active}-${d?.s.audit[0]?.at ?? ''}`}>
              {active === 'profile' && <ProfileTab {...props} />}
              {active === 'customise' && <CustomiseTab {...props} />}
              {active === 'channels' && <ChannelsTab {...props} />}
              {active === 'roles' && <RolesTab {...props} />}
              {active === 'members' && <MembersTab {...props} />}
              {active === 'moderation' && <ModerationTab {...props} />}
              {active === 'audit' && <AuditTab {...props} />}
              {active === 'events' && <EventsTab {...props} />}
              {active === 'insights' && <InsightsTab {...props} />}
              {active === 'verification' && <VerificationTab {...props} />}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
