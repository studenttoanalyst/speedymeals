// Order model for the Speedy Meals app.
// Import enums from app_constants
import '../core/constants/app_constants.dart' show OrderStatus, PaymentMethod;

class Order {
  final String id;
  final String customerName;
  final String customerPhone;
  final String address;
  final List<OrderItem> items;
  final double subtotal;
  final double deliveryFee;
  final double platformFee;
  final double tax;
  final double total;
  final PaymentMethod paymentMethod;
  final OrderStatus status;

  const Order({
    required this.id,
    required this.customerName,
    required this.customerPhone,
    required this.address,
    required this.items,
    required this.subtotal,
    required this.deliveryFee,
    required this.platformFee,
    required this.tax,
    required this.total,
    required this.paymentMethod,
    required this.status,
  });

  @override
  String toString() {
    return 'Order(id: $id, total: $total, status: $status)';
  }
}

/// Individual order item.
class OrderItem {
  final String name;
  final String description;
  final double price;
  final int quantity;

  const OrderItem({
    required this.name,
    required this.description,
    required this.price,
    required this.quantity,
  });

  double get total => price * quantity;
}
