interface CapabilityNoticeProps {
  isSecureContext: boolean;
  supportsWebCodecs: boolean;
}

export function CapabilityNotice({ isSecureContext, supportsWebCodecs }: CapabilityNoticeProps) {
  if (isSecureContext && supportsWebCodecs) {
    return null;
  }

  return (
    <section className="capability-notice" aria-live="polite">
      {!isSecureContext ? (
        <p>
          This client is not in a secure context. Live device playback will require HTTPS or localhost before
          the player bead can decode streams.
        </p>
      ) : null}
      {!supportsWebCodecs ? (
        <p>
          This browser does not expose WebCodecs. Dashboard presence will work, but live playback support will
          be unavailable until a compatible browser is used.
        </p>
      ) : null}
    </section>
  );
}
