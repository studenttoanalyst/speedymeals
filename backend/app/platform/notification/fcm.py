"""
Firebase Cloud Messaging sender (Firebase Admin SDK, HTTP v1).

Push is OPTIONAL at runtime: when neither FIREBASE_CREDENTIALS_JSON nor
FIREBASE_CREDENTIALS_PATH is configured, is_enabled() is False and every
send is a silent no-op. That keeps local development, CI and the existing
test-suite working without a Firebase project.

The Admin SDK is imported lazily so a missing/broken credential never stops
the API from booting.
"""
import json
import logging
import threading
from dataclasses import dataclass, field

from app.core.config import settings

logger = logging.getLogger(__name__)

_init_lock = threading.Lock()
_initialised = False
_init_failed = False

# FCM allows 500 tokens per multicast request.
_MULTICAST_LIMIT = 500


@dataclass
class PushMessage:
    title: str
    body: str
    data: dict[str, str] = field(default_factory=dict)
    # Android notification channel. Must exist in the Flutter app
    # (see mobile_app/lib/services/push_service.dart).
    channel_id: str = "order_updates"
    # Path opened when a web notification is clicked, e.g. "/restaurant/orders".
    click_path: str | None = None


def is_enabled() -> bool:
    return bool(settings.FIREBASE_CREDENTIALS_JSON or settings.FIREBASE_CREDENTIALS_PATH)


def _ensure_app() -> bool:
    """Initialise the Firebase Admin app once. Returns False if unavailable."""
    global _initialised, _init_failed
    if _initialised:
        return True
    if _init_failed:
        return False
    with _init_lock:
        if _initialised:
            return True
        try:
            import firebase_admin
            from firebase_admin import credentials

            if settings.FIREBASE_CREDENTIALS_JSON:
                cred = credentials.Certificate(json.loads(settings.FIREBASE_CREDENTIALS_JSON))
            else:
                cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            if not firebase_admin._apps:
                firebase_admin.initialize_app(cred)
            _initialised = True
            return True
        except Exception:  # noqa: BLE001 - never let push setup break the API
            _init_failed = True
            logger.exception("Firebase Admin initialisation failed; push disabled for this process.")
            return False


def send_multicast(tokens: list[str], message: PushMessage) -> list[str]:
    """
    Send one message to many device tokens.

    Returns the tokens FCM reported as permanently invalid (unregistered or
    belonging to a different Firebase project) so the caller can delete them.
    Never raises: push is best-effort and must not affect order flow.
    """
    if not tokens or not is_enabled() or not _ensure_app():
        return []

    from firebase_admin import messaging

    data = {str(k): str(v) for k, v in message.data.items()}
    if message.click_path:
        data["click_path"] = message.click_path

    webpush = None
    base = settings.WEB_PUSH_BASE_URL.rstrip("/")
    if base.startswith("https://") and message.click_path:
        webpush = messaging.WebpushConfig(
            headers={"Urgency": "high"},
            fcm_options=messaging.WebpushFCMOptions(link=f"{base}{message.click_path}"),
        )

    invalid: list[str] = []
    for start in range(0, len(tokens), _MULTICAST_LIMIT):
        chunk = tokens[start : start + _MULTICAST_LIMIT]
        try:
            response = messaging.send_each_for_multicast(
                messaging.MulticastMessage(
                    tokens=chunk,
                    notification=messaging.Notification(title=message.title, body=message.body),
                    data=data,
                    android=messaging.AndroidConfig(
                        priority="high",
                        notification=messaging.AndroidNotification(
                            channel_id=message.channel_id, sound="default"
                        ),
                    ),
                    apns=messaging.APNSConfig(
                        headers={"apns-priority": "10"},
                        payload=messaging.APNSPayload(aps=messaging.Aps(sound="default")),
                    ),
                    webpush=webpush,
                )
            )
        except Exception:  # noqa: BLE001
            logger.exception("FCM multicast send failed")
            continue

        for token, result in zip(chunk, response.responses):
            if result.success:
                continue
            if isinstance(
                result.exception,
                (messaging.UnregisteredError, messaging.SenderIdMismatchError),
            ):
                invalid.append(token)
            else:
                logger.warning("FCM send failed for one token: %s", result.exception)
    return invalid
