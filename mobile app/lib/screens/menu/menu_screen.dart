import 'package:flutter/material.dart';

/// Menu screen showing food items by category with add-to-cart functionality.
class MenuScreen extends StatefulWidget {
  final String categoryName;
  final IconData categoryIcon;

  const MenuScreen({
    super.key,
    required this.categoryName,
    required this.categoryIcon,
  });

  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      appBar: AppBar(
        backgroundColor: theme.colorScheme.surface.withValues(alpha:0.8),
        elevation: 0,
        title: Text(widget.categoryName),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Column(
        children: [
          // Search bar
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerLowest,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha:0.05),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                const Icon(Icons.search,
                    color: Color(0xFF5C403C), size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    onChanged: (value) {
                      setState(() {
                        _searchQuery = value;
                      });
                    },
                    decoration: InputDecoration(
                      hintText: 'Search items...',
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Items count
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${_getItems().length} items',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                TextButton(
                  onPressed: () {},
                  child: const Text('Sort'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // Items list
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _getItems().length,
              itemBuilder: (context, index) {
                final item = _getItems()[index];
                if (_searchQuery.isNotEmpty &&
                    !item.name.toLowerCase().contains(_searchQuery.toLowerCase())) {
                  return const SizedBox.shrink();
                }
                return _MenuItemCard(item: item);
              },
            ),
          ),
        ],
      ),
    );
  }

  List<_MenuItem> _getItems() {
    return [
      _MenuItem(
        name: 'Zinger Burger',
        description: 'Crispy chicken fillet with secret sauce',
        price: 650,
        imageUrl: '',
        isVegetarian: false,
      ),
      _MenuItem(
        name: 'Chicken Burger',
        description: 'Grilled chicken with lettuce and mayo',
        price: 450,
        imageUrl: '',
        isVegetarian: false,
      ),
      _MenuItem(
        name: 'Cheese Burger',
        description: 'Double cheese with beef patty',
        price: 550,
        imageUrl: '',
        isVegetarian: false,
      ),
      _MenuItem(
        name: 'Veggie Delight',
        description: 'Fresh vegetables with tangy sauce',
        price: 380,
        imageUrl: '',
        isVegetarian: true,
      ),
      _MenuItem(
        name: 'BBQ Bacon Burger',
        description: 'Smoky BBQ sauce with crispy bacon',
        price: 720,
        imageUrl: '',
        isVegetarian: false,
      ),
    ];
  }
}

class _MenuItem {
  final String name;
  final String description;
  final double price;
  final String imageUrl;
  final bool isVegetarian;

  const _MenuItem({
    required this.name,
    required this.description,
    required this.price,
    required this.imageUrl,
    required this.isVegetarian,
  });
}

class _MenuItemCard extends StatefulWidget {
  final _MenuItem item;

  const _MenuItemCard({required this.item});

  @override
  State<_MenuItemCard> createState() => _MenuItemCardState();
}

class _MenuItemCardState extends State<_MenuItemCard> {
  int _quantity = 0;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image placeholder
            Container(
              height: 120,
              width: double.infinity,
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerLow,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Center(
                child: Icon(
                  widget.item.isVegetarian
                      ? Icons.bakery_dining
                      : Icons.restaurant,
                  size: 40,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Item info
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            widget.item.name,
                            style: theme.textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          if (widget.item.isVegetarian) ...[
                            const SizedBox(width: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFF1D4ED8).withValues(alpha:0.1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                'veg',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: Color(0xFF1D4ED8),
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        widget.item.description,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 8),

                      // Quantity controls
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            decoration: BoxDecoration(
                              color: theme.colorScheme.surfaceContainerLow,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: IconButton(
                              icon: const Icon(Icons.remove_circle_outline),
                              onPressed: _quantity > 0
                                  ? () {
                                      setState(() {
                                        _quantity--;
                                      });
                                    }
                                  : null,
                              constraints: const BoxConstraints(
                                minWidth: 36,
                                minHeight: 36,
                              ),
                            ),
                          ),
                          Container(
                            width: 32,
                            alignment: Alignment.center,
                            child: Text(
                              '$_quantity',
                              style: theme.textTheme.headlineSmall,
                            ),
                          ),
                          Container(
                            decoration: BoxDecoration(
                              color: theme.colorScheme.surfaceContainerLow,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: IconButton(
                              icon: const Icon(Icons.add_circle_outline),
                              onPressed: () {
                                setState(() {
                                  _quantity++;
                                });
                              },
                              constraints: const BoxConstraints(
                                minWidth: 36,
                                minHeight: 36,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                // Price and add button
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'Rs. ${widget.item.price.toStringAsFixed(0)}',
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: () {
                        setState(() {
                          _quantity++;
                        });
                      },
                      child: Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primary,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          _quantity > 0
                              ? Icons.check
                              : Icons.add,
                          color: Colors.white,
                          size: 24,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
