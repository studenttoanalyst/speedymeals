import 'package:flutter/material.dart';
import 'skeleton_loading.dart';

/// Skeleton placeholder for the CartScreen when cart data is asynchronously loading.
class CartScreenSkeleton extends StatelessWidget {
  final int itemCount;

  const CartScreenSkeleton({
    super.key,
    this.itemCount = 3,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SkeletonLoading(
      child: Column(
        children: [
          // Cart items list placeholder
          Expanded(
            child: ListView.separated(
              physics: const NeverScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              itemCount: itemCount,
              separatorBuilder: (context, index) => const SizedBox(height: 10),
              itemBuilder: (context, index) => const _CartItemSkeletonTile(),
            ),
          ),

          // Bottom checkout summary bar placeholder
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: theme.colorScheme.surface,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.08),
                  blurRadius: 10,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: SafeArea(
              top: false,
              child: Column(
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      SkeletonLine(width: 60, height: 14),
                      SkeletonLine(width: 70, height: 14),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      SkeletonLine(width: 90, height: 14),
                      SkeletonLine(width: 60, height: 14),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Card(
                    margin: EdgeInsets.zero,
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: const [
                          SkeletonLine(width: 50, height: 18),
                          SkeletonLine(width: 80, height: 18),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const SkeletonBox(
                    width: double.infinity,
                    height: 48,
                    borderRadius: BorderRadius.all(Radius.circular(16)),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CartItemSkeletonTile extends StatelessWidget {
  const _CartItemSkeletonTile();

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SkeletonBox(
              width: 56,
              height: 56,
              borderRadius: BorderRadius.circular(12),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonLine(width: 140, height: 15),
                  SizedBox(height: 6),
                  SkeletonLine(width: 100, height: 12),
                  SizedBox(height: 8),
                  SkeletonLine(width: 65, height: 15),
                ],
              ),
            ),
            const SizedBox(width: 12),
            SkeletonBox(
              width: 80,
              height: 32,
              borderRadius: BorderRadius.circular(8),
            ),
          ],
        ),
      ),
    );
  }
}
