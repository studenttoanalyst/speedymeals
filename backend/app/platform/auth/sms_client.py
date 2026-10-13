"""
SMS Client Integration - SendPK SMS Gateway API & Console Fallback.
Provides unified sync and async interfaces to dispatch SMS messages (e.g. OTP codes)
via SendPK's HTTP API, with local console logging mode for development/testing.
Never logs raw OTP codes or API keys to production logs.
"""
import json
import logging
import re
from typing import Any
from fastapi import status
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT_SECONDS: float = 10.0

SENDPK_ERROR_CODES: dict[str, str] = {
    "-4": "Fixed-SMS Template error (Invalid JSON Data or Template ID missing - see https://sendpk.com/blog/fixed-sms-api)",
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

    logger.debug(
        "[SMS-SENDPK] Raw response | HTTP %s | body: %r",
        response.status_code,
        response.text[:300],
    )

    if response.is_error:
        error_msg = f"SendPK returned HTTP {response.status_code}: {response.text.strip()}"
        logger.error(f"[SMS-SENDPK] HTTP error delivering to {masked_phone}: {error_msg}")
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
            raise SMSGatewayError(f"SendPK rejected SMS: {err_detail}")

        # 1b. Check status/code fields in dictionary
        status_val = str(data.get("code") or data.get("status") or data.get("response") or "").strip()
        if status_val in SENDPK_ERROR_CODES:
            desc = SENDPK_ERROR_CODES[status_val]
            logger.error(f"[SMS-SENDPK] SendPK error code {status_val} for {masked_phone}: {desc}")
            raise SMSGatewayError(f"SendPK rejected SMS: {desc}")

        # 1c. Check generic error flag in dictionary
        if data.get("error") or str(data.get("status")).lower() in ("error", "failed"):
            msg = str(data.get("message") or data.get("detail") or data.get("error") or "Gateway reported error")
            logger.error(f"[SMS-SENDPK] SendPK error for {masked_phone}: {msg}")
            raise SMSGatewayError(f"SendPK error: {msg}")

        # 1d. Successful JSON response
        logger.info(f"[SMS-SENDPK] Dispatched SMS to {masked_phone}")
        return data

    # 2. Process plain text response (e.g. "OK ID:29346", "1 : Invalid Username Or Password", or bare "1")
    raw_text = response.text.strip()

    code_part = raw_text.split(":", 1)[0].strip()
    if code_part in SENDPK_ERROR_CODES:
        desc = SENDPK_ERROR_CODES[code_part]
        full_err = raw_text if ":" in raw_text else f"{code_part}: {desc}"
        logger.error(f"[SMS-SENDPK] SendPK error code {code_part} for {masked_phone}: {full_err}")
        raise SMSGatewayError(f"SendPK rejected SMS: {full_err}")

    if raw_text.startswith("OK") or "OK ID" in raw_text:
        disp_id = raw_text.replace("OK", "").strip(": \n\r").strip()
        logger.info(f"[SMS-SENDPK] Dispatched SMS to {masked_phone}%s", f" ({disp_id})" if disp_id else "")
        return {"status": "success", "response": raw_text}

    # 3. Unrecognized response
    logger.error(
        "[SMS-SENDPK] Unrecognised response from SendPK for %s: %r",
        masked_phone,
        raw_text[:100],
    )
    raise SMSGatewayError(
        f"SendPK returned an unrecognised response: {raw_text[:100]!r}.",
        status_code=status.HTTP_502_BAD_GATEWAY,
    )


def _build_sendpk_payload(phone_number: str, message: str) -> tuple[str, dict[str, str]]:
    """
    Validates configuration and prepares form-urlencoded parameters for SendPK API call.
    If SENDPK_TEMPLATE_ID is configured, passes template_id and ensures message is formatted
    as a valid JSON string of template variables for PTA Fixed-SMS compliance.
    """
    if not settings.SENDPK_API_KEY:
        raise SMSGatewayError(
            "SendPK API key is not configured. Please set SENDPK_API_KEY in environment.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    normalized_phone = normalize_phone_number(phone_number)
    if len(normalized_phone) != 12 or not normalized_phone.startswith("923"):
        raise SMSGatewayError(
            f"Invalid recipient mobile number format. Expected an 11-digit Pakistani mobile number (e.g. 03342121401).",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    outbound_message = message
    template_id = getattr(settings, "SENDPK_TEMPLATE_ID", "").strip()

    # For accounts enforcing SendPK Fixed-SMS templates (PTA OTP compliance),
    # the message parameter must be a valid JSON string mapping variable keys (e.g. {"code":"123456"})
    if template_id:
        is_already_json = False
        try:
            parsed = json.loads(message)
            if isinstance(parsed, dict):
                is_already_json = True
        except (ValueError, json.JSONDecodeError):
            pass

        if not is_already_json:
            code_match = re.search(r'\b\d{4,8}\b', message)
            code_val = code_match.group(0) if code_match else message
            outbound_message = json.dumps({"code": code_val, "pin": code_val, "otp": code_val})

    payload: dict[str, str] = {
        "api_key": settings.SENDPK_API_KEY,
        "sender": settings.SENDPK_SENDER_ID,
        "mobile": normalized_phone,
        "message": outbound_message,
    }
    if template_id:
        payload["template_id"] = template_id

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
        "template_id": payload.get("template_id"),
    }


def send_sms_via_sendpk(phone_number: str, message: str) -> dict[str, Any]:
    """
    Synchronous SendPK SMS dispatcher.
    If settings.effective_sms_mode is 'console', logs cleanly without calling external API.
    Otherwise, sends an HTTP POST request to the SendPK gateway.
    """
    active_mode = settings.effective_sms_mode
    masked = mask_phone_number(phone_number)

    if active_mode in ("console", "test", "dev"):
        return _send_otp_via_console(phone_number, message)

    url, payload = _build_sendpk_payload(phone_number, message)
    safe_info = _get_safe_debug_payload(url, payload, phone_number, message)
    logger.debug("[SMS-SENDPK] Outbound POST to %s | %s", url, safe_info)

    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = client.post(url, data=payload, headers=headers)
            return _parse_sendpk_response(response, phone_number)
    except SMSGatewayError:
        raise
    except httpx.TimeoutException as exc:
        err = f"Timeout contacting SendPK for {masked}: {exc}"
        logger.error(f"[SMS-SENDPK] {err}")
        raise SMSGatewayError("SendPK SMS gateway timed out.") from exc
    except httpx.RequestError as exc:
        err = f"Network request error for {masked}: {exc}"
        logger.error(f"[SMS-SENDPK] {err}")
        raise SMSGatewayError(f"SMS network communication error: {exc}") from exc


async def send_sms_via_sendpk_async(phone_number: str, message: str) -> dict[str, Any]:
    """
    Asynchronous SendPK SMS dispatcher using httpx.AsyncClient to keep FastAPI
    event loop unblocked.
    If settings.effective_sms_mode is 'console', logs cleanly without calling external API.
    Otherwise, sends an HTTP POST request to the SendPK gateway.
    """
    active_mode = settings.effective_sms_mode
    masked = mask_phone_number(phone_number)

    if active_mode in ("console", "test", "dev"):
        return _send_otp_via_console(phone_number, message)

    url, payload = _build_sendpk_payload(phone_number, message)
    safe_info = _get_safe_debug_payload(url, payload, phone_number, message)
    logger.debug("[SMS-SENDPK] Outbound POST to %s | %s", url, safe_info)

    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.post(url, data=payload, headers=headers)
            return _parse_sendpk_response(response, phone_number)
    except SMSGatewayError:
        raise
    except httpx.TimeoutException as exc:
        err = f"Timeout contacting SendPK for {masked}: {exc}"
        logger.error(f"[SMS-SENDPK] {err}")
        raise SMSGatewayError("SendPK SMS gateway timed out.") from exc
    except httpx.RequestError as exc:
        err = f"Network request error for {masked}: {exc}"
        logger.error(f"[SMS-SENDPK] {err}")
        raise SMSGatewayError(f"SMS network communication error: {exc}") from exc
