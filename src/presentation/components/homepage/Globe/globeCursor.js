/**
 * Hand cursor over the hero globe (desktop, where it can be dragged):
 * "grab" while the pointer is over the globe, "grabbing" while dragging.
 *
 * The globe always sits in the middle of its container as a circle: the
 * camera orbits the centre at a fixed distance, so the circle's radius is
 * a fixed share of the container's height. Both renderers (worker and
 * fallback) use the same sizes: globe radius 6 scaled 1.3, camera 35√2
 * away, vertical field of view 45°.
 */

const GLOBE_RADIUS = 6 * 1.3;
const CAMERA_DISTANCE = 35 * Math.SQRT2;
const HALF_FOV = (45 / 2) * (Math.PI / 180);
// Silhouette radius of a sphere seen in perspective, as a share of half the
// height; 3% more for the land dots and routes that sit just above the surface.
const RADIUS_SHARE_OF_HALF_HEIGHT =
  (1.03 * GLOBE_RADIUS) / Math.sqrt(CAMERA_DISTANCE ** 2 - GLOBE_RADIUS ** 2) / Math.tan(HALF_FOV);

/** Adds the cursor handling to `container`; returns the cleanup. */
export function attachGlobeCursor(container) {
  let dragging = false;

  const isOverGlobe = (e) => {
    const r = container.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    return Math.hypot(dx, dy) <= RADIUS_SHARE_OF_HALF_HEIGHT * (r.height / 2);
  };
  const show = (e) => {
    container.style.cursor = isOverGlobe(e) ? 'grab' : '';
  };

  const onMove = (e) => {
    if (!dragging) show(e);
  };
  // Dragging anywhere in the container turns the globe, so it grabs too.
  const onDown = () => {
    dragging = true;
    container.style.cursor = 'grabbing';
  };
  const onUp = (e) => {
    dragging = false;
    show(e);
  };
  const onLeave = () => {
    if (!dragging) container.style.cursor = '';
  };

  container.addEventListener('pointermove', onMove);
  container.addEventListener('pointerdown', onDown);
  container.addEventListener('pointerup', onUp);
  container.addEventListener('pointercancel', onUp);
  container.addEventListener('pointerleave', onLeave);
  return () => {
    container.removeEventListener('pointermove', onMove);
    container.removeEventListener('pointerdown', onDown);
    container.removeEventListener('pointerup', onUp);
    container.removeEventListener('pointercancel', onUp);
    container.removeEventListener('pointerleave', onLeave);
    container.style.cursor = '';
  };
}
