"""
Script to upload rich, realistic dummy data into the live SpeedyMeals database.
Seeds:
1. Verified customers with distinct names, phone numbers, and delivery addresses in Karachi.
2. Verified, fully-kitted, online riders with healthy wallet balances and kit serial numbers.
3. Diverse orders across all operational stages:
   - "Accepted" (New incoming, ready to accept)
   - "Preparing" (Kitchen cooking, ready to mark ready for pickup)
   - "Ready for Pickup" (Ready, awaiting courier dispatch)
   - "Rider Assigned" (Assigned to rider)
   - "Picked Up" / "On the Way" (In transit)
   - "Delivered" (Completed)
"""
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.modules.food_delivery.models import Restaurant, MenuItem, Order, OrderItem
from app.platform.users.models import User, Address
from app.platform.wallet_payment.models import Rider, WalletTransaction


def seed_rich_dummy_data():
    db: Session = SessionLocal()
    try:
        print("[SpeedyMeals Seed] Checking restaurants...")
        kb_restaurant = db.query(Restaurant).filter(
            Restaurant.email.in_(["karachibiryani@speedymeals.com", "contact@karachibiryani.pk"])
        ).first()
        if kb_restaurant and kb_restaurant.email != "karachibiryani@speedymeals.com":
            kb_restaurant.email = "karachibiryani@speedymeals.com"
            db.commit()
        if not kb_restaurant:
            print("[SpeedyMeals Seed] Karachi Biryani House not found! Looking for first restaurant...")
            kb_restaurant = db.query(Restaurant).first()
            if not kb_restaurant:
                raise RuntimeError("No restaurants exist in the database. Run seed_restaurants first.")

        print(f"[SpeedyMeals Seed] Target Restaurant: {kb_restaurant.name} ({kb_restaurant.id})")

        # Ensure menu items exist
        menu_items = db.query(MenuItem).filter(MenuItem.restaurant_id == kb_restaurant.id).all()
        if not menu_items:
            print("[SpeedyMeals Seed] Adding menu items to target restaurant...")
            items_to_add = [
                MenuItem(
                    restaurant_id=kb_restaurant.id,
                    name="Special Chicken Biryani (Double Gosht)",
                    description="Fragrant basmati rice cooked with tender chicken pieces, aloo bukhara and spicy Karachi masala.",
                    price=550.0,
                    category="Biryani & Rice",
                    photo_url="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80",
                    is_available=True,
                ),
                MenuItem(
                    restaurant_id=kb_restaurant.id,
                    name="Mutton Karachi Karahi",
                    description="Fresh mutton cooked in wok over high flame with fresh tomatoes, ginger, and black pepper.",
                    price=1650.0,
                    category="Karahi & Curries",
                    photo_url="https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&auto=format&fit=crop&q=80",
                    is_available=True,
                ),
                MenuItem(
                    restaurant_id=kb_restaurant.id,
                    name="Chicken Malai Boti (8 Pcs)",
                    description="Tender boneless chicken marinated in fresh cream, lemon, and char-grilled.",
                    price=620.0,
                    category="BBQ & Grills",
                    photo_url="https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800&auto=format&fit=crop&q=80",
                    is_available=True,
                ),
                MenuItem(
                    restaurant_id=kb_restaurant.id,
                    name="Tandoori Roghani Naan",
                    description="Fluffy leavened flatbread brushed with butter and sesame seeds.",
                    price=90.0,
                    category="Breads",
                    photo_url="https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800&auto=format&fit=crop&q=80",
                    is_available=True,
                ),
            ]
            db.add_all(items_to_add)
            db.commit()
            menu_items = db.query(MenuItem).filter(MenuItem.restaurant_id == kb_restaurant.id).all()

        item_map = {m.name: m for m in menu_items}
        biryani = menu_items[0]
        karahi = menu_items[1] if len(menu_items) > 1 else biryani
        boti = menu_items[2] if len(menu_items) > 2 else biryani
        naan = menu_items[3] if len(menu_items) > 3 else biryani

        # 1. Seed / verify Customers with real Karachi Addresses
        customers_spec = [
            {
                "name": "Tariq Mansoor",
                "phone": "+923001234567",
                "email": "tariq.mansoor@example.pk",
                "label": "Home",
                "full_address": "Apartment 4B, Ocean View Towers, Block 4 Clifton, Karachi",
                "lat": 24.8192,
                "lng": 67.0315,
            },
            {
                "name": "Ayesha Siddiqui",
                "phone": "+923007654321",
                "email": "ayesha.siddiqui@example.pk",
                "label": "Office",
                "full_address": "Suite 302, Executive Heights, Khayaban-e-Shahbaz, DHA Phase 6, Karachi",
                "lat": 24.8095,
                "lng": 67.0542,
            },
            {
                "name": "Bilal Ahmed",
                "phone": "+923129876543",
                "email": "bilal.ahmed@example.pk",
                "label": "Home",
                "full_address": "House 14-C, Lane 5, PECHS Block 2, Karachi",
                "lat": 24.8698,
                "lng": 67.0674,
            },
            {
                "name": "Zainab Fatima",
                "phone": "+923334567890",
                "email": "zainab.fatima@example.pk",
                "label": "Home",
                "full_address": "Flat 601, Al-Noor Arcade, Block 13-D, Gulshan-e-Iqbal, Karachi",
                "lat": 24.9184,
                "lng": 67.0945,
            },
            {
                "name": "Hamza Khan",
                "phone": "+923215678901",
                "email": "hamza.khan@example.pk",
                "label": "Work",
                "full_address": "Office 12, Alamgir Road, Bahadurabad, Karachi",
                "lat": 24.8821,
                "lng": 67.0712,
            },
        ]

        seeded_customers = []
        for c in customers_spec:
            user = db.query(User).filter(User.phone_number == c["phone"]).first()
            if not user:
                user = User(
                    name=c["name"],
                    phone_number=c["phone"],
                    email=c["email"],
                    country_code="+92",
                    wallet_balance=1000.0,
                    is_active=True,
                )
                db.add(user)
                db.commit()
                db.refresh(user)

            # Ensure address exists for this user
            addr = db.query(Address).filter(Address.user_id == user.id).first()
            if not addr:
                addr = Address(
                    user_id=user.id,
                    label=c["label"],
                    full_address=c["full_address"],
                    latitude=c["lat"],
                    longitude=c["lng"],
                    is_default=True,
                )
                db.add(addr)
                db.commit()
                db.refresh(addr)

            seeded_customers.append((user, addr))

        print(f"[SpeedyMeals Seed] Configured {len(seeded_customers)} active customers.")

        # 2. Seed / update Approved & Kitted Riders
        riders_spec = [
            {
                "name": "Saqib Ali",
                "phone": "+923251276022",
                "cnic": "42101-1234567-1",
                "vehicle_type": "Honda CG125",
                "vehicle_reg": "KHI-8942",
            },
            {
                "name": "Zubair Hashmi",
                "phone": "+923005550202",
                "cnic": "42101-9876543-3",
                "vehicle_type": "Yamaha YBR125",
                "vehicle_reg": "KHI-4421",
            },
            {
                "name": "Rashid Mehmood",
                "phone": "+923005550200",
                "cnic": "42101-5544332-5",
                "vehicle_type": "Suzuki GS150",
                "vehicle_reg": "KHI-1190",
            },
        ]

        seeded_riders = []
        now = datetime.now(timezone.utc)
        for idx, r_spec in enumerate(riders_spec):
            rider = db.query(Rider).filter(Rider.phone_number == r_spec["phone"]).first()
            if not rider:
                rider = Rider(
                    name=r_spec["name"],
                    phone_number=r_spec["phone"],
                    cnic_number=r_spec["cnic"],
                    vehicle_type=r_spec["vehicle_type"],
                    vehicle_registration=r_spec["vehicle_reg"],
                    approval_status="approved",
                    country_code="+92",
                    is_active=True,
                )
                db.add(rider)
                db.commit()
                db.refresh(rider)

            # Ensure rider is approved, fully kitted, and has healthy wallet balance
            rider.approval_status = "approved"
            rider.is_active = True
            rider.is_online = True
            rider.wallet_balance = 2500.00
            rider.pending_cash_owed = 0.00
            rider.current_latitude = 24.8234 + (idx * 0.005)
            rider.current_longitude = 67.0345 + (idx * 0.005)
            rider.kit_deposit_paid = True
            rider.kit_deposit_date = now - timedelta(days=5)
            rider.kit_shirts_issued = 2
            rider.kit_box_issued = True
            rider.kit_completed = True
            rider.shirt_serial_numbers = [f"SHT-10{idx * 2 + 1}", f"SHT-10{idx * 2 + 2}"]
            rider.shirt_serial_number = f"SHT-10{idx * 2 + 1}, SHT-10{idx * 2 + 2}"
            rider.box_serial_number = f"BOX-08{idx + 1}"
            rider.helmet_serial_number = f"HLM-04{idx + 1}"
            db.add(rider)
            seeded_riders.append(rider)

        db.commit()
        print(f"[SpeedyMeals Seed] Configured {len(seeded_riders)} online, approved & kitted riders.")

        # 3. Create diverse orders for Karachi Biryani House across all stages
        orders_blueprint = [
            # STAGE 1: ACCEPTED (Fresh incoming tickets ready for kitchen acceptance)
            {
                "status": "Accepted",
                "payment": "COD",
                "notes": "Extra spicy biryani please. Pack raita separately.",
                "minutes_ago": 4,
                "items": [(biryani, 2), (naan, 2)],
                "cust_idx": 0,
            },
            {
                "status": "Accepted",
                "payment": "Digital",
                "notes": "Please deliver quietly, baby sleeping. Ring bell once.",
                "minutes_ago": 9,
                "items": [(karahi, 1), (naan, 3)],
                "cust_idx": 1,
            },
            {
                "status": "Accepted",
                "payment": "COD",
                "notes": "Include mint chutney and fresh cut salad.",
                "minutes_ago": 14,
                "items": [(biryani, 1), (boti, 1)],
                "cust_idx": 2,
            },

            # STAGE 2: PREPARING (In kitchen prep, ready to click [Mark Ready for Pickup])
            {
                "status": "Preparing",
                "payment": "COD",
                "notes": "Crispy naan well done.",
                "minutes_ago": 22,
                "items": [(biryani, 3), (naan, 3)],
                "cust_idx": 3,
            },
            {
                "status": "Preparing",
                "payment": "Digital",
                "notes": "Mild spice for the kids.",
                "minutes_ago": 28,
                "items": [(karahi, 1), (biryani, 2)],
                "cust_idx": 4,
            },
            {
                "status": "Preparing",
                "payment": "COD",
                "notes": "Keep hot, serving guests.",
                "minutes_ago": 35,
                "items": [(boti, 2), (naan, 4)],
                "cust_idx": 0,
            },

            # STAGE 3: READY FOR PICKUP (Waiting for courier)
            {
                "status": "Ready for Pickup",
                "payment": "COD",
                "notes": "Packed in thermal bag.",
                "minutes_ago": 42,
                "items": [(biryani, 2), (boti, 1)],
                "cust_idx": 1,
            },
            {
                "status": "Ready for Pickup",
                "payment": "Digital",
                "notes": "All packed and labeled at counter.",
                "minutes_ago": 48,
                "items": [(karahi, 1), (naan, 2)],
                "cust_idx": 2,
            },

            # STAGE 4: RIDER ASSIGNED / PICKED UP (Out for delivery)
            {
                "status": "Rider Assigned",
                "payment": "COD",
                "notes": "Rider arriving at kitchen.",
                "minutes_ago": 55,
                "items": [(biryani, 1), (naan, 2)],
                "cust_idx": 3,
                "rider_idx": 0,
            },
            {
                "status": "Picked Up",
                "payment": "Digital",
                "notes": "Courier en route to customer destination.",
                "minutes_ago": 68,
                "items": [(karahi, 1), (boti, 1), (naan, 2)],
                "cust_idx": 4,
                "rider_idx": 1,
            },

            # STAGE 5: DELIVERED (Past completed orders)
            {
                "status": "Delivered",
                "payment": "COD",
                "notes": "Customer received order at door.",
                "minutes_ago": 140,
                "delivered_minutes_ago": 110,
                "items": [(biryani, 2), (naan, 2)],
                "cust_idx": 0,
                "rider_idx": 2,
            },
            {
                "status": "Delivered",
                "payment": "Digital",
                "notes": "Delivered successfully.",
                "minutes_ago": 260,
                "delivered_minutes_ago": 230,
                "items": [(karahi, 1), (biryani, 1), (naan, 4)],
                "cust_idx": 1,
                "rider_idx": 0,
            },
        ]

        created_orders = []
        for b in orders_blueprint:
            cust_user, cust_addr = seeded_customers[b["cust_idx"]]
            assigned_rider = seeded_riders[b["rider_idx"]] if "rider_idx" in b else None

            # Calculate line items
            food_subtotal = Decimal("0.00")
            for m_item, qty in b["items"]:
                food_subtotal += Decimal(str(m_item.price)) * Decimal(str(qty))

            delivery_distance_km = Decimal("3.4")
            delivery_fee = Decimal("150.00")
            gst_rate = Decimal("13.00")
            gst_amount = (food_subtotal * gst_rate / Decimal("113.00")).quantize(Decimal("0.01"))
            net_subtotal = food_subtotal - gst_amount
            total_amount = food_subtotal + delivery_fee
            commission_amount = (food_subtotal * Decimal("0.10")).quantize(Decimal("0.01"))
            restaurant_payable = food_subtotal - commission_amount
            rider_earning = Decimal("135.00")

            placed_time = now - timedelta(minutes=b["minutes_ago"])
            delivered_time = (
                now - timedelta(minutes=b["delivered_minutes_ago"])
                if "delivered_minutes_ago" in b
                else None
            )

            order = Order(
                user_id=cust_user.id,
                restaurant_id=kb_restaurant.id,
                rider_id=assigned_rider.id if assigned_rider else None,
                delivery_address_id=cust_addr.id,
                status=b["status"],
                payment_method=b["payment"],
                food_subtotal=float(food_subtotal),
                delivery_distance_km=float(delivery_distance_km),
                delivery_fee=float(delivery_fee),
                total_amount=float(total_amount),
                commission_amount=float(commission_amount),
                restaurant_payable=float(restaurant_payable),
                rider_earning=float(rider_earning),
                special_instructions=b["notes"],
                country_code="+92",
                currency="PKR",
                gst_rate=float(gst_rate),
                prices_include_gst=True,
                gst_amount=float(gst_amount),
                net_subtotal=float(net_subtotal),
                customer_lat=cust_addr.latitude,
                customer_lng=cust_addr.longitude,
                restaurant_lat=kb_restaurant.latitude,
                restaurant_lng=kb_restaurant.longitude,
                placed_at=placed_time,
                delivered_at=delivered_time,
            )
            db.add(order)
            db.flush()

            # Add OrderItems
            for m_item, qty in b["items"]:
                oi = OrderItem(
                    order_id=order.id,
                    menu_item_id=m_item.id,
                    quantity=qty,
                    price_at_order=float(m_item.price),
                )
                db.add(oi)

            created_orders.append(order)

        db.commit()
        print(f"[SpeedyMeals Seed] Successfully uploaded {len(created_orders)} rich orders for {kb_restaurant.name}!")

        # Summary of status distribution
        status_counts = {}
        for o in db.query(Order).filter(Order.restaurant_id == kb_restaurant.id).all():
            status_counts[o.status] = status_counts.get(o.status, 0) + 1

        print(f"[SpeedyMeals Seed] Current Order Distribution in Database for {kb_restaurant.name}:")
        for st, cnt in sorted(status_counts.items()):
            print(f"  • {st}: {cnt} orders")

    finally:
        db.close()


if __name__ == "__main__":
    seed_rich_dummy_data()
