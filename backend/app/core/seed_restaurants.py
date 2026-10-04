"""
Seed script to populate 18-20 realistic dummy restaurants across Karachi delivery zones
along with rich categorised menu items, pricing, and availability states.
Enables end-to-end monitoring, testing, and display across customer and merchant interfaces.
"""
import datetime
import uuid
from decimal import Decimal
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.modules.food_delivery.models import Restaurant, MenuItem

SAMPLE_RESTAURANTS = [
    {
        "name": "Karachi Biryani House",
        "email": "contact@karachibiryani.pk",
        "phone_number": "+923001112233",
        "address": "Shop # 4, Main Boat Basin, Clifton Block 5, Karachi",
        "latitude": 24.8234,
        "longitude": 67.0345,
        "commission_rate": 10.00,
        "logo_url": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=80",
        "cover_photo_url": "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&auto=format&fit=crop&q=80",
        "status": "active",
        "opening_time": datetime.time(11, 0),
        "closing_time": datetime.time(23, 59),
        "menu_items": [
            {
                "name": "Special Chicken Biryani (Double Gosht)",
                "description": "Fragrant basmati rice cooked with tender marinated chicken pieces, aloo bukhara, and authentic Karachi spices.",
                "price": 550.0,
                "category": "Biryani & Rice",
                "photo_url": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
            {
                "name": "Mutton Karachi Karahi",
                "description": "Fresh mutton cooked in wok over high flame with fresh tomatoes, ginger, green chilies and black pepper.",
                "price": 1650.0,
                "category": "Karahi & Curries",
                "photo_url": "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
            {
                "name": "Chicken Malai Boti (8 Pcs)",
                "description": "Melt-in-mouth chicken cubes marinated in rich fresh cream, mild spices and char-grilled to perfection.",
                "price": 620.0,
                "category": "BBQ & Grills",
                "photo_url": "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800&auto=format&fit=crop&q=80",
                "is_available": False,  # Not Available / Out of stock
            },
            {
                "name": "Tandoori Roghani Naan",
                "description": "Fluffy leavened flatbread brushed with butter and sprinkled with sesame seeds.",
                "price": 90.0,
                "category": "Breads",
                "photo_url": "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
        ],
    },
    {
        "name": "Burger Lab Clifton",
        "email": "clifton@burgerlab.pk",
        "phone_number": "+923004445566",
        "address": "Khayaban-e-Seher, Phase 6 DHA, Karachi",
        "latitude": 24.8142,
        "longitude": 67.0583,
        "commission_rate": 10.00,
        "logo_url": "https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=80",
        "cover_photo_url": "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200&auto=format&fit=crop&q=80",
        "status": "active",
        "opening_time": datetime.time(12, 0),
        "closing_time": datetime.time(23, 59),
        "menu_items": [
            {
                "name": "The Doppler Smash Burger",
                "description": "Double smashed beef patties, melted cheddar, crispy fried onion ring, and secret lab sauce.",
                "price": 950.0,
                "category": "Smash Burgers",
                "photo_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
            {
                "name": "Dynamite Crispy Strips (5 pcs)",
                "description": "Tender golden fried chicken fillets tossed in fiery spicy dynamite mayo.",
                "price": 620.0,
                "category": "Appetizers",
                "photo_url": "https://images.unsplash.com/photo-1562967914-608f82629710?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
            {
                "name": "Animal Style Loaded Fries",
                "description": "Skin-on crinkle fries topped with jalapeño cheese, grilled onions, and smoked ground beef.",
                "price": 540.0,
                "category": "Sides",
                "photo_url": "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=800&auto=format&fit=crop&q=80",
                "is_available": False,  # Not Available
            },
        ],
    },
    {
        "name": "Ginsoy Extreme Chinese",
        "email": "orders@ginsoy.pk",
        "phone_number": "+923219998877",
        "address": "Shahrah-e-Jahangir, Block H, North Nazimabad, Karachi",
        "latitude": 24.9362,
        "longitude": 67.0428,
        "commission_rate": 10.00,
        "logo_url": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop&q=80",
        "cover_photo_url": "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80",
        "status": "active",
        "opening_time": datetime.time(12, 30),
        "closing_time": datetime.time(23, 30),
        "menu_items": [
            {
                "name": "Chicken Manchurian with Egg Fried Rice",
                "description": "Classic tangy sweet and sour diced chicken glazed in red sauce, paired with wok-fried rice.",
                "price": 890.0,
                "category": "Chinese Mains",
                "photo_url": "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
            {
                "name": "Crispy Prawn Tempura (6 pcs)",
                "description": "Jumbo tiger prawns dipped in light golden tempura batter, served with spicy garlic dip.",
                "price": 1280.0,
                "category": "Starters",
                "photo_url": "https://images.unsplash.com/photo-1559847844-5315695dadae?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
            {
                "name": "Spicy Dragon Noodles",
                "description": "Thick egg noodles tossed with shredded chicken, capsicum, red chili oil, and scallions.",
                "price": 750.0,
                "category": "Noodles & Rice",
                "photo_url": "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
        ],
    },
    {
        "name": "Pizza Max Gulshan",
        "email": "gulshan@pizzamax.com.pk",
        "phone_number": "+923337776655",
        "address": "University Road, Block 13-D, Gulshan-e-Iqbal, Karachi",
        "latitude": 24.9180,
        "longitude": 67.0971,
        "commission_rate": 10.00,
        "logo_url": "https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?w=500&auto=format&fit=crop&q=80",
        "cover_photo_url": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&auto=format&fit=crop&q=80",
        "status": "active",
        "opening_time": datetime.time(11, 0),
        "closing_time": datetime.time(23, 59),
        "menu_items": [
            {
                "name": "Max Creamy Tikka Pizza (Large 14\")",
                "description": "Tikka chicken, diced onions, capsicum, black olives, topped with rich chipotle creamy swirl.",
                "price": 1499.0,
                "category": "Specialty Pizzas",
                "photo_url": "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
            {
                "name": "Cheesy Garlic Breadsticks",
                "description": "Freshly baked dough seasoned with roasted garlic butter and loaded with mozzarella.",
                "price": 380.0,
                "category": "Appetizers",
                "photo_url": "https://images.unsplash.com/photo-1619895092538-128341789043?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
        ],
    },
    {
        "name": "Kolachi Spirit of Karachi",
        "email": "dine@kolachi.pk",
        "phone_number": "+923019992211",
        "address": "Do Darya, Phase 8, DHA Waterfront, Karachi",
        "latitude": 24.7701,
        "longitude": 67.0912,
        "commission_rate": 10.00,
        "logo_url": "https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80",
        "cover_photo_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80",
        "status": "active",
        "opening_time": datetime.time(17, 0),
        "closing_time": datetime.time(23, 59),
        "menu_items": [
            {
                "name": "Makhni Handi (Boneless)",
                "description": "Tender chicken cooked in velvety butter sauce with cashews and fragrant spices.",
                "price": 1450.0,
                "category": "Handi & Gravy",
                "photo_url": "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
            {
                "name": "Peshawari Chappal Kabab (Pair)",
                "description": "Crispy fried beef patties prepared with diced tomatoes, crushed coriander, and pomegrante seeds.",
                "price": 680.0,
                "category": "BBQ & Grills",
                "photo_url": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
            {
                "name": "Sajji with Rice",
                "description": "Whole grilled chicken salted and charred over natural coals, bedded on spiced yellow rice.",
                "price": 1850.0,
                "category": "House Specialties",
                "photo_url": "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800&auto=format&fit=crop&q=80",
                "is_available": False,  # Not Available
            },
        ],
    },
    {
        "name": "Zameer Ansari Kabab",
        "email": "orders@zameeransari.pk",
        "phone_number": "+923008282821",
        "address": "Sindhi Muslim Cooperative Housing Society (SMCHS), Karachi",
        "latitude": 24.8625,
        "longitude": 67.0622,
        "commission_rate": 10.00,
        "logo_url": "https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=500&auto=format&fit=crop&q=80",
        "cover_photo_url": "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80",
        "status": "active",
        "opening_time": datetime.time(18, 0),
        "closing_time": datetime.time(23, 59),
        "menu_items": [
            {
                "name": "Dhaga Kabab Platter",
                "description": "Traditional thread-bound spiced minced beef charred over open charcoal pit.",
                "price": 650.0,
                "category": "BBQ & Kababs",
                "photo_url": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
            {
                "name": "Reshmi Chicken Tikka",
                "description": "Succulent boneless chicken fillets rubbed in aromatic spices, lemon, and desi ghee.",
                "price": 580.0,
                "category": "BBQ & Kababs",
                "photo_url": "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
            {
                "name": "Puri Paratha",
                "description": "Deep-fried crisp golden paratha rolled in flaky layers.",
                "price": 70.0,
                "category": "Breads",
                "photo_url": "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
        ],
    },
    {
        "name": "Kababjees Fried Chicken (KFC)",
        "email": "kfc@kababjees.com",
        "phone_number": "+923112224455",
        "address": "Rashid Minhas Road, Gulshan-e-Iqbal Block 10, Karachi",
        "latitude": 24.9085,
        "longitude": 67.1082,
        "commission_rate": 10.00,
        "logo_url": "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=500&auto=format&fit=crop&q=80",
        "cover_photo_url": "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=1200&auto=format&fit=crop&q=80",
        "status": "active",
        "opening_time": datetime.time(11, 30),
        "closing_time": datetime.time(23, 59),
        "menu_items": [
            {
                "name": "Crispy Broast Quarter (Leg & Thigh)",
                "description": "Crispy pressure-fried chicken, served with skin-on fries, dinner bun, and signature garlic dip.",
                "price": 599.0,
                "category": "Crispy Broast",
                "photo_url": "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
            {
                "name": "Zinger Crunch Burger",
                "description": "Extra crunchy chicken breast fillet with iceberg lettuce and spicy mayo in a toasted brioche bun.",
                "price": 620.0,
                "category": "Burgers",
                "photo_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
            {
                "name": "Chili Garlic Jumbo Fries",
                "description": "Golden crisp fries dusted with peri-peri chili mix and spicy mayo drizzle.",
                "price": 320.0,
                "category": "Sides",
                "photo_url": "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
        ],
    },
    {
        "name": "Chai Wala Chhotu",
        "email": "chai@chaiwala.pk",
        "phone_number": "+923005556677",
        "address": "Bukhari Commercial Area, Phase 6 DHA, Karachi",
        "latitude": 24.8115,
        "longitude": 67.0652,
        "commission_rate": 10.00,
        "logo_url": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&auto=format&fit=crop&q=80",
        "cover_photo_url": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=1200&auto=format&fit=crop&q=80",
        "status": "active",
        "opening_time": datetime.time(7, 0),
        "closing_time": datetime.time(23, 59),
        "menu_items": [
            {
                "name": "Karak Doodh Patti Chai",
                "description": "Slow-brewed rich black tea simmered in pure buffalo milk and green cardamoms.",
                "price": 140.0,
                "category": "Chai & Beverages",
                "photo_url": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
            {
                "name": "Chicken Cheese Stuffed Paratha",
                "description": "Crisp flaky paratha loaded with spiced shredded chicken breast and cheddar cheese.",
                "price": 380.0,
                "category": "Parathas",
                "photo_url": "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
            {
                "name": "Nutella Sweet Paratha",
                "description": "Warm crispy layered flatbread oozing with hazelnut cocoa spread.",
                "price": 320.0,
                "category": "Parathas",
                "photo_url": "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=800&auto=format&fit=crop&q=80",
                "is_available": False,  # Not Available
            },
        ],
    },
    {
        "name": "Al-Bustan Continental",
        "email": "bustan@albustan.pk",
        "phone_number": "+923332123456",
        "address": "Club Road, Civil Lines, Saddar, Karachi",
        "latitude": 24.8512,
        "longitude": 67.0289,
        "commission_rate": 10.00,
        "logo_url": "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=500&auto=format&fit=crop&q=80",
        "cover_photo_url": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80",
        "status": "active",
        "opening_time": datetime.time(12, 0),
        "closing_time": datetime.time(23, 0),
        "menu_items": [
            {
                "name": "Grilled Moroccan Chicken Steak",
                "description": "Tender chicken breast char-grilled and topped with creamy sambal Moroccan herb sauce, with roasted mash.",
                "price": 1450.0,
                "category": "Steaks & Grills",
                "photo_url": "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
            {
                "name": "Fettuccine Alfredo with Grilled Chicken",
                "description": "Italian pasta tossed with rich parmesan cream, button mushrooms, and sliced herb chicken.",
                "price": 1250.0,
                "category": "Pasta",
                "photo_url": "https://images.unsplash.com/photo-1621996346565-e3d5d6281050?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
        ],
    },
    {
        "name": "Javed Nihari House",
        "email": "javed@niharihouse.pk",
        "phone_number": "+923214567890",
        "address": "Dastagir Road, Federal B Area Block 9, Karachi",
        "latitude": 24.9311,
        "longitude": 67.0684,
        "commission_rate": 10.00,
        "logo_url": "https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=500&auto=format&fit=crop&q=80",
        "cover_photo_url": "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80",
        "status": "active",
        "opening_time": datetime.time(8, 0),
        "closing_time": datetime.time(23, 0),
        "menu_items": [
            {
                "name": "Special Nalli Nihari (Beef Shank)",
                "description": "Slow-cooked beef shank simmering in deep aromatic bone gravy, topped with bone marrow and ginger garnish.",
                "price": 850.0,
                "category": "Nihari Specialties",
                "photo_url": "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
            {
                "name": "Maghaz Nihari (Brain Fry Topped)",
                "description": "Traditional nihari crowned with spiced mutton brain fry.",
                "price": 950.0,
                "category": "Nihari Specialties",
                "photo_url": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
            {
                "name": "Kulcha Naan (Fresh from Oven)",
                "description": "Authentic round kulcha bread sprinkled with black caraway seeds.",
                "price": 60.0,
                "category": "Breads",
                "photo_url": "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
        ],
    },
    {
        "name": "Subway Clifton Block 2",
        "email": "subway.clifton@subway.pk",
        "phone_number": "+923001230011",
        "address": "Marine Drive, Block 2 Clifton, Karachi",
        "latitude": 24.8198,
        "longitude": 67.0255,
        "commission_rate": 10.00,
        "logo_url": "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=500&auto=format&fit=crop&q=80",
        "cover_photo_url": "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&auto=format&fit=crop&q=80",
        "status": "active",
        "opening_time": datetime.time(9, 0),
        "closing_time": datetime.time(23, 59),
        "menu_items": [
            {
                "name": "Roasted Chicken Breast Sub (Footlong)",
                "description": "Oven roasted chicken breast on freshly baked parmesan oregano bread with crisp garden veggies.",
                "price": 1150.0,
                "category": "Sandwiches",
                "photo_url": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
            {
                "name": "Double Chocolate Chip Cookie",
                "description": "Warm chewy cookie packed with melted chocolate chips.",
                "price": 180.0,
                "category": "Cookies & Drinks",
                "photo_url": "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
        ],
    },
    {
        "name": "Kaybees Fast Food",
        "email": "info@kaybees.pk",
        "phone_number": "+923212345678",
        "address": "Tariq Road, PECHS Block 2, Karachi",
        "latitude": 24.8715,
        "longitude": 67.0587,
        "commission_rate": 10.00,
        "logo_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80",
        "cover_photo_url": "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&auto=format&fit=crop&q=80",
        "status": "active",
        "opening_time": datetime.time(12, 0),
        "closing_time": datetime.time(23, 59),
        "menu_items": [
            {
                "name": "Crispy Chicken Club Sandwich",
                "description": "Triple-decker toasted bread filled with crispy chicken, fried egg, cheese slice, and fresh salad.",
                "price": 680.0,
                "category": "Sandwiches & Burgers",
                "photo_url": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
            {
                "name": "Belgian Soft Swirl Ice Cream (Vanilla/Choc)",
                "description": "Double twist velvety soft serve ice cream in crisp waffle cone.",
                "price": 220.0,
                "category": "Desserts",
                "photo_url": "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&auto=format&fit=crop&q=80",
                "is_available": False,  # Not Available
            },
        ],
    },
    {
        "name": "Dunkin' Donuts DHA",
        "email": "dha@dunkin.pk",
        "phone_number": "+923008989891",
        "address": "26th Street, Badar Commercial, Phase 5 DHA, Karachi",
        "latitude": 24.8175,
        "longitude": 67.0512,
        "commission_rate": 10.00,
        "logo_url": "https://images.unsplash.com/photo-1527515862127-a4fc05baf7a5?w=500&auto=format&fit=crop&q=80",
        "cover_photo_url": "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=1200&auto=format&fit=crop&q=80",
        "status": "active",
        "opening_time": datetime.time(8, 0),
        "closing_time": datetime.time(23, 30),
        "menu_items": [
            {
                "name": "Assorted Box of 6 Glazed Donuts",
                "description": "Selection of Boston Kreme, Chocolate Frosted, Strawberry Ring, and Classic Glazed.",
                "price": 890.0,
                "category": "Donuts & Bakery",
                "photo_url": "https://images.unsplash.com/photo-1527515862127-a4fc05baf7a5?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
            {
                "name": "Iced Caramel Macchiato (Large)",
                "description": "Freshly pulled espresso with chilled milk, vanilla syrup, and buttery caramel drizzle.",
                "price": 540.0,
                "category": "Coffee & Beverages",
                "photo_url": "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
        ],
    },
    {
        "name": "Hot N Spicy Roll Corner",
        "email": "rolls@hotnspicy.pk",
        "phone_number": "+923334441122",
        "address": "Khayaban-e-Rahat, Phase 6 DHA, Karachi",
        "latitude": 24.8105,
        "longitude": 67.0701,
        "commission_rate": 10.00,
        "logo_url": "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80",
        "cover_photo_url": "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80",
        "status": "active",
        "opening_time": datetime.time(16, 0),
        "closing_time": datetime.time(23, 59),
        "menu_items": [
            {
                "name": "Chicken Garlic Mayo Paratha Roll",
                "description": "Charbroiled spiced chicken chunks wrapped in crisp paratha with garlic mayonnaise and sliced onions.",
                "price": 320.0,
                "category": "Paratha Rolls",
                "photo_url": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
            {
                "name": "Beef Bihari Kabab Roll",
                "description": "Tender marinated bihari beef kabab rolled with mint chutney and thin onion rings.",
                "price": 360.0,
                "category": "Paratha Rolls",
                "photo_url": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
        ],
    },
    {
        "name": "Broadway Pizza Johar",
        "email": "johar@broadwaypizza.com.pk",
        "phone_number": "+923129876543",
        "address": "Kamran Chowrangi, Block 11 Gulistan-e-Johar, Karachi",
        "latitude": 24.9221,
        "longitude": 67.1298,
        "commission_rate": 10.00,
        "logo_url": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80",
        "cover_photo_url": "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=1200&auto=format&fit=crop&q=80",
        "status": "active",
        "opening_time": datetime.time(11, 0),
        "closing_time": datetime.time(23, 59),
        "menu_items": [
            {
                "name": "Wicked Blend Stuffed Crust Pizza (Medium)",
                "description": "Loaded with smoked pepperoni, grilled chicken sausage, and mozzarella stuffed inside the outer crust.",
                "price": 1290.0,
                "category": "Pizzas",
                "photo_url": "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
            {
                "name": "Cheesy Molten Lava Cake",
                "description": "Rich dark chocolate cake with warm gooey chocolate core.",
                "price": 420.0,
                "category": "Desserts",
                "photo_url": "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
        ],
    },
    {
        "name": "Student Biryani Saddar",
        "email": "saddar@studentbiryani.com",
        "phone_number": "+923009988776",
        "address": "Empress Market Area, Preedy Street, Saddar, Karachi",
        "latitude": 24.8611,
        "longitude": 67.0312,
        "commission_rate": 10.00,
        "logo_url": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80",
        "cover_photo_url": "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&auto=format&fit=crop&q=80",
        "status": "active",
        "opening_time": datetime.time(10, 30),
        "closing_time": datetime.time(23, 0),
        "menu_items": [
            {
                "name": "Chicken Biryani (Regular Single)",
                "description": "Heritage recipe biryani rice served with tender chicken piece, spiced potato, and vinegar raita.",
                "price": 380.0,
                "category": "Biryani",
                "photo_url": "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
            {
                "name": "Zarda (Traditional Sweet Rice)",
                "description": "Fragrant saffron-tinted sweet basmati rice garnished with almonds, pistachios, and gulab jamun.",
                "price": 250.0,
                "category": "Desserts",
                "photo_url": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
        ],
    },
    {
        "name": "Red Apple Bahadurabad",
        "email": "orders@redapple.pk",
        "phone_number": "+923331122334",
        "address": "Bahadur Shah Zafar Road, Bahadurabad, Karachi",
        "latitude": 24.8821,
        "longitude": 67.0705,
        "commission_rate": 10.00,
        "logo_url": "https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=80",
        "cover_photo_url": "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80",
        "status": "active",
        "opening_time": datetime.time(13, 0),
        "closing_time": datetime.time(23, 59),
        "menu_items": [
            {
                "name": "Crispy Chicken Mayo Roll",
                "description": "Tender deep-fried chicken strips rolled in crispy puri paratha with seasoned mayonnaise.",
                "price": 310.0,
                "category": "Fast Food & Rolls",
                "photo_url": "https://images.unsplash.com/photo-1562967914-608f82629710?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
            {
                "name": "Fresh Seasonal Mango Juice",
                "description": "Pure Sindhri mango pulp blended chilled with ice.",
                "price": 280.0,
                "category": "Beverages",
                "photo_url": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&auto=format&fit=crop&q=80",
                "is_available": False,  # Not Available
            },
        ],
    },
    {
        "name": "Waheed Kabab House",
        "email": "waheed@kababhouse.pk",
        "phone_number": "+923004455889",
        "address": "Burns Road Food Street, Saddar, Karachi",
        "latitude": 24.8560,
        "longitude": 67.0195,
        "commission_rate": 10.00,
        "logo_url": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=80",
        "cover_photo_url": "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&auto=format&fit=crop&q=80",
        "status": "active",
        "opening_time": datetime.time(17, 30),
        "closing_time": datetime.time(23, 59),
        "menu_items": [
            {
                "name": "Fry Kabab (Beef Fry Plate)",
                "description": "Melted beef mince infused with spices fried in pure desi butter on hot iron tawa.",
                "price": 540.0,
                "category": "Tawa Specialties",
                "photo_url": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
            {
                "name": "Special Tawa Chicken Piece",
                "description": "Spicy chicken leg piece fried on tawa with crushed green chilies and lemon butter.",
                "price": 420.0,
                "category": "Tawa Specialties",
                "photo_url": "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800&auto=format&fit=crop&q=80",
                "is_available": True,
            },
        ],
    },
]


def seed_dummy_restaurants():
    db: Session = SessionLocal()
    default_pw_hash = hash_password("Partner@123")
    created_restaurants = 0
    created_menu_items = 0

    try:
        for r_data in SAMPLE_RESTAURANTS:
            restaurant = db.query(Restaurant).filter(Restaurant.email == r_data["email"]).first()
            if not restaurant:
                restaurant = Restaurant(
                    name=r_data["name"],
                    email=r_data["email"],
                    password_hash=default_pw_hash,
                    phone_number=r_data["phone_number"],
                    address=r_data["address"],
                    latitude=r_data["latitude"],
                    longitude=r_data["longitude"],
                    commission_rate=r_data["commission_rate"],
                    logo_url=r_data["logo_url"],
                    cover_photo_url=r_data["cover_photo_url"],
                    status=r_data["status"],
                    opening_time=r_data["opening_time"],
                    closing_time=r_data["closing_time"],
                    country_code="+92",
                    currency="PKR",
                )
                db.add(restaurant)
                db.commit()
                db.refresh(restaurant)
                created_restaurants += 1

            # Seed menu items for this restaurant if not already present
            existing_count = db.query(MenuItem).filter(MenuItem.restaurant_id == restaurant.id).count()
            if existing_count == 0:
                items_to_add = []
                for item_data in r_data.get("menu_items", []):
                    items_to_add.append(
                        MenuItem(
                            restaurant_id=restaurant.id,
                            name=item_data["name"],
                            description=item_data["description"],
                            price=item_data["price"],
                            category=item_data["category"],
                            photo_url=item_data["photo_url"],
                            is_available=item_data["is_available"],
                        )
                    )
                if items_to_add:
                    db.add_all(items_to_add)
                    db.commit()
                    created_menu_items += len(items_to_add)

        total_restaurants = db.query(Restaurant).count()
        total_items = db.query(MenuItem).count()
        print(f"Seed complete: {created_restaurants} new restaurants, {created_menu_items} new menu items.")
        print(f"Total Database State: {total_restaurants} restaurants, {total_items} menu items.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_dummy_restaurants()
