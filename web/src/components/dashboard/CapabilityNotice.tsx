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
          This client is not in a secure context. Live device playback requires HTTPS or localhost because most
          browsers only expose WebCodecs on secure origins.
        </p>
      ) : null}
      {!supportsWebCodecs ? (
        <p>
          This browser does not expose WebCodecs or `VideoDecoder` for this page. Dashboard presence will work,
          but live playback will remain unavailable until you use localhost, HTTPS, or a browser that exposes
          WebCodecs on this origin.
        </p>
      ) : null}
    </section>
  );
}
