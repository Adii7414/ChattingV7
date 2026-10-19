import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDebouncedCallback } from 'use-debounce';
import { formatDistanceToNowStrict, isToday, format } from 'date-fns';
import { Archive, BellOff, ChevronDown, CheckCheck, Command, Compass, LogOut, Pin, Plus, Search, ArrowUpDown, MailQuestion, UserRound, FolderPlus, Settings, SquarePen, Star, Users, X } from 'lucide-react';
import { logout } from 'zitejs/auth';
import { markAllRead, searchMessages, type SearchMessagesOutputType } from 'zitejs/api';
import { toast } from 'sonner';
import { cn } from '@project/components/lib/utils';
import { Skeleton } from '@project/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@project/components/ui/dropdown-menu';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';
import PersonAvatar, { ConvAvatar } from './Avatars';
import NewChatDialog from './NewChatDialog';
import CommunityDialog from './CommunityDialog';
import { useChat, type Community, type Conversation } from './store';
import { parseCommunity } from '../lib/community';
import { getPrefs, setPrefs, usePrefs, type Folder } from './prefs';
import FolderDialog from './FolderDialog';
import { Verified } from './official';
import { usePendingFriends } from './Friends';
import { errorMessage } from '../lib/errors';

export const shortTime = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isToday(d)) return format(d, 'h:mm a');
  return Date.now() - d.getTime() < 6 * 864e5 ? format(d, 'EEE') : format(d, 'd MMM');
};

