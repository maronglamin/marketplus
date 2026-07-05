self.addEventListener('push', (event) => {
  let title = 'SNAP';
  let body = '';
  let payloadData = {};

  try {
    if (event.data) {
      const parsed = JSON.parse(event.data.text());
      if (parsed.title) title = String(parsed.title);
      if (parsed.body) body = String(parsed.body);
      if (parsed.data && typeof parsed.data === 'object') payloadData = parsed.data;
    }
  } catch {
    body = event.data ? String(event.data.text()) : '';
  }

  const tag =
    payloadData.orderId ||
    payloadData.interestId ||
    payloadData.requestId ||
    payloadData.referenceId ||
    'snap-push';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: String(tag),
      data: payloadData,
      icon: '/assets/icon-192.png',
      badge: '/assets/icon-192.png',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let url = '/';

  if (data.type === 'new_order' || data.type === 'order_placed' || data.type === 'payment_completed') {
    if (data.orderId) url = '/orders';
    else if (data.referenceId && data.context === 'order') url = '/orders';
  } else if (data.type === 'new_interest' || data.type === 'interest_submitted') {
    url = '/show-interest';
  } else if (data.type === 'ride_booking') {
    url = '/';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      clientList.forEach((client) => {
        client.postMessage({ type: 'SNAP_PUSH_CLICK', data });
      });
      if (clientList.length > 0 && 'focus' in clientList[0]) {
        return clientList[0].focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(new URL(url, self.location.origin).href);
      }
    }),
  );
});
