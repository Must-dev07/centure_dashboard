'use client';

/**
 * Shows a shareable invitation link (app://invite/{token}) with a copy action.
 * The link is only ever shown in the response view that produced it: it is
 * never stored (no localStorage), logged, or put in a URL.
 */

import { useRef, useState } from 'react';

export default function InvitationLinkBox({ link }: { link: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'manual'>('idle');

  function selectLink() {
    inputRef.current?.focus();
    inputRef.current?.select();
  }

  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(link);
      setCopyState('copied');
    } catch {
      // Clipboard API unavailable (e.g. non-secure context): let the user copy manually.
      selectLink();
      setCopyState('manual');
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor="invitation-link" className="label">
        Invitation link
      </label>
      <div className="flex gap-2">
        <input
          id="invitation-link"
          ref={inputRef}
          className="input font-mono text-xs"
          value={link}
          readOnly
          onFocus={(e) => e.currentTarget.select()}
        />
        <button type="button" className="btn-primary shrink-0" onClick={copy}>
          {copyState === 'copied' ? 'Copied' : 'Copy link'}
        </button>
      </div>
      {copyState === 'manual' ? (
        <p className="text-xs text-amber-700">Copy is not available here — the link is selected, press Ctrl+C.</p>
      ) : null}
      <p className="text-xs text-slate-500">
        Send this link to the parent yourself (no email is sent). It is valid for 7 days and lets
        them create or link their account in the mobile app: on the sign-in screen, they tap
        &ldquo;I have an invitation link&rdquo; and paste it.
      </p>
    </div>
  );
}
