/// Restaurant and Menu Data Models for Speedy Meals.
class Restaurant {
  final String id;
  final String name;
  final String tagline;
  final String location;
  final String distance;
  final double rating;
  final String reviewCount;
  final String deliveryTime;
  final String deliveryFeeInfo;
  final String expressTime;
  final String heroAsset;
  final String logoAsset;
  final String categoryTag;
  final List<String> badges;
  final bool freeDelivery;
  final bool isExpressCloudKitchen;
  final String promoCode;
  final String promoDiscount;
  final List<RestaurantMenuCategory> categories;

  const Restaurant({
    required this.id,
    required this.name,
    required this.tagline,
    required this.location,
    required this.distance,
    required this.rating,
    this.reviewCount = '1.2k+',
    required this.deliveryTime,
    this.deliveryFeeInfo = 'Rs. 50 Base + Rs. 20/km',
    this.expressTime = 'Speedy Express: 20 mins',
    required this.heroAsset,
    this.logoAsset = 'assets/images/logo.png',
    this.categoryTag = 'Cloud Kitchen',
    required this.badges,
    this.freeDelivery = false,
    this.isExpressCloudKitchen = true,
    this.promoCode = 'SPEEDY50',
    this.promoDiscount = '50% off delivery',
    this.categories = const [],
  });

  /// Alias for hero image URL / path.
  String get image => heroAsset;
}

class RestaurantMenuCategory {
  final String id;
  final String name;
  final String? emoji;
  final List<RestaurantMenuItem> items;

  const RestaurantMenuCategory({
    required this.id,
    required this.name,
    this.emoji,
    required this.items,
  });
}

class RestaurantMenuItem {
  final String id;
  final String name;
  final String description;
  final double price;
  final double rating;
  final String imageUrl;
  final String? tag; // e.g. "MUST TRY", "SPICY FAVORITE", "CHEF'S SIGNATURE"
  final String? tagType; // "must_try", "spicy", "signature"

  const RestaurantMenuItem({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.rating,
    required this.imageUrl,
    this.tag,
    this.tagType,
  });
}

