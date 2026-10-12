"""
Unit tests for SendPK SMS client and console fallback mode.
Tests phone normalization, template formatting, success/error responses,
network timeouts, and async/sync dispatches without making live network requests.
"""
from unittest.mock import MagicMock, patch
import httpx
import pytest

from app.core.config import settings
from app.platform.auth.sms_client import (
    SMSGatewayError,
    format_otp_message,
    mask_phone_number,
    normalize_phone_number,
    send_sms_via_sendpk,
    send_sms_via_sendpk_async,
)


def test_normalize_phone_number():
    assert normalize_phone_number("+923001234567") == "923001234567"
    assert normalize_phone_number("03001234567") == "923001234567"
    assert normalize_phone_number("3001234567") == "923001234567"
    assert normalize_phone_number("+92-321-9876543") == "923219876543"
    assert normalize_phone_number("0345 1122334") == "923451122334"


def test_format_otp_message():
    assert format_otp_message("123456", "Your SpeedyMeals OTP code is #code#") == "Your SpeedyMeals OTP code is 123456"
    assert format_otp_message("654321", "Login code: {code}") == "Login code: 654321"
    assert "999999" in format_otp_message("999999")


def test_mask_phone_number():
    masked = mask_phone_number("923001234567")
    assert "92300" in masked
    assert "567" in masked
    assert "1234" not in masked
    assert mask_phone_number("123") == "****"


def test_console_mode_does_not_make_http_calls(monkeypatch):
    monkeypatch.setattr(settings, "SMS_MODE", "console")
    with patch("httpx.Client.post") as mock_post:
        res = send_sms_via_sendpk("+923001112233", "Your SpeedyMeals OTP code is 123456")
        assert res["status"] == "success"
        assert res["mode"] == "console"
        assert res["simulated"] is True
        mock_post.assert_not_called()


@pytest.mark.asyncio
async def test_console_mode_async_does_not_make_http_calls(monkeypatch):
    monkeypatch.setattr(settings, "SMS_MODE", "console")
    with patch("httpx.AsyncClient.post") as mock_post:
        res = await send_sms_via_sendpk_async("+923001112233", "Your SpeedyMeals OTP code is 123456")
        assert res["status"] == "success"
        assert res["mode"] == "console"
        mock_post.assert_not_called()


def test_sendpk_sync_success_json(monkeypatch):
    monkeypatch.setattr(settings, "SMS_MODE", "sendpk")
    monkeypatch.setattr(settings, "SENDPK_API_KEY", "test-api-key")
    monkeypatch.setattr(settings, "SENDPK_SENDER_ID", "SpeedyMeals")
    monkeypatch.setattr(settings, "SENDPK_API_URL", "https://sendpk.com/api/sms.php")

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.is_error = False
    mock_response.status_code = 200
    mock_response.json.return_value = {"status": "success", "id": "100234"}

    with patch("httpx.Client.post", return_value=mock_response) as mock_post:
        result = send_sms_via_sendpk("+923001234567", "Your SpeedyMeals OTP code is 123456")
        assert result["status"] == "success"
        assert result["id"] == "100234"

        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        assert args[0] == "https://sendpk.com/api/sms.php"
        assert kwargs["data"]["api_key"] == "test-api-key"
        assert kwargs["data"]["mobile"] == "923001234567"
        assert kwargs["data"]["sender"] == "SpeedyMeals"
        assert kwargs["data"]["message"] == "Your SpeedyMeals OTP code is 123456"


def test_sendpk_sync_success_text(monkeypatch):
    monkeypatch.setattr(settings, "SMS_MODE", "sendpk")
    monkeypatch.setattr(settings, "SENDPK_API_KEY", "test-api-key")

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.is_error = False
    mock_response.status_code = 200
    mock_response.json.side_effect = ValueError("Not JSON")
    mock_response.text = "OK ID:84920"

    with patch("httpx.Client.post", return_value=mock_response):
        result = send_sms_via_sendpk("+923001234567", "Your SpeedyMeals OTP code is 123456")
        assert result["status"] == "success"
        assert "OK ID:84920" in result["response"]


@pytest.mark.asyncio
async def test_sendpk_async_success(monkeypatch):
    monkeypatch.setattr(settings, "SMS_MODE", "sendpk")
    monkeypatch.setattr(settings, "SENDPK_API_KEY", "test-api-key")

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.is_error = False
    mock_response.status_code = 200
    mock_response.json.return_value = {"status": "success", "id": "async-123"}

    with patch("httpx.AsyncClient.post", return_value=mock_response):
        result = await send_sms_via_sendpk_async("+923001234567", "Your SpeedyMeals OTP code is 123456")
        assert result["status"] == "success"


