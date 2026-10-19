import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { createCommunity, manageCommunity } from 'zitejs/api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Switch } from '@project/components/ui/switch';
import { useChat } from './store';
import { errorMessage } from '../lib/errors';

type State = { mode: 'create' } | { mode: 'channel'; communityId: string } | null;
const field = 'focus-ring h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none';

export default function CommunityDialog({ state, onClose }: { state: State; onClose: () => void }) {
  const { refresh } = useChat();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const isChannel = state?.mode === 'channel';
  const valid = name.trim().length >= (isChannel ? 1 : 2);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state || !valid) return;
    setBusy(true);
    try {
      const channelId = state.mode === 'create'
        ? (await createCommunity({ name, emoji, description, isPublic })).channelId
        : (await manageCommunity({ communityId: state.communityId, action: 'createChannel', name, description })).channelId;
      await refresh();
      toast.success(isChannel ? 'Channel created' : 'Community created');
      onClose();
      if (channelId) navigate(`/app/c/${channelId}`);
    } catch (err) {
      toast.error(errorMessage(err, 'Something went wrong'));
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl tracking-tight">{isChannel ? 'New channel' : 'Create a community'}</DialogTitle>
          <DialogDescription>{isChannel ? 'Everyone in the community can see and post in channels.' : 'A home for your club, team or neighbourhood, with as many channels as you need.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="flex gap-2">
            {!isChannel && <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} placeholder="🌿" aria-label="Emoji" className={`${field} w-14 text-center text-lg`} />}
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder={isChannel ? 'channel-name' : 'Community name'} className={field} />
          </div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} placeholder="What’s it about? (optional)" className={`${field} h-auto py-2.5`} />
          {!isChannel && (
            <label className="flex items-center justify-between rounded-xl border border-border p-3">
              <span><span className="block text-sm font-medium">Public</span><span className="text-xs text-muted-foreground">Anyone can find and join it in Discover. Private ones are invite-link only.</span></span>
              <Switch checked={isPublic} onCheckedChange={setPublic} />
            </label>
          )}
          <button disabled={!valid || busy} className="focus-ring flex h-11 w-full items-center justify-center gap-2 rounded-full bg-foreground font-medium text-background disabled:opacity-40">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}{isChannel ? 'Create channel' : 'Create community'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