function Row({ c, active, compact }: { c: Conversation; active: boolean; compact?: boolean }) {
  const { titleOf } = useChat();
  usePrefs(); // re-render when a chat is renamed for me
  const badge = c.unread > 0 && (
    <span className={cn('grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[11px] font-semibold', c.muted ? 'bg-muted-foreground/30 text-foreground' : 'bg-primary text-primary-foreground')}>{c.unread > 99 ? '99+' : c.unread}</span>
  );
  if (compact) {
    return (
      <Link to={`/app/c/${c.id}`} className={cn('flex items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-sm transition', active ? 'bg-secondary font-medium' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground', c.unread > 0 && 'font-semibold text-foreground')}>
        <span className="flex min-w-0 items-center gap-1"><span className="truncate">{titleOf(c)}</span>{c.official && <Verified className="h-3.5 w-3.5" />}</span>{c.muted ? <BellOff className="h-3.5 w-3.5" /> : badge}
      </Link>
    );
  }
  return (
    <Link to={`/app/c/${c.id}`} className={cn('flex items-center gap-3 rounded-2xl px-3 py-2.5 transition', active ? 'bg-secondary' : 'hover:bg-secondary/60')}>
      <ConvAvatar c={c} size={46} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn('flex min-w-0 items-center gap-1.5', c.unread ? 'font-semibold' : 'font-medium')}>
            <span className="truncate">{titleOf(c)}</span>
            {c.official && <Verified />}
            {c.pinned && <Pin className="h-3 w-3 shrink-0 text-muted-foreground" />}
            {c.muted && <BellOff className="h-3 w-3 shrink-0 text-muted-foreground" />}
          </p>
          <span className="shrink-0 text-xs text-muted-foreground">{shortTime(c.lastMessageAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          {getPrefs().sidebarPreviews && <p className={cn('truncate text-sm', c.unread ? 'text-foreground' : 'text-muted-foreground')}>{c.preview ?? (c.isGroup ? 'Group created' : 'No messages yet')}</p>}
          {badge}
        </div>
      </div>
    </Link>
  );
}

function Results({ results, onPick }: { results: SearchMessagesOutputType['results']; onPick: () => void }) {
  const { conversations, titleOf, people, me } = useChat();
  if (!results.length) return null;
  return (
    <div className="mb-3">
      <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">Messages</p>
      {results.map((r) => {
        const c = conversations?.find((x) => x.id === r.conversationId);
        const who = r.senderId === me.id ? 'You' : people.get(r.senderId)?.name ?? 'Someone';
        return (
          <Link key={r.id} to={`/app/c/${r.conversationId}`} onClick={onPick} className="block rounded-2xl px-3 py-2 hover:bg-secondary/60">
            <p className="text-xs text-muted-foreground">{c ? titleOf(c) : 'Chat'} · {formatDistanceToNowStrict(new Date(r.sentAt))} ago</p>
            <p className="truncate text-sm"><span className="text-muted-foreground">{who}: </span>{r.body}</p>
          </Link>
        );
      })}
    </div>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => <p className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{children}</p>;

function ChatsList({ q, activeId, onNew }: { q: string; activeId?: string; onNew: () => void }) {
  const { conversations, titleOf } = useChat();
  const [filter, setFilter] = useState<string>('all');
  const prefs = usePrefs();
  const [folderEdit, setFolderEdit] = useState<{ f: Folder | null } | null>(null);
  const folder = prefs.folders.find((f) => f.id === filter);
  const [showArchived, setShowArchived] = useState(false);
  if (conversations === null) {
    return <>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="flex items-center gap-3 px-3 py-2.5"><Skeleton className="h-11 w-11 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-1/2" /><Skeleton className="h-3 w-3/4" /></div></div>)}</>;
  }
  const requests = conversations.filter((c) => c.request === 'incoming');
  const all = conversations.filter((c) => !c.communityId && c.request !== 'incoming' && (!q || titleOf(c).toLowerCase().includes(q.toLowerCase())));
  const archived = all.filter((c) => c.archived);
  const list = all.filter((c) => !c.archived && (folder ? folder.ids.includes(c.id) : filter === 'all' || (filter === 'unread' ? c.unread > 0 : filter === 'groups' ? c.isGroup : !c.isGroup)));
  if (prefs.sort === 'az') list.sort((a, b) => titleOf(a).localeCompare(titleOf(b)));
  else if (prefs.sort === 'unread') list.sort((a, b) => b.unread - a.unread);
  const pinned = list.filter((c) => c.pinned);
  const rest = list.filter((c) => !c.pinned);
  if (!all.length && !q) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="font-semibold">No conversations yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Message a friend or start a group.</p>
        <button onClick={onNew} className="mt-5 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background">New conversation</button>
      </div>
    );
  }
  if (showArchived) {
    return (
      <>
        <button onClick={() => setShowArchived(false)} className="mb-1 flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">← Back to chats</button>
        <Label>Archived</Label>
        {archived.map((c) => <Row key={c.id} c={c} active={c.id === activeId} />)}
        {!archived.length && <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nothing archived.</p>}
      </>
    );
  }
  return (
    <>
      {!q && (
        <div className="flex gap-1.5 overflow-x-auto px-2 pb-2 pt-1">
          {(['all', 'unread', 'direct', 'groups'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn('shrink-0 rounded-full border px-3 py-1 text-xs font-medium capitalize transition', filter === f ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:text-foreground')}>{f}</button>
          ))}
          {prefs.folders.map((f) => {
            const n = all.filter((c) => f.ids.includes(c.id) && c.unread > 0).length;
            return (
              <button key={f.id} onClick={() => setFilter(f.id)} onDoubleClick={() => setFolderEdit({ f })} title="Double-click to edit"
                className={cn('flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition', filter === f.id ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:text-foreground')}>
                {f.name}{n > 0 && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </button>
            );
          })}
          <button onClick={() => setFolderEdit({ f: null })} aria-label="New folder" title="New folder" className="grid h-6 w-7 shrink-0 place-items-center rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground"><FolderPlus className="h-3.5 w-3.5" /></button>
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="Sort chats" title="Sort" className="ml-auto grid h-6 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground"><ArrowUpDown className="h-3.5 w-3.5" /></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs">Sort chats</DropdownMenuLabel>
              {([['recent', 'Most recent'], ['unread', 'Unread first'], ['az', 'A–Z']] as const).map(([k, l]) => <DropdownMenuItem key={k} onClick={() => setPrefs({ sort: k })}>{l}{prefs.sort === k && ' ✓'}</DropdownMenuItem>)}
              {folder && <><DropdownMenuSeparator /><DropdownMenuItem onClick={() => setFolderEdit({ f: folder })}>Edit “{folder.name}” folder</DropdownMenuItem></>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      {requests.length > 0 && !q && (
        <Link to="/app/friends?tab=requests" className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm hover:bg-secondary/60">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary"><MailQuestion className="h-4 w-4" /></span><span className="flex-1 text-left font-medium">Message requests</span><span className="rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">{requests.length}</span>
        </Link>
      )}
      {archived.length > 0 && !q && (
        <button onClick={() => setShowArchived(true)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm hover:bg-secondary/60">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary"><Archive className="h-4 w-4" /></span><span className="flex-1 text-left font-medium">Archived</span><span className="text-xs text-muted-foreground">{archived.length}</span>
        </button>
      )}
      {pinned.length > 0 && <><Label>Pinned</Label>{pinned.map((c) => <Row key={c.id} c={c} active={c.id === activeId} />)}<Label>All chats</Label></>}
      {rest.map((c) => <Row key={c.id} c={c} active={c.id === activeId} />)}
      {!list.length && <p className="px-3 py-10 text-center text-sm text-muted-foreground">{filter === 'unread' ? 'You’re all caught up ✨' : 'Nothing here yet.'}</p>}
      <FolderDialog open={!!folderEdit} folder={folderEdit?.f ?? null} onOpenChange={(o) => !o && setFolderEdit(null)} />
    </>
  );
}

function CommunityBlock({ cm, activeId, onChannel }: { cm: Community; activeId?: string; onChannel: (id: string) => void }) {
  const { conversations, can, channelOf } = useChat();
  const s = parseCommunity(cm.settings);
  const [open, setOpen] = useState(true);
  const chans = (conversations ?? []).filter((c) => c.communityId === cm.id);
  const pos = (id: string) => { const i = s.channelOrder.indexOf(id); return i < 0 ? 999 : i; };
  chans.sort((a, b) => pos(a.id) - pos(b.id) || (a.name ?? '').localeCompare(b.name ?? ''));
  const groups = [{ id: null as string | null, name: '' }, ...s.categories].map((g) => ({ ...g, list: chans.filter((c) => (channelOf(c).category ?? null) === g.id || (g.id === null && !s.categories.some((x) => x.id === channelOf(c).category))) }));
  const manage = can(cm.id, 'manageCommunity') || can(cm.id, 'manageChannels') || can(cm.id, 'manageRoles') || can(cm.id, 'ban');
  const unread = chans.reduce((n, c) => n + (c.muted ? 0 : c.unread), 0);
  return (
    <div className="mb-2 overflow-hidden rounded-2xl" style={{ boxShadow: `inset 3px 0 0 ${s.accent}` }}>
      <div className="flex items-center gap-2 px-3 pb-1 pt-2.5">
        <button onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          {s.icon ? <img src={s.icon} alt="" className="h-7 w-7 rounded-lg object-cover" /> : <span className="grid h-7 w-7 place-items-center rounded-lg text-sm" style={{ background: `${s.accent}22` }}>{cm.emoji || cm.name[0]}</span>}
          <p className="flex min-w-0 flex-1 items-center gap-1 text-sm font-semibold"><span className="truncate">{cm.name}</span>{cm.verified && <Verified community className="h-3.5 w-3.5" />}</p>
          {!open && unread > 0 && <span className="h-2 w-2 rounded-full bg-primary" />}
          <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition', !open && '-rotate-90')} />
        </button>
        {can(cm.id, 'manageChannels') && <button onClick={() => onChannel(cm.id)} aria-label="New channel" title="New channel" className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-secondary"><Plus className="h-3.5 w-3.5" /></button>}
        {manage && (
          <Link to={`/app/community/${cm.id}`} aria-label="Community settings" title="Community settings" className="relative grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-secondary">
            <Settings className="h-3.5 w-3.5" />{s.pending.length > 0 && can(cm.id, 'ban') && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-destructive" />}
          </Link>
        )}
      </div>
      {open && groups.map((g) => g.list.length > 0 && (
        <div key={g.id ?? 'none'}>
          {g.name && <p className="px-4 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{g.name}</p>}
          {g.list.map((c) => <Row key={c.id} c={c} active={c.id === activeId} compact />)}
        </div>
      ))}
    </div>
  );
}

function CommunitiesList({ activeId, onCreate, onChannel }: { activeId?: string; onCreate: () => void; onChannel: (id: string) => void }) {
  const { communities } = useChat();
  return (
    <>
      {communities.map((cm) => <CommunityBlock key={cm.id} cm={cm} activeId={activeId} onChannel={onChannel} />)}
      {!communities.length && <p className="px-6 pb-4 pt-10 text-center text-sm text-muted-foreground">Communities bring channels for a club, team or neighbourhood together in one place.</p>}
      <div className="grid grid-cols-2 gap-2 px-2 pt-3">
        <Link to="/app/discover" className="flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-secondary"><Compass className="h-4 w-4" /> Discover</Link>
        <button onClick={onCreate} className="flex items-center justify-center gap-2 rounded-xl bg-foreground py-2.5 text-sm font-medium text-background"><Plus className="h-4 w-4" /> Create</button>
      </div>
    </>
  );
}

export default function Sidebar({ hideOnMobile }: { hideOnMobile?: boolean }) {
  const { me, conversations, refresh } = useChat();
  const { id } = useParams();
  const navigate = useNavigate();
  const activeComm = conversations?.find((c) => c.id === id)?.communityId;
  const [tab, setTab] = useState<'chats' | 'communities'>(activeComm ? 'communities' : 'chats');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchMessagesOutputType['results']>([]);
  const [newOpen, setNewOpen] = useState(false);
  const [comm, setComm] = useState<{ mode: 'create' } | { mode: 'channel'; communityId: string } | null>(null);
  useEffect(() => { const f = () => setNewOpen(true); window.addEventListener('new-chat', f); return () => window.removeEventListener('new-chat', f); }, []);
  const runSearch = useDebouncedCallback(async (v: string) => {
    if (v.trim().length < 2) return setResults([]);
    try { setResults((await searchMessages({ query: v })).results); } catch { setResults([]); }
  }, 300);
  const commUnread = (conversations ?? []).filter((c) => c.communityId && !c.muted).reduce((n, c) => n + c.unread, 0);
  const pendingFriends = usePendingFriends();
  const chatUnread = (conversations ?? []).filter((c) => !c.communityId && !c.muted && c.request !== 'incoming').reduce((n, c) => n + c.unread, 0);

  return (
    <aside className={cn('flex w-full flex-col border-r border-border md:w-[340px] lg:w-[380px]', hideOnMobile && 'hidden md:flex')}>
      <header className="flex items-center justify-between px-4 pb-2 pt-4">
        <button onClick={() => navigate('/')} aria-label="Home"><Logo /></button>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link to="/app/friends" aria-label="Friends" title="Friends" className="focus-ring relative grid h-10 w-10 place-items-center rounded-full hover:bg-secondary"><UserRound className="h-[18px] w-[18px]" />{pendingFriends > 0 && <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">{pendingFriends}</span>}</Link>
          <button onClick={() => setNewOpen(true)} aria-label="New conversation" className="focus-ring grid h-10 w-10 place-items-center rounded-full hover:bg-secondary"><SquarePen className="h-[18px] w-[18px]" /></button>
          <DropdownMenu>
            <DropdownMenuTrigger className="focus-ring ml-1 rounded-full"><PersonAvatar name={me.name} image={me.image} size={32} /></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel><p className="truncate">{me.name}</p><p className="truncate text-xs font-normal text-muted-foreground">{me.email}</p></DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/app/settings')}><Settings className="mr-2 h-4 w-4" /> Profile & settings</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/app/discover')}><Compass className="mr-2 h-4 w-4" /> Discover communities</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/app/saved')}><Star className="mr-2 h-4 w-4" /> Saved messages</DropdownMenuItem>
              <DropdownMenuItem onClick={async () => { try { await markAllRead({}); await refresh(); toast.success('All caught up'); } catch (e) { toast.error(errorMessage(e, 'Couldn’t mark as read')); } }}><CheckCheck className="mr-2 h-4 w-4" /> Mark all as read</DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.dispatchEvent(new Event('open-palette'))}><Command className="mr-2 h-4 w-4" /> Quick switch <span className="ml-auto text-xs text-muted-foreground">Ctrl K</span></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}><LogOut className="mr-2 h-4 w-4" /> Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div className="space-y-3 px-4 pb-2 pt-2">
        <label className="flex h-10 items-center gap-2 rounded-xl bg-secondary px-3 focus-within:ring-2 focus-within:ring-ring">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => { setQ(e.target.value); runSearch(e.target.value); }} placeholder="Search chats and messages" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          {q && <button onClick={() => { setQ(''); setResults([]); }} aria-label="Clear"><X className="h-4 w-4 text-muted-foreground" /></button>}
        </label>
        {!q && (
          <div className="grid grid-cols-2 rounded-xl bg-secondary p-1 text-sm font-medium">
            {([['chats', 'Chats', chatUnread], ['communities', 'Communities', commUnread]] as const).map(([k, l, n]) => (
              <button key={k} onClick={() => setTab(k)} className={cn('flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition', tab === k ? 'bg-background shadow-sm' : 'text-muted-foreground')}>
                {k === 'communities' && <Users className="h-3.5 w-3.5" />}{l}{n > 0 && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </button>
            ))}
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {q && <Results results={results} onPick={() => setQ('')} />}
        {q || tab === 'chats'
          ? <ChatsList q={q} activeId={id} onNew={() => setNewOpen(true)} />
          : <CommunitiesList activeId={id} onCreate={() => setComm({ mode: 'create' })} onChannel={(cid) => setComm({ mode: 'channel', communityId: cid })} />}
      </nav>
      <NewChatDialog open={newOpen} onOpenChange={setNewOpen} />
      <CommunityDialog state={comm} onClose={() => setComm(null)} key={comm ? JSON.stringify(comm) : 'none'} />
    </aside>
  );
}
