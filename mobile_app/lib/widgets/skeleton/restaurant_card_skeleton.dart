import 'package:flutter/material.dart';
import 'skeleton_loading.dart';
import '../../core/theme/app_tokens.dart';

/// Skeleton placeholder matching [_RestaurantCard] in DashboardScreen.
class RestaurantCardSkeleton extends StatelessWidget {
  const RestaurantCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Image placeholder with delivery time badge placeholder
          SizedBox(
            height: 124,
            child: Stack(
              children: [
                const SkeletonBox(
                  width: double.infinity,
                  height: 124,
                  borderRadius: BorderRadius.zero,
                ),
                Positioned(
                  bottom: 10,
                  left: 10,
                  child: SkeletonBox(
                    width: 72,
                    height: 22,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                  ),
                ),
              ],
            ),
          ),
          // Info section
          Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    const Expanded(
                      child: SkeletonLine(height: 16),
                    ),
                    const SizedBox(width: 12),
                    SkeletonBox(
                      width: 38,
                      height: 18,
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const SkeletonLine(width: 190, height: 12),
                const SizedBox(height: 6),
                const SkeletonLine(width: 120, height: 12),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Horizontal rail of restaurant card skeletons matching the dashboard rail.
class RestaurantRailSkeleton extends StatelessWidget {
  final int itemCount;

  const RestaurantRailSkeleton({
    super.key,
    this.itemCount = 3,
  });

  @override
  Widget build(BuildContext context) {
    return SkeletonLoading(
      child: SizedBox(
        height: 236,
        child: ListView.builder(
          scrollDirection: Axis.horizontal,
          physics: const NeverScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: itemCount,
          itemBuilder: (context, index) {
            return const Padding(
              padding: EdgeInsets.only(right: 16),
              child: SizedBox(
                width: 280,
                child: RestaurantCardSkeleton(),
              ),
            );
          },
        ),
      ),
    );
  }
}
