import 'package:flutter/material.dart';
import 'skeleton_loading.dart';
import '../../core/theme/app_tokens.dart';

/// Skeleton placeholder matching [_AddressTile] in SavedAddressesScreen.
class AddressTileSkeleton extends StatelessWidget {
  const AddressTileSkeleton({super.key});

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
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const SkeletonLine(width: 110, height: 16),
                      const SizedBox(width: 8),
                      SkeletonBox(
                        width: 50,
                        height: 18,
                        borderRadius: BorderRadius.circular(AppRadius.xs),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const SkeletonLine(width: 220, height: 12),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      SkeletonBox(
                        width: 95,
                        height: 24,
                        borderRadius: BorderRadius.circular(AppRadius.md),
                      ),
                      const Spacer(),
                      SkeletonBox(
                        width: 28,
                        height: 28,
                        borderRadius: BorderRadius.circular(AppRadius.md),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Full list of address skeletons for SavedAddressesScreen loading state.
class AddressListSkeleton extends StatelessWidget {
  final int itemCount;

  const AddressListSkeleton({
    super.key,
    this.itemCount = 4,
  });

  @override
  Widget build(BuildContext context) {
    return SkeletonLoading(
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
        itemCount: itemCount,
        separatorBuilder: (context, index) => const SizedBox(height: 10),
        itemBuilder: (context, index) => const AddressTileSkeleton(),
      ),
    );
  }
}
