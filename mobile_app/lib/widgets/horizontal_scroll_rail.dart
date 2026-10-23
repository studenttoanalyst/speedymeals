import 'package:flutter/material.dart';

import '../core/theme/app_tokens.dart';

/// Horizontal list with previous/next arrow buttons.
///
/// Swiping (touch, mouse drag, trackpad) scrolls as usual; the arrows page by
/// ~80% of the visible width and only appear when there is more content in
/// that direction, so short lists stay clean.
class HorizontalScrollRail extends StatefulWidget {
  const HorizontalScrollRail({
    super.key,
    required this.height,
    required this.itemCount,
    required this.itemBuilder,
    this.padding = const EdgeInsets.symmetric(horizontal: AppSpacing.s4),
    this.semanticLabel,
  });

  final double height;
  final int itemCount;
  final IndexedWidgetBuilder itemBuilder;
  final EdgeInsetsGeometry padding;

  /// Used to label the arrow buttons for screen readers, e.g. "restaurants".
  final String? semanticLabel;

  @override
  State<HorizontalScrollRail> createState() => _HorizontalScrollRailState();
}

class _HorizontalScrollRailState extends State<HorizontalScrollRail> {
  final _controller = ScrollController();
  bool _canBack = false;
  bool _canForward = false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_sync);
    WidgetsBinding.instance.addPostFrameCallback((_) => _sync());
  }

  @override
  void didUpdateWidget(covariant HorizontalScrollRail oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.itemCount != widget.itemCount) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _sync());
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _sync() {
    if (!mounted || !_controller.hasClients) return;
    final p = _controller.position;
    final back = p.pixels > p.minScrollExtent + 1;
    final forward = p.pixels < p.maxScrollExtent - 1;
    if (back != _canBack || forward != _canForward) {
      setState(() {
        _canBack = back;
        _canForward = forward;
      });
    }
  }

  void _page(int direction) {
    if (!_controller.hasClients) return;
    final p = _controller.position;
    final target = (p.pixels + direction * p.viewportDimension * 0.8)
        .clamp(p.minScrollExtent, p.maxScrollExtent);
    _controller.animateTo(target, duration: AppMotion.slow, curve: AppMotion.standard);
  }

  @override
  Widget build(BuildContext context) {
    final what = widget.semanticLabel ?? 'items';
    return SizedBox(
      height: widget.height,
      child: Stack(
        children: [
          NotificationListener<ScrollMetricsNotification>(
            onNotification: (_) {
              _sync();
              return false;
            },
            child: ListView.builder(
              controller: _controller,
              scrollDirection: Axis.horizontal,
              padding: widget.padding,
              itemCount: widget.itemCount,
              itemBuilder: widget.itemBuilder,
            ),
          ),
          if (_canBack)
            Positioned(
              left: AppSpacing.s1,
              top: 0,
              bottom: 0,
              child: _ArrowButton(
                icon: Icons.chevron_left_rounded,
                tooltip: 'Previous $what',
                onPressed: () => _page(-1),
              ),
            ),
          if (_canForward)
            Positioned(
              right: AppSpacing.s1,
              top: 0,
              bottom: 0,
              child: _ArrowButton(
                icon: Icons.chevron_right_rounded,
                tooltip: 'More $what',
                onPressed: () => _page(1),
              ),
            ),
        ],
      ),
    );
  }
}

class _ArrowButton extends StatelessWidget {
  const _ArrowButton({required this.icon, required this.tooltip, required this.onPressed});

  final IconData icon;
  final String tooltip;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Tooltip(
        message: tooltip,
        child: Material(
          color: AppColors.paper,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(AppRadius.sm)),
            side: BorderSide(color: AppColors.line),
          ),
          elevation: 2,
          shadowColor: AppColors.ink900.withValues(alpha: 0.3),
          child: InkWell(
            onTap: onPressed,
            customBorder: const RoundedRectangleBorder(
              borderRadius: BorderRadius.all(Radius.circular(AppRadius.sm)),
            ),
            // 40 wide x 44 tall: meets the minimum touch height.
            child: SizedBox(
              width: AppSizes.controlMd,
              height: AppSizes.touchMin,
              child: Icon(icon, color: AppColors.text, size: AppSizes.iconLg),
            ),
          ),
        ),
      ),
    );
  }
}
