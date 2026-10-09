// Milo, the Brawler: fast jabs (1 AP/hit), shell toss (2 AP, bounces), flowers (1 AP), Spin Dash (3 AP), Cape Swipe (2 AP).
export const MILO_SPECIALS = {
  spinDash: (c) => c.dash(80, 0.3),
  capeSwipe: (c) => { c.area(c.heroX(), c.heroY(), 40, 48); },
};
