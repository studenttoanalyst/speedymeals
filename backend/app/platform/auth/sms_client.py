"""
SMS Client Integration - SendPK SMS Gateway API & Console Fallback.
Provides unified sync and async interfaces to dispatch SMS messages (e.g. OTP codes)
via SendPK's HTTP API, with local console logging mode for development/testing.
Never logs raw OTP codes or API keys to production logs.
"""
import json
import logging
from typing import Any
from fastapi import status
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT_SECONDS: float = 10.0

SENDPK_ERROR_CODES: dict[str, str] = {
    "1": "Invalid or disabled API Key",
    "2": "Username/API Key parameter is missing",
    "3": "Password/Authentication parameter is missing",
    "4": "Sender ID is empty or not registered with PTA",
    "5": "Recipient mobile number is empty",
    "6": "SMS message content is empty",
    "7": "Invalid recipient mobile number format",
    "8": "Insufficient SMS credits in account",
    "9": "SMS rejected by gateway/operator policy",
}


class SMSGatewayError(Exception):
    """
    Raised when the SMS gateway fails due to network error, HTTP failure,
    timeout, or rejection by SendPK.
    """
    def __init__(self, message: str, status_code: int = status.HTTP_503_SERVICE_UNAVAILABLE) -> None:
        super().__init__(message)
        self.message: str = message
        self.status_code: int = status_code


def mask_phone_number(phone_number: str) -> str:
    """
    Mask phone number for safe logging (e.g., '923001234567' -> '92300****567').
    """
    cleaned = phone_number.strip()
    if len(cleaned) <= 6:
        return "****"
    return f"{cleaned[:5]}****{cleaned[-3:]}"


def normalize_phone_number(phone_number: str) -> str:
    """
    Normalizes a Pakistani phone number into the standard 923XXXXXXXXX format
    expected by SendPK.
    Handles +92..., 03..., 92..., and 3... formats, stripping spaces and hyphens.
    """
    cleaned = phone_number.strip()
    if cleaned.startswith("+"):
        cleaned = cleaned[1:]
    digits = "".join(ch for ch in cleaned if ch.isdigit())
    if digits.startswith("0") and len(digits) == 11:
        # e.g. 03001234567 -> 923001234567
        return "92" + digits[1:]
    if digits.startswith("3") and len(digits) == 10:
        # e.g. 3001234567 -> 923001234567
        return "92" + digits
    if len(digits) >= 9:
        return digits
    return "".join(ch for ch in cleaned if ch.isalnum())


def format_otp_message(otp_code: str, template: str | None = None) -> str:
    """
    Formats the message using SendPK approved template format:
    'Your SpeedyMeals OTP code is #code#' or dynamic replacement of {code}.
    """
    active_template = template or settings.OTP_TEMPLATE
    if "#code#" in active_template:
        return active_template.replace("#code#", otp_code)
    if "{code}" in active_template:
        return active_template.format(code=otp_code)
    return f"Your SpeedyMeals OTP code is {otp_code}"


def _send_otp_via_console(phone_number: str, message: str) -> dict[str, Any]:
    """
    Local development / test mode fallback (SMS_MODE=console).
    Prints OTP message to server stdout and logs without making external HTTP calls.
    """
    print(f"[OTP-CONSOLE] Sending SMS to {phone_number}: {message}")
    logger.info(f"[OTP-CONSOLE] Simulated SMS dispatch to {mask_phone_number(phone_number)}")
    return {
        "status": "success",
        "mode": "console",
        "simulated": True,
        "phone": phone_number,
    }


