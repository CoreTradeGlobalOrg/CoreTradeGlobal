/**
 * Where a weekly product views notification opens: the /product-views
 * report for its week. sendWeeklyProductViewReport stores the week in
 * data.weekKey and in the doc id ("weekly-views-2026-W45").
 *
 * @param {{ id?: string, data?: { weekKey?: string } }} notification
 * @returns {string}
 */
export function productViewsLink(notification) {
  const id = typeof notification?.id === 'string' ? notification.id : '';
  const week = notification?.data?.weekKey
    || (id.startsWith('weekly-views-') ? id.slice('weekly-views-'.length) : null);
  return week ? `/product-views?week=${encodeURIComponent(week)}` : '/product-views';
}
