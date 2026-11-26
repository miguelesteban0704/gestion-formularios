import { getResolvedApiBase } from "../lib/api.js";

const subscribers = new Set();
let source = null;
let fallbackInterval = null;
let retryTimeout = null;
let notifyTimeout = null;

function notifySubscribers() {
  for (const subscriber of subscribers) subscriber.listener();
}

function scheduleNotification() {
  if (notifyTimeout) return;
  notifyTimeout = setTimeout(() => {
    notifyTimeout = null;
    notifySubscribers();
  }, 300);
}

function startFallback() {
  if (fallbackInterval) return;
  fallbackInterval = setInterval(notifySubscribers, 10000);
}

function connect() {
  if (!subscribers.size || source) return;
  if (typeof EventSource === "undefined") {
    startFallback();
    return;
  }

  try {
    source = new EventSource(`${getResolvedApiBase()}/events/public-stats`);
  } catch (error) {
    console.error("[realtime] public stats stream could not be opened", error);
    startFallback();
    retryTimeout = setTimeout(() => {
      retryTimeout = null;
      connect();
    }, 5000);
    return;
  }

  source.addEventListener("stats_updated", scheduleNotification);
  source.onopen = () => {
    if (fallbackInterval) {
      clearInterval(fallbackInterval);
      fallbackInterval = null;
    }
  };
  source.onerror = startFallback;
}

function stop() {
  if (source) {
    source.close();
    source = null;
  }
  if (fallbackInterval) {
    clearInterval(fallbackInterval);
    fallbackInterval = null;
  }
  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }
  if (notifyTimeout) {
    clearTimeout(notifyTimeout);
    notifyTimeout = null;
  }
}

export function subscribeToPublicStatsUpdates(listener) {
  const subscriber = { listener };
  subscribers.add(subscriber);
  if (subscribers.size === 1) connect();

  return () => {
    subscribers.delete(subscriber);
    if (!subscribers.size) stop();
  };
}