def _parse_sendpk_response(response: httpx.Response, phone_number: str) -> dict[str, Any]:
    """
    Parses SendPK API response and raises SMSGatewayError on error codes or failures.
    SendPK responds with JSON or plain text like 'OK ID:29346' or error codes '1'-'9'.

    BUG FIX 1: The original code used `except ValueError: pass` which silently
    swallowed ALL exceptions raised inside the try block — including SMSGatewayError
    raised by the error-code checks. This meant gateway rejections (codes 1-9) were
    caught and discarded, then the function fell through to the plain-text path and
    returned {"status": "success"} even on hard API errors.
    Fixed: narrow the except to `json.JSONDecodeError` only, so only a genuine
    JSON-parse failure is caught; all other exceptions propagate normally.

    BUG FIX 2: Unexpected/unrecognised responses (neither OK nor a known error code)
    were previously logged as a warning but still returned {"status": "success"}.
    This masked real delivery failures. Fixed: raise SMSGatewayError so the caller
    (service.py) triggers the Redis rollback and returns 503 to the mobile app.
    """
    masked_phone = mask_phone_number(phone_number)

    # --- Post-response diagnostic log (Fix 3 / logging improvement) ---
    # Always log the raw HTTP status and full response body BEFORE any parsing,
    # so `journalctl -u speedymeals` shows exactly what SendPK returned even if
    # the subsequent parse logic misidentifies it.
    logger.info(
        "[SMS-SENDPK] Raw response from gateway | HTTP %s | body: %r",
        response.status_code,
        response.text[:500],   # cap at 500 chars to avoid flooding logs
    )

    if response.is_error:
        error_msg = f"SendPK returned HTTP {response.status_code}: {response.text.strip()}"
        logger.error(f"[SMS-SENDPK] HTTP error delivering to {masked_phone}: {error_msg}")
        raise SMSGatewayError(error_msg, status_code=status.HTTP_502_BAD_GATEWAY)

    # Attempt to parse as JSON first.
    # IMPORTANT: only catch json.JSONDecodeError (response is not JSON), NOT all
    # exceptions. The original broad `except ValueError: pass` would swallow
    # SMSGatewayError raised inside this block, turning rejections into false successes.
    # Attempt to parse as JSON first.
    # Only catch JSON decode errors from response.json(); any SMSGatewayError raised
    # during dictionary validation propagates directly.
    data = None
    try:
        data = response.json()
    except (ValueError, json.JSONDecodeError):
        pass

    if isinstance(data, dict):
        status_val = str(data.get("code") or data.get("status") or data.get("response") or "").strip()
        if status_val in SENDPK_ERROR_CODES:
            desc = SENDPK_ERROR_CODES[status_val]
            logger.error(f"[SMS-SENDPK] SendPK error code {status_val} for {masked_phone}: {desc}")
            raise SMSGatewayError(f"SendPK rejected SMS: {desc}")

        if data.get("error") or data.get("status") == "error":
            msg = str(data.get("message") or data.get("detail") or "Gateway reported error")
            logger.error(f"[SMS-SENDPK] SendPK error for {masked_phone}: {msg}")
            raise SMSGatewayError(f"SendPK error: {msg}")

        logger.info(f"[SMS-SENDPK] Successfully dispatched SMS to {masked_phone}")
        return data

    # Process plain text response (e.g. "OK ID:29346" or error code "1"–"9").
    raw_text = response.text.strip()
    if raw_text in SENDPK_ERROR_CODES:
        desc = SENDPK_ERROR_CODES[raw_text]
        logger.error(f"[SMS-SENDPK] SendPK error code {raw_text} for {masked_phone}: {desc}")
        raise SMSGatewayError(f"SendPK rejected SMS: {desc}")

    if raw_text.startswith("OK") or "OK ID" in raw_text:
        logger.info(f"[SMS-SENDPK] Successfully dispatched SMS to {masked_phone} (Response: {raw_text})")
        return {"status": "success", "response": raw_text}

    # BUG FIX 2: Unrecognised response — do NOT silently claim success.
    # Previously this logged a warning but returned {"status": "success"}, hiding
    # real failures from the caller. Now we raise so service.py can roll back Redis
    # keys and return a proper 503 to the mobile app.
    logger.error(
        "[SMS-SENDPK] Unrecognised response from SendPK for %s — treating as failure. "
        "Raw body: %r",
        masked_phone,
        raw_text[:300],
    )
    raise SMSGatewayError(
        f"SendPK returned an unrecognised response: {raw_text[:100]!r}. "
        "Check SendPK dashboard and journalctl logs for details.",
        status_code=status.HTTP_502_BAD_GATEWAY,
    )