def test_sendpk_missing_api_key_raises_error(monkeypatch):
    monkeypatch.setattr(settings, "SMS_MODE", "sendpk")
    monkeypatch.setattr(settings, "SENDPK_API_KEY", "")

    with pytest.raises(SMSGatewayError) as exc_info:
        send_sms_via_sendpk("+923001234567", "Your code is 123456")
    assert "SENDPK_API_KEY" in str(exc_info.value)


def test_sendpk_gateway_error_code_rejected(monkeypatch):
    monkeypatch.setattr(settings, "SMS_MODE", "sendpk")
    monkeypatch.setattr(settings, "SENDPK_API_KEY", "test-api-key")

    # SendPK error code '8' = Insufficient credit
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.is_error = False
    mock_response.status_code = 200
    mock_response.json.return_value = {"code": "8"}

    with patch("httpx.Client.post", return_value=mock_response):
        with pytest.raises(SMSGatewayError) as exc_info:
            send_sms_via_sendpk("+923001234567", "Your code is 123456")
        assert "Insufficient SMS credits" in str(exc_info.value)


def test_sendpk_gateway_plain_text_error_code(monkeypatch):
    monkeypatch.setattr(settings, "SMS_MODE", "sendpk")
    monkeypatch.setattr(settings, "SENDPK_API_KEY", "test-api-key")

    # SendPK returns plain text "1" for Invalid API Key
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.is_error = False
    mock_response.status_code = 200
    mock_response.json.side_effect = ValueError("Not JSON")
    mock_response.text = "1"

    with patch("httpx.Client.post", return_value=mock_response):
        with pytest.raises(SMSGatewayError) as exc_info:
            send_sms_via_sendpk("+923001234567", "Your code is 123456")
        assert "Invalid or disabled API Key" in str(exc_info.value)


def test_sendpk_network_timeout(monkeypatch):
    monkeypatch.setattr(settings, "SMS_MODE", "sendpk")
    monkeypatch.setattr(settings, "SENDPK_API_KEY", "test-api-key")

    with patch("httpx.Client.post", side_effect=httpx.TimeoutException("Connection timed out")):
        with pytest.raises(SMSGatewayError) as exc_info:
            send_sms_via_sendpk("+923001234567", "Your code is 123456")
        assert "timed out" in str(exc_info.value).lower()


def test_sendpk_http_status_error(monkeypatch):
    monkeypatch.setattr(settings, "SMS_MODE", "sendpk")
    monkeypatch.setattr(settings, "SENDPK_API_KEY", "test-api-key")

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.is_error = True
    mock_response.status_code = 502
    mock_response.text = "Bad Gateway from upstream"

    with patch("httpx.Client.post", return_value=mock_response):
        with pytest.raises(SMSGatewayError) as exc_info:
            send_sms_via_sendpk("+923001234567", "Your code is 123456")
        assert "HTTP 502" in str(exc_info.value)


def test_sendpk_unrecognised_response_raises_error(monkeypatch):
    # BUG FIX 2 regression test: an unrecognised non-OK response must raise
    # SMSGatewayError, NOT silently return success. Previously the code returned
    # success for any response that was not a known error code and did not
    # start with 'OK', hiding real delivery failures from the application layer.
    monkeypatch.setattr(settings, "SMS_MODE", "sendpk")
    monkeypatch.setattr(settings, "SENDPK_API_KEY", "test-api-key")

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.is_error = False
    mock_response.status_code = 200
    mock_response.json.side_effect = ValueError("Not JSON")
    mock_response.text = "SOME_UNEXPECTED_GATEWAY_RESPONSE"

    with patch("httpx.Client.post", return_value=mock_response):
        with pytest.raises(SMSGatewayError) as exc_info:
            send_sms_via_sendpk("+923001234567", "Your code is 123456")
        assert "unrecognised response" in str(exc_info.value).lower()


def test_sendpk_json_error_code_not_swallowed(monkeypatch):
    # BUG FIX 1 regression test: SMSGatewayError raised inside the JSON parse
    # block must NOT be swallowed. Narrowing the except to json.JSONDecodeError
    # ensures only genuine parse failures are silenced, and known error codes
    # always propagate correctly to the caller.
    monkeypatch.setattr(settings, "SMS_MODE", "sendpk")
    monkeypatch.setattr(settings, "SENDPK_API_KEY", "test-api-key")

    # JSON body with error code '4' = Sender ID not registered with PTA
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.is_error = False
    mock_response.status_code = 200
    mock_response.text = '{"code": "4"}'
    mock_response.json.return_value = {"code": "4"}

    with patch("httpx.Client.post", return_value=mock_response):
        with pytest.raises(SMSGatewayError) as exc_info:
            send_sms_via_sendpk("+923001234567", "Your code is 123456")
        assert "Sender ID" in str(exc_info.value)
