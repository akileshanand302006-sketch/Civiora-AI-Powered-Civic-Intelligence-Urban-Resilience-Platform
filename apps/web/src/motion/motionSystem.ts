// ============================================================
// CivicPulse Centralized Motion Design System (Anime.js)
// ============================================================
// Reusable motion engine adhering to CivicPulse physics:
// State, Depth, Focus, Progress, Relationship, Feedback.
// ============================================================

import anime from 'animejs';

export function isReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Animate page transition entrance with spring-damped opacity and elevation */
export function animatePageEnter(target: HTMLElement | string, onComplete?: () => void): void {
  if (isReducedMotion()) return;

  anime({
    targets: target,
    opacity: [0, 1],
    translateY: [24, 0],
    scale: [0.985, 1],
    easing: 'cubicBezier(0.16, 1, 0.3, 1)',
    duration: 550,
    complete: onComplete,
  });
}

/** Staggered reveal of glass surfaces, cards, or metric nodes */
export function animateGlassReveal(
  targets: HTMLElement[] | NodeListOf<Element> | string,
  delayBetween: number = 60,
  onComplete?: () => void,
): void {
  if (isReducedMotion()) return;

  anime({
    targets,
    opacity: [0, 1],
    translateY: [30, 0],
    scale: [0.96, 1],
    delay: anime.stagger(delayBetween),
    easing: 'cubicBezier(0.16, 1, 0.3, 1)',
    duration: 600,
    complete: onComplete,
  });
}

/** Smooth numeric counter rolling animation for metrics and telemetry */
export function animateMetric(
  targetElement: HTMLElement,
  startValue: number,
  endValue: number,
  formatSuffix: string = '',
  duration: number = 1400,
): void {
  const obj = { val: startValue };

  anime({
    targets: obj,
    val: endValue,
    round: 1,
    easing: 'easeOutExpo',
    duration: isReducedMotion() ? 10 : duration,
    update: () => {
      targetElement.textContent = `${Math.round(obj.val).toLocaleString()}${formatSuffix}`;
    },
  });
}

/** AI neural scanning pulse wave animation across visual target */
export function animateAIProcessing(
  scannerLineTarget: HTMLElement | string,
  radarCircleTarget?: HTMLElement | string,
): void {
  if (isReducedMotion()) return;

  anime({
    targets: scannerLineTarget,
    top: ['0%', '100%'],
    direction: 'alternate',
    loop: true,
    easing: 'easeInOutQuad',
    duration: 1800,
  });

  if (radarCircleTarget) {
    anime({
      targets: radarCircleTarget,
      scale: [0.8, 1.3],
      opacity: [0.8, 0],
      loop: true,
      easing: 'easeOutQuad',
      duration: 1500,
    });
  }
}

/** Interactive drawer/panel expansion with spring dampening */
export function animatePanelExpand(
  panelTarget: HTMLElement | string,
  expanded: boolean,
  onComplete?: () => void,
): void {
  anime({
    targets: panelTarget,
    translateX: expanded ? [320, 0] : [0, 320],
    opacity: expanded ? [0, 1] : [1, 0],
    easing: 'cubicBezier(0.19, 1, 0.22, 1)',
    duration: 400,
    complete: onComplete,
  });
}

/** Floating notification capsule entrance and exit */
export function animateNotification(
  toastElement: HTMLElement | string,
  action: 'enter' | 'exit',
  onComplete?: () => void,
): void {
  if (action === 'enter') {
    anime({
      targets: toastElement,
      opacity: [0, 1],
      translateY: [-20, 0],
      scale: [0.92, 1],
      easing: 'cubicBezier(0.34, 1.56, 0.64, 1)',
      duration: 420,
      complete: onComplete,
    });
  } else {
    anime({
      targets: toastElement,
      opacity: [1, 0],
      translateY: [0, -16],
      scale: [1, 0.95],
      easing: 'easeInQuad',
      duration: 250,
      complete: onComplete,
    });
  }
}

/** Incident lifecycle state machine visual transition */
export function animateIncident(
  badgeTarget: HTMLElement | string,
  _fromStatus: string,
  _toStatus: string,
): void {
  if (isReducedMotion()) return;

  anime({
    targets: badgeTarget,
    scale: [1, 1.25, 1],
    rotate: [0, 5, -5, 0],
    duration: 450,
    easing: 'easeInOutBack',
  });
}
