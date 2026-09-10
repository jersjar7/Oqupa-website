## useInfiniteScroll.ts — 2026-09-10
- Coverage before: 15.74%
- Coverage after:  15.95%
- Tests written:   12 tests covering: ref attachment to sentinel DOM element, IntersectionObserver creation with rootMargin '200px', observe() called with sentinel element, onLoadMore called on intersection when enabled, onLoadMore not called when isIntersecting is false, onLoadMore not called when enabled is false, enabled flag transitions (false→true and true→false), multiple intersections, observer.disconnect() called on unmount, and observer recreation when onLoadMore reference changes

## useRevealedFields.ts — 2026-09-10
- Coverage before: 15.25%
- Coverage after:  15.74%
- Tests written:   19 tests covering skipReveal mode (all fields visible, wasInitial bypass), initial condition seeding, the one-way ratchet (revealed set only grows), progressive reveal on re-render, wasInitial frozen from first render, and edge cases (empty conditions, new fields added after mount)
