// Spots on the nav buttons where the hero's butterflies can land. GlowNav registers one per button; the
// butterflies (ButterflyLayer.tsx) now and then fly to one and settle on it.
//
// The butterflies are drawn in the hero, underneath the nav, so the one sitting on a button is drawn by the nav
// itself: the 3D butterfly flies to the button, then hands over to a picture of the same butterfly resting on
// top of it, and takes over again when it flies off.

/** What a butterfly looks like, for drawing it resting on a button. */
export type ButterflyLook = {
  /** One (right) wing, as an image. The body runs along its left edge. */
  src: string;
  /** Wing width / height. */
  aspect: number;
  /** Where the body joins the wing, as a fraction of the wing's height from the top. */
  joint: number;
  /** One wing's width on screen (px). */
  size: number;
};

export type NavPerch = {
  /** The button. */
  el: HTMLElement;
  /** A butterfly is on it, or on its way to it. */
  busy: boolean;
  /** It's being pointed at: no landing on it, and any butterfly on it takes off. */
  startled: boolean;
  land: (look: ButterflyLook) => void;
  leave: () => void;
};

export const navPerches = new Set<NavPerch>();
