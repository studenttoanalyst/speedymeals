import 'package:flutter/material.dart';
import 'skeleton_loading.dart';
import '../../core/theme/app_tokens.dart';

/// Shimmer wrapper customized for the Rider Portal's dark theme (#0F172A).
class RiderSkeletonLoading extends StatelessWidget {
  final Widget child;

  const RiderSkeletonLoading({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return SkeletonLoading(
      baseColor: AppColors.ink800,
      highlightColor: AppColors.ink700,
      child: child,
    );
  }
}

/// Skeleton placeholder matching [RiderDashboardScreen] layout.
class RiderDashboardSkeleton extends StatelessWidget {
  const RiderDashboardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return RiderSkeletonLoading(
      child: SingleChildScrollView(
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Online status banner placeholder
            const SkeletonBox(
              width: double.infinity,
              height: 80,
              borderRadius: BorderRadius.all(Radius.circular(AppRadius.md)),
            ),
            const SizedBox(height: 24),

            // Section title: Wallet Summary
            const SkeletonLine(width: 150, height: 18),
            const SizedBox(height: 12),

            // 2x2 Metric grid
            Row(
              children: const [
                Expanded(
                  child: SkeletonBox(
                    height: 96,
                    borderRadius: BorderRadius.all(Radius.circular(AppRadius.md)),
                  ),
                ),
                SizedBox(width: 12),
                Expanded(
                  child: SkeletonBox(
                    height: 96,
                    borderRadius: BorderRadius.all(Radius.circular(AppRadius.md)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: const [
                Expanded(
                  child: SkeletonBox(
                    height: 96,
                    borderRadius: BorderRadius.all(Radius.circular(AppRadius.md)),
                  ),
                ),
                SizedBox(width: 12),
                Expanded(
                  child: SkeletonBox(
                    height: 96,
                    borderRadius: BorderRadius.all(Radius.circular(AppRadius.md)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 28),

            // Section title: My Deliveries
            const SkeletonLine(width: 130, height: 18),
            const SizedBox(height: 12),

            // Active delivery task card skeletons
            const SkeletonBox(
              width: double.infinity,
              height: 130,
              borderRadius: BorderRadius.all(Radius.circular(AppRadius.md)),
            ),
            const SizedBox(height: 12),
            const SkeletonBox(
              width: double.infinity,
              height: 130,
              borderRadius: BorderRadius.all(Radius.circular(AppRadius.md)),
            ),
          ],
        ),
      ),
    );
  }
}

/// Skeleton placeholder matching [RiderWalletScreen] layout.
class RiderWalletSkeleton extends StatelessWidget {
  const RiderWalletSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return RiderSkeletonLoading(
      child: SingleChildScrollView(
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top wallet balance gradient card placeholder
            const SkeletonBox(
              width: double.infinity,
              height: 130,
              borderRadius: BorderRadius.all(Radius.circular(AppRadius.md)),
            ),
            const SizedBox(height: 16),

            // 2 Stat cards row
            Row(
              children: const [
                Expanded(
                  child: SkeletonBox(
                    height: 85,
                    borderRadius: BorderRadius.all(Radius.circular(AppRadius.md)),
                  ),
                ),
                SizedBox(width: 12),
                Expanded(
                  child: SkeletonBox(
                    height: 85,
                    borderRadius: BorderRadius.all(Radius.circular(AppRadius.md)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // COD eligibility stat card placeholder
            const SkeletonBox(
              width: double.infinity,
              height: 85,
              borderRadius: BorderRadius.all(Radius.circular(AppRadius.md)),
            ),
            const SizedBox(height: 24),

            // Action button placeholders
            const SkeletonBox(
              width: double.infinity,
              height: 50,
              borderRadius: BorderRadius.all(Radius.circular(AppRadius.md)),
            ),
            const SizedBox(height: 12),
            const SkeletonBox(
              width: double.infinity,
              height: 50,
              borderRadius: BorderRadius.all(Radius.circular(AppRadius.md)),
            ),
            const SizedBox(height: 20),

            // Footnote lines
            const SkeletonLine(width: double.infinity, height: 12),
            const SizedBox(height: 6),
            const SkeletonLine(width: 260, height: 12),
          ],
        ),
      ),
    );
  }
}

/// Skeleton placeholder matching [RiderDocumentsScreen] layout.
class RiderDocumentsSkeleton extends StatelessWidget {
  const RiderDocumentsSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return RiderSkeletonLoading(
      child: SingleChildScrollView(
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Approval status banner placeholder
            const SkeletonBox(
              width: double.infinity,
              height: 72,
              borderRadius: BorderRadius.all(Radius.circular(AppRadius.md)),
            ),
            const SizedBox(height: 20),

            // Header title & subtext
            const SkeletonLine(width: 170, height: 18),
            const SizedBox(height: 6),
            const SkeletonLine(width: 250, height: 12),
            const SizedBox(height: 16),

            // Progress indicator placeholder
            const SkeletonBox(
              width: double.infinity,
              height: 48,
              borderRadius: BorderRadius.all(Radius.circular(AppRadius.md)),
            ),
            const SizedBox(height: 20),

            // 3 Document card placeholders (CNIC, License, Vehicle)
            const SkeletonBox(
              width: double.infinity,
              height: 100,
              borderRadius: BorderRadius.all(Radius.circular(AppRadius.md)),
            ),
            const SizedBox(height: 12),
            const SkeletonBox(
              width: double.infinity,
              height: 100,
              borderRadius: BorderRadius.all(Radius.circular(AppRadius.md)),
            ),
            const SizedBox(height: 12),
            const SkeletonBox(
              width: double.infinity,
              height: 100,
              borderRadius: BorderRadius.all(Radius.circular(AppRadius.md)),
            ),
          ],
        ),
      ),
    );
  }
}
