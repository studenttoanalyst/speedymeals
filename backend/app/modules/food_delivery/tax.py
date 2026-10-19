"""
GST / sales-tax math for food items (pure, no DB, no HTTP).

A restaurant either lists menu prices

  * tax-INCLUSIVE (prices_include_gst=True)  - the menu price is what the
    customer pays for food; tax is carved OUT of it for the receipt.
  * tax-EXCLUSIVE (prices_include_gst=False) - the menu price is pre-tax;
    tax is ADDED on top at checkout.

    inclusive : gst = subtotal - subtotal / (1 + rate/100)
                net = subtotal - gst            customer_food_total = subtotal
    exclusive : gst = subtotal * rate/100
                net = subtotal                  customer_food_total = subtotal + gst

Tax applies to FOOD only. Delivery fee and platform fee are untouched here.
Rate 0 => gst 0 => both modes identical (legacy behaviour).

Decimal throughout, quantized to paisa, ROUND_HALF_UP.
"""
from decimal import Decimal, ROUND_HALF_UP

PAISA = Decimal("0.01")
MAX_GST_RATE = Decimal("30")


def _q(value: Decimal) -> Decimal:
    return value.quantize(PAISA, rounding=ROUND_HALF_UP)


def calculate_gst(
    food_subtotal: Decimal | int | float,
    gst_rate: Decimal | int | float | None,
    prices_include_gst: bool,
) -> dict:
    subtotal = _q(Decimal(str(food_subtotal)))
    rate = Decimal(str(gst_rate if gst_rate is not None else 0))

    if subtotal < 0:
        raise ValueError("food_subtotal cannot be negative.")
    if rate < 0 or rate > MAX_GST_RATE:
        raise ValueError(f"gst_rate must be between 0 and {MAX_GST_RATE}.")

    if rate == 0:
        gst = Decimal("0.00")
        net = subtotal
        customer_food_total = subtotal
    elif prices_include_gst:
        gst = _q(subtotal - subtotal / (Decimal("1") + rate / Decimal("100")))
        net = _q(subtotal - gst)
        customer_food_total = subtotal
    else:
        gst = _q(subtotal * rate / Decimal("100"))
        net = subtotal
        customer_food_total = _q(subtotal + gst)

    return {
        "gst_rate": rate,
        "prices_include_gst": prices_include_gst,
        "net_subtotal": net,
        "gst_amount": gst,
        "customer_food_total": customer_food_total,
    }
