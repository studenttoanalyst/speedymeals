import 'package:flutter/material.dart';
import 'skeleton_loading.dart';

/// Skeleton placeholder matching [_NotificationTile] in NotificationsScreen.
class NotificationTileSkeleton extends StatelessWidget {
  const NotificationTileSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SkeletonBox(
              width: 42,
              height: 42,
              borderRadius: BorderRadius.circular(12),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      SkeletonLine(width: 150, height: 16),
                    ],
                  ),
                  SizedBox(height: 6),
                  SkeletonLine(width: double.infinity, height: 12),
                  SizedBox(height: 4),
                  SkeletonLine(width: 180, height: 12),
                  SizedBox(height: 8),
                  SkeletonLine(width: 70, height: 10),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Full list of notification skeletons for NotificationsScreen loading state.
class NotificationListSkeleton extends StatelessWidget {
  final int itemCount;

  const NotificationListSkeleton({
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
        itemBuilder: (context, index) => const NotificationTileSkeleton(),
      ),
    );
  }
}
