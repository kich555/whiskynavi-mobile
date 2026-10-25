// Match the web ProductCarousel's 240×300 center, 0.85/0.7 side scale,
// 180px spacing and 2000px perspective with 150px depth per step.
export function brandCardPosition(
  item: number,
  current: number,
  count: number,
  baseWidth = 240,
) {
  let relative = item - current;
  if (relative > count / 2) relative -= count;
  if (relative < -count / 2) relative += count;
  const distance = Math.abs(relative);
  const projection = 2000 / (2000 + distance * 150);
  const scale = distance === 0 ? 1 : distance === 1 ? 0.85 : 0.7;
  return {
    relative,
    width: baseWidth * scale * projection,
    height: baseWidth * 1.25 * scale * projection,
    x: relative * baseWidth * 0.75 * projection,
    brightness: distance === 0 ? 1 : distance === 1 ? 0.6 : 0.4,
    zIndex: 30 - distance * 10,
    visible: distance <= 2,
  };
}
