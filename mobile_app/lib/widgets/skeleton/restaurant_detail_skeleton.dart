import 'package:flutter/material.dart';
import 'skeleton_loading.dart';

/// Full-page skeleton matching [RestaurantDetailScreen] loading state.
class RestaurantDetailSkeleton extends StatelessWidget {
  const RestaurantDetailSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return SkeletonLoading(
      child: SingleChildScrollView(
        physics: const NeverScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Hero banner placeholder
            const SkeletonBox(
              width: double.infinity,
              height: 200,
              borderRadius: BorderRadius.zero,
            ),

            // 2. Overlapping restaurant card placeholder
            Transform.translate(
              offset: const Offset(0, -18),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Card(
                  margin: EdgeInsets.zero,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            SkeletonBox(
                              width: 54,
                              height: 54,
                              borderRadius: BorderRadius.circular(14),
                            ),
                            const SizedBox(width: 12),
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  SkeletonLine(width: 160, height: 18),
                                  SizedBox(height: 8),
                                  SkeletonLine(width: 110, height: 12),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        // Badges/chips row
                        Row(
                          children: [
                            SkeletonBox(
                              width: 60,
                              height: 26,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            const SizedBox(width: 8),
                            SkeletonBox(
                              width: 85,
                              height: 26,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            const SizedBox(width: 8),
                            SkeletonBox(
                              width: 75,
                              height: 26,
                              borderRadius: BorderRadius.circular(20),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // 3. Category tabs placeholder (horizontal rail)
            SizedBox(
              height: 38,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                physics: const NeverScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: 4,
                separatorBuilder: (context, index) => const SizedBox(width: 8),
                itemBuilder: (context, index) => SkeletonBox(
                  width: index == 0 ? 80 : 95,
                  height: 34,
                  borderRadius: BorderRadius.circular(20),
                ),
              ),
            ),

            const SizedBox(height: 16),

            // 4. Menu dish cards list placeholder
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SkeletonLine(width: 130, height: 18),
                  const SizedBox(height: 14),
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: 4,
                    separatorBuilder: (context, index) =>
                        const SizedBox(height: 12),
                    itemBuilder: (context, index) => const _MenuItemSkeletonCard(),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class _MenuItemSkeletonCard extends StatelessWidget {
  const _MenuItemSkeletonCard();

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonLine(width: 140, height: 15),
                  SizedBox(height: 8),
                  SkeletonLine(width: 190, height: 12),
                  SizedBox(height: 4),
                  SkeletonLine(width: 120, height: 12),
                  SizedBox(height: 12),
                  SkeletonLine(width: 60, height: 15),
                ],
              ),
            ),
            const SizedBox(width: 12),
            SkeletonBox(
              width: 96,
              height: 96,
              borderRadius: BorderRadius.circular(16),
            ),
          ],
        ),
      ),
    );
  }
}
