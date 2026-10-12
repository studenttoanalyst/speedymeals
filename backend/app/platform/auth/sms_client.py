"""
SMS Client Integration - SendPK SMS Gateway API & Console Fallback.
Provides unified sync and async interfaces to dispatch SMS messages (e.g. OTP codes)
via SendPK's HTTP API, with local console logging mode for development/testing.
Never logs raw OTP codes or API keys to production logs.
"""
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
    """
    masked_phone = mask_phone_number(phone_number)

    if response.is_error:
        error_msg = f"SendPK returned HTTP {response.status_code}: {response.text.strip()}"
        logger.error(f"[SMS-SENDPK] HTTP error delivering to {masked_phone}: {error_msg}")
        raise SMSGatewayError(error_msg, status_code=status.HTTP_502_BAD_GATEWAY)

    # Attempt to parse as JSON first
    try:
        data = response.json()
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
    except ValueError:
        pass

    # Process plain text response
    raw_text = response.text.strip()
    if raw_text in SENDPK_ERROR_CODES:
        desc = SENDPK_ERROR_CODES[raw_text]
        logger.error(f"[SMS-SENDPK] SendPK error code {raw_text} for {masked_phone}: {desc}")
        raise SMSGatewayError(f"SendPK rejected SMS: {desc}")

    if raw_text.startswith("OK") or "OK ID" in raw_text:
        logger.info(f"[SMS-SENDPK] Successfully dispatched SMS to {masked_phone} (Response: {raw_text})")
        return {"status": "success", "response": raw_text}

    logger.warning(f"[SMS-SENDPK] Unexpected response from SendPK for {masked_phone}: {raw_text}")
    return {"status": "success", "raw_response": raw_text}


def _build_sendpk_payload(phone_number: str, message: str) -> tuple[str, dict[str, str]]:
    """
    Validates configuration and prepares parameters for SendPK API call.
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
    except httpx.TimeoutException as exc:
        logger.error(f"[SMS-SENDPK] Timeout contacting SendPK for {masked}: {exc}")
        raise SMSGatewayError("SendPK SMS gateway timed out.") from exc
    except httpx.RequestError as exc:
        logger.error(f"[SMS-SENDPK] Network request error for {masked}: {exc}")
        raise SMSGatewayError(f"SMS network communication error: {exc}") from exc