def _build_sendpk_payload(phone_number: str, message: str) -> tuple[str, dict[str, str]]:
    """
    Validates configuration and prepares parameters for SendPK API call.
    Also emits a pre-request diagnostic log so every outbound attempt is
    visible in journalctl regardless of what happens next.
    """
    if not settings.SENDPK_API_KEY:
        raise SMSGatewayError(
            "SendPK API key is not configured. Please set SENDPK_API_KEY in environment.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    normalized_phone = normalize_phone_number(phone_number)
    if len(normalized_phone) < 7:
        raise SMSGatewayError(
            f"Invalid phone number format: {mask_phone_number(phone_number)}",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    payload = {
        "api_key": settings.SENDPK_API_KEY,
        "sender": settings.SENDPK_SENDER_ID,
        "mobile": normalized_phone,
        "message": message,
        "format": "json",
    }

    # --- Pre-request diagnostic log (Fix 3 / logging improvement) ---
    # Log everything needed to reproduce the call manually with curl, without
    # exposing the full API key (show only the last 8 chars as a fingerprint).
    api_key_tail = settings.SENDPK_API_KEY[-8:] if len(settings.SENDPK_API_KEY) >= 8 else "***"
    logger.info(
        "[SMS-SENDPK] Dispatching SMS | url=%s | mobile=%s | sender=%s | "
        "msg_len=%d | api_key=...%s",
        settings.SENDPK_API_URL,
        normalized_phone,
        settings.SENDPK_SENDER_ID,
        len(message),
        api_key_tail,
    )

    return settings.SENDPK_API_URL, payload


def send_sms_via_sendpk(phone_number: str, message: str) -> dict[str, Any]:
    """
    Synchronous SendPK SMS dispatcher.
    If settings.effective_sms_mode is 'console', logs to console without calling the API.
    Otherwise, sends an HTTP POST request to the SendPK gateway.
    """
    if settings.effective_sms_mode in ("console", "test", "dev"):
        return _send_otp_via_console(phone_number, message)

    url, payload = _build_sendpk_payload(phone_number, message)
    masked = mask_phone_number(phone_number)

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = client.post(url, data=payload)
            return _parse_sendpk_response(response, phone_number)
    except SMSGatewayError:
        raise  # already logged inside _parse_sendpk_response; re-raise cleanly
    except httpx.TimeoutException as exc:
        logger.error(f"[SMS-SENDPK] Timeout contacting SendPK for {masked}: {exc}")
        raise SMSGatewayError("SendPK SMS gateway timed out.") from exc
    except httpx.RequestError as exc:
        logger.error(f"[SMS-SENDPK] Network request error for {masked}: {exc}")
        raise SMSGatewayError(f"SMS network communication error: {exc}") from exc


async def send_sms_via_sendpk_async(phone_number: str, message: str) -> dict[str, Any]:
    """
    Asynchronous SendPK SMS dispatcher using httpx.AsyncClient to keep FastAPI
    event loop unblocked.
    If settings.effective_sms_mode is 'console', logs to console without calling the API.
    """
    if settings.effective_sms_mode in ("console", "test", "dev"):
        return _send_otp_via_console(phone_number, message)

    url, payload = _build_sendpk_payload(phone_number, message)
    masked = mask_phone_number(phone_number)

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.post(url, data=payload)
            return _parse_sendpk_response(response, phone_number)
    except SMSGatewayError:
        raise  # already logged inside _parse_sendpk_response; re-raise cleanly
    except httpx.TimeoutException as exc:
        logger.error(f"[SMS-SENDPK] Timeout contacting SendPK for {masked}: {exc}")
        raise SMSGatewayError("SendPK SMS gateway timed out.") from exc
    except httpx.RequestError as exc:
        logger.error(f"[SMS-SENDPK] Network request error for {masked}: {exc}")
        raise SMSGatewayError(f"SMS network communication error: {exc}") from exc
