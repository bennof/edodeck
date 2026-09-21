// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

interface EmbedOptions {
  mute: boolean;
}

const iframes = new WeakMap<HTMLElement, HTMLIFrameElement>();

function thumbUrl(id: string): string {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

function load(el: HTMLElement, id: string, { mute }: EmbedOptions): void {
  if (iframes.has(el)) return;
  const iframe = document.createElement('iframe');
  const params = new URLSearchParams({
    autoplay: '1',
    mute: mute ? '1' : '0',
    playsinline: '1',
    rel: '0',
  });
  iframe.src = `https://www.youtube.com/embed/${id}?${params}`;
  iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
  iframe.setAttribute('allowfullscreen', '');
  el.appendChild(iframe);
  iframes.set(el, iframe);
  el.classList.add('yt-playing');
}

function unload(el: HTMLElement): void {
  const iframe = iframes.get(el);
  if (iframe) {
    iframe.remove();
    iframes.delete(el);
  }
  el.classList.remove('yt-playing');
}

/**
 * Builds the thumbnail + play button for "click" embeds and switches to real
 * fullscreen on tap; leaving fullscreen resets back to the thumbnail instead
 * of letting the video keep playing offscreen. "auto" embeds only get a
 * badge — their lifecycle is tied to slide visibility, see
 * handleYoutubeAutoplay().
 */
export function setupYoutubeEmbeds(root: ParentNode): () => void {
  const disposers: Array<() => void> = [];

  root.querySelectorAll<HTMLElement>('.yt-embed[data-yt]').forEach((el) => {
    const id = el.dataset.yt;
    if (!id) return;
    el.style.backgroundImage = `url(${thumbUrl(id)})`;

    if (el.dataset.ytMode === 'auto') {
      const badge = document.createElement('div');
      badge.className = 'yt-auto-badge';
      badge.textContent = 'Auto-Play';
      el.appendChild(badge);
      return;
    }

    const play = document.createElement('div');
    play.className = 'yt-play';
    play.innerHTML =
      '<div class="yt-play-circle"><svg viewBox="0 0 24 24" fill="currentColor" style="color:#fff"><path d="M8 5v14l11-7z"/></svg></div>';
    el.appendChild(play);

    const onClick = (): void => {
      load(el, id, { mute: false });
      el.requestFullscreen?.().catch(() => {});
    };
    el.addEventListener('click', onClick);
    disposers.push(() => el.removeEventListener('click', onClick));
  });

  const onFullscreenChange = (): void => {
    if (document.fullscreenElement) return;
    root.querySelectorAll<HTMLElement>('.yt-embed[data-yt-mode="click"]').forEach((el) => {
      if (iframes.has(el)) unload(el);
    });
  };
  document.addEventListener('fullscreenchange', onFullscreenChange);
  disposers.push(() => document.removeEventListener('fullscreenchange', onFullscreenChange));

  return () => disposers.forEach((dispose) => dispose());
}

const autoPlaying = new Set<number>();

/** Runs on the same active/inactive lifecycle as the mount registry. */
export function handleYoutubeAutoplay(slides: HTMLElement[], activeIndex: number): void {
  slides.forEach((slide, i) => {
    const isActive = i === activeIndex;
    const wasActive = autoPlaying.has(i);
    if (isActive === wasActive) return;

    slide.querySelectorAll<HTMLElement>('.yt-embed[data-yt-mode="auto"]').forEach((el) => {
      const id = el.dataset.yt;
      if (!id) return;
      if (isActive) load(el, id, { mute: true });
      else unload(el);
    });

    if (isActive) autoPlaying.add(i);
    else autoPlaying.delete(i);
  });
}