/// Sample restaurant database with full menu data matching Stitch design specs.
final List<Restaurant> sampleRestaurants = [
  const Restaurant(
    id: 'rest_001',
    name: 'Napoli Crust Co.',
    tagline: 'Neapolitan Pizza • Garlic Knots • Cannoli',
    location: 'Sea View Strip',
    distance: '2.1 km',
    rating: 4.9,
    reviewCount: '2.4k+',
    deliveryTime: '20-25 min',
    deliveryFeeInfo: 'Free Delivery on Orders > Rs. 800',
    expressTime: 'Speedy Express: 22 mins',
    heroAsset:
        'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80',
    logoAsset:
        'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=200&auto=format&fit=crop&q=80',
    categoryTag: 'Neapolitan Pizzeria',
    badges: ['Top Rated', 'Cloud Exclusive'],
    freeDelivery: true,
    promoCode: 'NAPOLI30',
    promoDiscount: '30% off on all pizzas',
    categories: [
      RestaurantMenuCategory(
        id: 'cat_pizzas',
        name: 'Neapolitan Pizzas',
        items: [
          RestaurantMenuItem(
            id: 'item_101',
            name: 'Pepperoni Feast (S)',
            description:
                'Double beef pepperoni, fresh mozzarella, San Marzano tomato sauce, fresh basil on 48h fermented crust.',
            price: 980,
            rating: 4.9,
            imageUrl:
                'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&auto=format&fit=crop&q=80',
            tag: 'MUST TRY',
            tagType: 'must_try',
          ),
          RestaurantMenuItem(
            id: 'item_102',
            name: 'Margherita Supreme',
            description:
                'Fresh buffalo mozzarella, San Marzano tomatoes, extra virgin olive oil, and fresh basil leaves.',
            price: 850,
            rating: 4.8,
            imageUrl:
                'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&auto=format&fit=crop&q=80',
            tag: "CHEF'S SIGNATURE",
            tagType: 'signature',
          ),
          RestaurantMenuItem(
            id: 'item_103',
            name: 'Quattro Formaggi',
            description:
                'Four cheese blend: Mozzarella, Gorgonzola, Parmesan, and Fontina with a honey drizzle.',
            price: 1150,
            rating: 4.9,
            imageUrl:
                'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80',
            tag: 'BESTSELLER',
            tagType: 'must_try',
          ),
        ],
      ),
      RestaurantMenuCategory(
        id: 'cat_starters',
        name: 'Starters & Sides',
        items: [
          RestaurantMenuItem(
            id: 'item_104',
            name: 'Garlic Butter Knots',
            description:
                'Freshly baked dough knots brushed with garlic herb butter, parmesan & served with marinara dip.',
            price: 380,
            rating: 4.8,
            imageUrl:
                'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?w=500&auto=format&fit=crop&q=80',
            tag: 'POPULAR',
            tagType: 'spicy',
          ),
        ],
      ),
    ],
  ),
  const Restaurant(
    id: 'rest_002',
    name: 'Express Cloud Kitchen',
    tagline: 'Multi-Brand Culinary Hub • Gourmet Bowls & Wraps',
    location: 'Gulberg Commercial',
    distance: '1.5 km',
    rating: 4.8,
    reviewCount: '3.1k+',
    deliveryTime: '15-20 min',
    deliveryFeeInfo: 'Rs. 40 Flat Delivery',
    expressTime: 'Speedy Express: 15 mins',
    heroAsset:
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
    logoAsset:
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&auto=format&fit=crop&q=80',
    categoryTag: 'Express Hub',
    badges: ['Speedy Express', 'Cloud Exclusive'],
    freeDelivery: false,
    isExpressCloudKitchen: true,
    promoCode: 'EXPRESS50',
    promoDiscount: '50% off express fee',
    categories: [
      RestaurantMenuCategory(
        id: 'cat_bowls',
        name: 'Gourmet Rice Bowls',
        items: [
          RestaurantMenuItem(
            id: 'item_201',
            name: 'Teriyaki Chicken Crunch Bowl',
            description:
                'Glazed chicken thigh, jasmine rice, edamame, pickled cucumber, sesame seeds & spicy mayo.',
            price: 790,
            rating: 4.9,
            imageUrl:
                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
            tag: 'TOP ORDERED',
            tagType: 'must_try',
          ),
          RestaurantMenuItem(
            id: 'item_202',
            name: 'BBQ Beef Slider Trio Box',
            description:
                '3 mini smashed Angus sliders with melted cheddar, crispy onion rings & house BBQ dip.',
            price: 920,
            rating: 4.8,
            imageUrl:
                'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80',
            tag: 'MUST TRY',
            tagType: 'signature',
          ),
        ],
      ),
      RestaurantMenuCategory(
        id: 'cat_wraps',
        name: 'Cravers Wraps',
        items: [
          RestaurantMenuItem(
            id: 'item_203',
            name: 'Fiery Crispy Chicken Wrap',
            description:
                'Crispy tenders wrapped in toasted tortilla with purple cabbage, spicy ranch & jalapeños.',
            price: 580,
            rating: 4.7,
            imageUrl:
                'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500&auto=format&fit=crop&q=80',
            tag: 'SPICY',
            tagType: 'spicy',
          ),
        ],
      ),
    ],
  ),
  const Restaurant(
    id: 'rest_003',
    name: 'Burger Craze',
    tagline: 'Artisanal Smashed Patties • Gourmet Brioche',
    location: 'Clifton Block 4',
    distance: '1.2 km',
    rating: 4.9,
    reviewCount: '1.2k+',
    deliveryTime: '18-22 min',
    deliveryFeeInfo: 'Rs. 50 Base + Rs. 20/km',
    expressTime: 'Speedy Express: 20 mins',
    heroAsset:
        'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80',
    logoAsset:
        'https://images.unsplash.com/photo-1550547660-d9450f859349?w=200&auto=format&fit=crop&q=80',
    categoryTag: 'Burger Lab',
    badges: ['Cloud Exclusive'],
    freeDelivery: false,
    promoCode: 'CRAZE20',
    promoDiscount: 'Rs. 200 discount',
    categories: [
      RestaurantMenuCategory(
        id: 'cat_burgers',
        name: 'Gourmet Burgers',
        items: [
          RestaurantMenuItem(
            id: 'item_001',
            name: 'The Mighty Speedy Beef Burger',
            description:
                '200g smashed prime beef patty, smoked aged cheese, homemade garlic truffle sauce & caramelized onions on toasted brioche.',
            price: 890,
            rating: 4.9,
            imageUrl:
                'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500&auto=format&fit=crop&q=80',
            tag: 'MUST TRY',
            tagType: 'must_try',
          ),
          RestaurantMenuItem(
            id: 'item_002',
            name: 'Fiery Zinger Crunch',
            description:
                'Spicy crispy breaded chicken thigh, tossed in hot honey glaze, jalapeño mayo, purple slaw on butter bun.',
            price: 690,
            rating: 4.8,
            imageUrl:
                'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=500&auto=format&fit=crop&q=80',
            tag: 'SPICY FAVORITE',
            tagType: 'spicy',
          ),
          RestaurantMenuItem(
            id: 'item_003',
            name: 'Loaded Animal Fries',
            description:
                'Golden skin-on crispy fries smothered in melted Monterey Jack cheddar, sweet caramelized onions & house drizzle.',
            price: 480,
            rating: 4.9,
            imageUrl:
                'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=500&auto=format&fit=crop&q=80',
            tag: "CHEF'S SIGNATURE",
            tagType: 'signature',
          ),
        ],
      ),
    ],
  ),
  const Restaurant(
    id: 'rest_004',
    name: 'Midnight Biryani & Karahi',
    tagline: 'Desi Spice Lab • Slow-cooked Dum Biryani',
    location: 'Saddar Food Street',
    distance: '3.0 km',
    rating: 4.8,
    reviewCount: '4.5k+',
    deliveryTime: '25-30 min',
    deliveryFeeInfo: 'Rs. 60 Flat Delivery',
    expressTime: 'Speedy Express: 25 mins',
    heroAsset:
        'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80',
    logoAsset:
        'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=200&auto=format&fit=crop&q=80',
    categoryTag: 'Desi Craves',
    badges: ['Night Crave Special'],
    freeDelivery: true,
    promoCode: 'DESISPEEDY',
    promoDiscount: 'Free Raita + Drink',
    categories: [
      RestaurantMenuCategory(
        id: 'cat_biryani',
        name: 'Special Biryani',
        items: [
          RestaurantMenuItem(
            id: 'item_301',
            name: 'Special Chicken Dum Biryani',
            description:
                'Long grain basmati rice layered with aromatic spices, marinated chicken & golden potatoes.',
            price: 490,
            rating: 4.9,
            imageUrl:
                'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80',
            tag: 'MUST TRY',
            tagType: 'must_try',
          ),
        ],
      ),
    ],
  ),
];
