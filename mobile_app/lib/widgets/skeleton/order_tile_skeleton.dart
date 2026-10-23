import 'package:flutter/material.dart';
import 'skeleton_loading.dart';
import '../../core/theme/app_tokens.dart';

/// Skeleton placeholder matching [_OrderHistoryTile] in OrderHistoryScreen.
class OrderTileSkeleton extends StatelessWidget {
  const OrderTileSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            // Icon container
            SkeletonBox(
              width: 44,
              height: 44,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            const SizedBox(width: 12),
            // Middle details (Restaurant name, order ID & date, status & payment)
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonLine(width: 150, height: 15),
                  SizedBox(height: 6),
                  SkeletonLine(width: 170, height: 12),
                  SizedBox(height: 6),
                  SkeletonLine(width: 120, height: 12),
                ],
              ),
            ),
            const SizedBox(width: 12),
            // Right side (Price and action pill)
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                const SkeletonLine(width: 60, height: 15),
                const SizedBox(height: 8),
                SkeletonBox(
                  width: 76,
                  height: 24,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Full list of order tile skeletons for loading state in OrderHistoryScreen.
class OrderListSkeleton extends StatelessWidget {
  final int itemCount;

  const OrderListSkeleton({
    super.key,
    this.itemCount = 6,
  });

  @override
  Widget build(BuildContext context) {
    return SkeletonLoading(
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        itemCount: itemCount,
        separatorBuilder: (context, index) => const SizedBox(height: 10),
        itemBuilder: (context, index) => const OrderTileSkeleton(),
      ),
    );
  }
}
