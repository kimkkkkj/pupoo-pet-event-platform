import { axiosInstance } from "../../../app/http/axiosInstance";

const NOTIFICATION_STREAM_PATH = "/api/notifications/stream";
const NOTIFICATION_STREAM_SESSION_PATH = "/api/notifications/stream/session";
const DEFAULT_NOTIFICATION_EVENTS = [
  "notification-received",
  "notification",
];

export function connectNotificationStream({
  onOpen,
  onNotification,
  onError,
  eventNames = DEFAULT_NOTIFICATION_EVENTS,
} = {}) {
  if (typeof window === "undefined" || typeof EventSource === "undefined") {
    return {
      ready: Promise.resolve(false),
      close() {},
    };
  }

  let source = null;
  let closed = false;

  const ready = axiosInstance
    .post(NOTIFICATION_STREAM_SESSION_PATH)
    .then(() => {
      if (closed) return false;

      source = new EventSource(NOTIFICATION_STREAM_PATH, {
        withCredentials: true,
      });

      const handleNotification = (event) => {
        onNotification?.(event);
      };

      source.onopen = (event) => {
        onOpen?.(event);
      };

      source.onmessage = handleNotification;
      eventNames.forEach((eventName) => {
        source.addEventListener(eventName, handleNotification);
      });

      source.onerror = (event) => {
        onError?.(event);
      };

      return true;
    })
    .catch((error) => {
      onError?.(error);
      return false;
    });

  return {
    ready,
    close() {
      closed = true;
      source?.close();
    },
  };
}
