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
    print(f"[OTP-CONSOLE] Sending SMS to {phone_number}: {message}", flush=True)
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
    SendPK responds with JSON (e.g. `{"success":"false","results":[{"status":"1","error":"..."}]}`)
    or plain text (e.g. 'OK ID:29346' or '1 : Invalid Username Or Password').
    """
    masked_phone = mask_phone_number(phone_number)

    # Post-response diagnostic log
    logger.info(
        "[SMS-SENDPK] Raw response from gateway | HTTP %s | body: %r",
        response.status_code,
        response.text[:500],
    )

    if response.is_error:
        error_msg = f"SendPK returned HTTP {response.status_code}: {response.text.strip()}"
        logger.error(f"[SMS-SENDPK] HTTP error delivering to {masked_phone}: {error_msg}")
        print(f"[SMS-SENDPK-ERROR] HTTP {response.status_code} for {masked_phone}: {error_msg}", flush=True)
        raise SMSGatewayError(error_msg, status_code=status.HTTP_502_BAD_GATEWAY)

    # 1. Attempt JSON parsing
    data = None
    try:
        data = response.json()
    except (ValueError, json.JSONDecodeError):
        pass

    if isinstance(data, dict):
        # 1a. Handle SendPK format=json response schema: {"success": "false"|"true", "results": [...]}
        success_flag = str(data.get("success", "")).strip().lower()
        if success_flag in ("false", "0"):
            err_detail = None
            results = data.get("results")
            if isinstance(results, list) and len(results) > 0 and isinstance(results[0], dict):
                first_res = results[0]
                err_text = str(first_res.get("error") or first_res.get("message") or "").strip()
                err_code = str(first_res.get("status") or first_res.get("code") or "").strip()
                desc = SENDPK_ERROR_CODES.get(err_code, "")
                if desc and desc.lower() not in err_text.lower():
                    err_detail = f"{err_text} (code {err_code}: {desc})" if err_text else desc
                else:
                    err_detail = err_text or f"SendPK error code {err_code}"
            if not err_detail:
                err_detail = str(data.get("error") or data.get("message") or "Gateway rejected request")

            logger.error(f"[SMS-SENDPK] SendPK rejected dispatch for {masked_phone}: {err_detail}")
            print(f"[SMS-SENDPK-ERROR] Dispatch rejected for {masked_phone}: {err_detail}", flush=True)
            raise SMSGatewayError(f"SendPK rejected SMS: {err_detail}")

        # 1b. Check status/code fields in dictionary
        status_val = str(data.get("code") or data.get("status") or data.get("response") or "").strip()
        if status_val in SENDPK_ERROR_CODES:
            desc = SENDPK_ERROR_CODES[status_val]
            logger.error(f"[SMS-SENDPK] SendPK error code {status_val} for {masked_phone}: {desc}")
            print(f"[SMS-SENDPK-ERROR] SendPK error code {status_val} for {masked_phone}: {desc}", flush=True)
            raise SMSGatewayError(f"SendPK rejected SMS: {desc}")

        # 1c. Check generic error flag in dictionary
        if data.get("error") or str(data.get("status")).lower() in ("error", "failed"):
            msg = str(data.get("message") or data.get("detail") or data.get("error") or "Gateway reported error")
            logger.error(f"[SMS-SENDPK] SendPK error for {masked_phone}: {msg}")
            print(f"[SMS-SENDPK-ERROR] SendPK error for {masked_phone}: {msg}", flush=True)
            raise SMSGatewayError(f"SendPK error: {msg}")

        # 1d. Successful JSON response
        logger.info(f"[SMS-SENDPK] Successfully dispatched SMS to {masked_phone}")
        print(f"[SMS-SENDPK-SUCCESS] Successfully dispatched SMS to {masked_phone}", flush=True)
        return data

    # 2. Process plain text response (e.g. "OK ID:29346", "1 : Invalid Username Or Password", or bare "1")
    raw_text = response.text.strip()

    # Check for SendPK error code prefix like "1 : ..." or bare "1"
    code_part = raw_text.split(":", 1)[0].strip()
    if code_part in SENDPK_ERROR_CODES:
        desc = SENDPK_ERROR_CODES[code_part]
        full_err = raw_text if ":" in raw_text else f"{code_part}: {desc}"
        logger.error(f"[SMS-SENDPK] SendPK error code {code_part} for {masked_phone}: {full_err}")
        print(f"[SMS-SENDPK-ERROR] SendPK rejected for {masked_phone}: {full_err}", flush=True)
        raise SMSGatewayError(f"SendPK rejected SMS: {full_err}")

    if raw_text.startswith("OK") or "OK ID" in raw_text:
        logger.info(f"[SMS-SENDPK] Successfully dispatched SMS to {masked_phone} (Response: {raw_text})")
        print(f"[SMS-SENDPK-SUCCESS] Successfully dispatched SMS to {masked_phone} (Response: {raw_text})", flush=True)
        return {"status": "success", "response": raw_text}

    # 3. Unrecognized response
    logger.error(
        "[SMS-SENDPK] Unrecognised response from SendPK for %s — treating as failure. Raw body: %r",
        masked_phone,
        raw_text[:300],
    )
    print(
        f"[SMS-SENDPK-ERROR] Unrecognised response from SendPK for {masked_phone}: {raw_text[:300]!r}",
        flush=True,
    )
    raise SMSGatewayError(
        f"SendPK returned an unrecognised response: {raw_text[:100]!r}. "
        "Check SendPK dashboard and journalctl logs for details.",
        status_code=status.HTTP_502_BAD_GATEWAY,
    )


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


def _get_safe_debug_payload(url: str, payload: dict[str, str], phone_number: str, message: str) -> dict[str, Any]:
    api_key = payload.get("api_key", "")
    masked_key = f"...{api_key[-8:]}" if len(api_key) >= 8 else "***"
    return {
        "url": url,
        "api_key": masked_key,
        "sender": payload.get("sender"),
        "mobile": mask_phone_number(phone_number),
        "message_preview": f"{message[:35]}... (length={len(message)})",
        "format": payload.get("format"),
    }


def send_sms_via_sendpk(phone_number: str, message: str) -> dict[str, Any]:
    """
    Synchronous SendPK SMS dispatcher.
    If settings.effective_sms_mode is 'console', logs to console without calling the API.
    Otherwise, sends an HTTP POST request to the SendPK gateway.
    """
    active_mode = settings.effective_sms_mode
    masked = mask_phone_number(phone_number)
    print(f"[SMS-DISPATCH] Mode={active_mode} | Phone={masked}", flush=True)

    if active_mode in ("console", "test", "dev"):
        warn_msg = (
            f"[SMS-DISPATCH] SMS_MODE is '{active_mode}'. "
            f"Simulating SMS via console only. External HTTP call to SendPK is SKIPPED."
        )
        logger.warning(warn_msg)
        print(warn_msg, flush=True)
        return _send_otp_via_console(phone_number, message)

    url, payload = _build_sendpk_payload(phone_number, message)
    safe_info = _get_safe_debug_payload(url, payload, phone_number, message)
    logger.info(f"[SMS-SENDPK] Outbound POST to {url} | Params: {safe_info}")
    print(f"[SMS-SENDPK] >>> Outbound POST to {url} | Params: {safe_info}", flush=True)

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = client.post(url, data=payload)
            print(
                f"[SMS-SENDPK] <<< Response: HTTP {response.status_code} | Body: {response.text[:500]!r}",
                flush=True,
            )
            return _parse_sendpk_response(response, phone_number)
    except SMSGatewayError:
        raise
    except httpx.TimeoutException as exc:
        err = f"Timeout contacting SendPK for {masked}: {exc}"
        logger.error(f"[SMS-SENDPK] {err}")
        print(f"[SMS-SENDPK-ERROR] {err}", flush=True)
        raise SMSGatewayError("SendPK SMS gateway timed out.") from exc
    except httpx.RequestError as exc:
        err = f"Network request error for {masked}: {exc}"
        logger.error(f"[SMS-SENDPK] {err}")
        print(f"[SMS-SENDPK-ERROR] {err}", flush=True)
        raise SMSGatewayError(f"SMS network communication error: {exc}") from exc


async def send_sms_via_sendpk_async(phone_number: str, message: str) -> dict[str, Any]:
    """
    Asynchronous SendPK SMS dispatcher using httpx.AsyncClient to keep FastAPI
    event loop unblocked.
    If settings.effective_sms_mode is 'console', logs to console without calling the API.
    """
    active_mode = settings.effective_sms_mode
    masked = mask_phone_number(phone_number)
    print(f"[SMS-DISPATCH] Mode={active_mode} | Phone={masked}", flush=True)

    if active_mode in ("console", "test", "dev"):
        warn_msg = (
            f"[SMS-DISPATCH] SMS_MODE is '{active_mode}'. "
            f"Simulating SMS via console only. External HTTP call to SendPK is SKIPPED."
        )
        logger.warning(warn_msg)
        print(warn_msg, flush=True)
        return _send_otp_via_console(phone_number, message)

    url, payload = _build_sendpk_payload(phone_number, message)
    safe_info = _get_safe_debug_payload(url, payload, phone_number, message)
    logger.info(f"[SMS-SENDPK] Outbound POST to {url} | Params: {safe_info}")
    print(f"[SMS-SENDPK] >>> Outbound POST to {url} | Params: {safe_info}", flush=True)

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.post(url, data=payload)
            print(
                f"[SMS-SENDPK] <<< Response: HTTP {response.status_code} | Body: {response.text[:500]!r}",
                flush=True,
            )
            return _parse_sendpk_response(response, phone_number)
    except SMSGatewayError:
        raise
    except httpx.TimeoutException as exc:
        err = f"Timeout contacting SendPK for {masked}: {exc}"
        logger.error(f"[SMS-SENDPK] {err}")
        print(f"[SMS-SENDPK-ERROR] {err}", flush=True)
        raise SMSGatewayError("SendPK SMS gateway timed out.") from exc
    except httpx.RequestError as exc:
        err = f"Network request error for {masked}: {exc}"
        logger.error(f"[SMS-SENDPK] {err}")
        print(f"[SMS-SENDPK-ERROR] {err}", flush=True)
        raise SMSGatewayError(f"SMS network communication error: {exc}") from exc
