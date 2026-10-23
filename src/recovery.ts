export type FailureKind = 'network' | 'format' | 'access' | 'unknown';
export function classifyFailure(message = ''): FailureKind {
  const value = message.toLowerCase();
  if (/\b(401|403)\b|unauthori[sz]ed|forbidden/.test(value)) return 'access';
  if (/unsupported|decoder|decode|codec|format not|format is not/.test(value)) return 'format';
  if (/network|timed? ?out|connection|internet|offline|\b(502|503|504)\b/.test(value)) return 'network';
  return 'unknown';
}
export function recoveryDelay(attempts: number, kind: FailureKind): number | null {
  return kind === 'format' || kind === 'access' || attempts >= 2 ? null : [1000, 3000][attempts] ?? null;
}
export const failureMessage = (kind: FailureKind) => kind === 'format'
  ? 'This stream uses a format this player could not open. Try another player.'
  : kind === 'access' ? 'Your provider refused this stream. Check your account or its simultaneous-stream limit.'
  : kind === 'network' ? 'The connection dropped or the provider did not respond. Check your network and try again.'
  : 'The stream could not be played. Try again or choose another player.';
export type RecoveryState = { mode: 'waiting' | 'reconnecting' | 'failed'; attempt: number; kind: FailureKind };
export class RecoveryCoordinator {
  private disposed = false;
  private attempts = 0;
  private scheduled: ReturnType<typeof setTimeout> | null = null;
  private inFlight = false;
  private pending: FailureKind | null = null;
  private operation: () => Promise<void>;
  private state: (state: RecoveryState) => void;
  private schedule: typeof setTimeout;
  private cancel: typeof clearTimeout;
  constructor(operation: () => Promise<void>, state: (state: RecoveryState) => void, schedule = setTimeout, cancel = clearTimeout) {
    this.operation = operation; this.state = state; this.schedule = schedule; this.cancel = cancel;
  }
  request(kind: FailureKind) {
    if (this.disposed || this.scheduled !== null) return;
    if (this.inFlight) { this.pending = kind; return; }
    const delay = recoveryDelay(this.attempts, kind);
    if (delay === null) { this.state({ mode: 'failed', attempt: this.attempts, kind }); return; }
    this.attempts++;
    this.state({ mode: 'waiting', attempt: this.attempts, kind });
    this.scheduled = this.schedule(() => {
      this.scheduled = null;
      if (this.disposed) return;
      this.inFlight = true;
      this.state({ mode: 'reconnecting', attempt: this.attempts, kind });
      void this.operation().catch(() => {
        this.pending = kind;
      }).finally(() => { this.inFlight = false; const reason = this.pending; this.pending = null; if (reason && !this.disposed) this.request(reason); });
    }, delay);
  }
  ready() { this.pending = null; if (this.scheduled !== null) this.cancel(this.scheduled); this.scheduled = null; }
  reset() { this.pending = null; if (this.scheduled !== null) this.cancel(this.scheduled); this.scheduled = null; this.attempts = 0; }
  dispose() { this.disposed = true; if (this.scheduled !== null) this.cancel(this.scheduled); this.scheduled = null; }
}
