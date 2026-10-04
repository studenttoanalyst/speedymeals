import 'package:flutter/material.dart';

import '../../core/constants/app_constants.dart';
import '../../core/network/api_exception.dart';
import '../../data/json_utils.dart';
import '../../data/models/rider_models.dart';
import '../../data/repositories/rider_repository.dart';

/// Rider wallet, earnings and COD cash — every figure from the backend.
///
/// Backed by:
///   GET  /wallet/earnings       → earnings / wallet / cash owed
///   GET  /wallet/cod-eligibility → whether more cash work is allowed
///   POST /wallet/recharge        → keep the wallet above the Rs. 500 floor
///   POST /wallet/cash-deposit    → submit collected COD cash
///
/// The server owns the rules: the Rs. 500 minimum to go online, the Rs. 10
/// deduction per delivery, the Rs. 10,000 cash cap and the expected-cash /
/// discrepancy calculation. This screen only displays and submits.
class RiderWalletScreen extends StatefulWidget {
  const RiderWalletScreen({super.key});

  @override
  State<RiderWalletScreen> createState() => _RiderWalletScreenState();
}

class _RiderWalletScreenState extends State<RiderWalletScreen> {
  static const Color _bg = Color(0xFF0F172A);
  static const Color _card = Color(0xFF1E293B);
  static const Color _border = Color(0xFF334155);
  static const Color _green = Color(0xFF10B981);
  static const Color _red = Color(0xFFDC2626);

  final RiderRepository _repository = RiderRepository();

  RiderWallet? _wallet;
  CODEligibility? _cod;
  bool _isLoading = true;
  ApiException? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final wallet = await _repository.earnings();
      final cod = await _repository.codEligibility();
      if (!mounted) return;
      setState(() {
        _wallet = wallet;
        _cod = cod;
        _isLoading = false;
      });
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error;
        _isLoading = false;
      });
    }
  }

  Future<void> _openRechargeSheet() async {
    final result = await showModalBottomSheet<(double, String)>(
      context: context,
      isScrollControlled: true,
      backgroundColor: _card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => const _RechargeSheet(),
    );
    if (result == null || !mounted) return;

    try {
      await _repository.recharge(amount: result.$1, method: result.$2);
      await _load();
      if (!mounted) return;
      _showMessage('Wallet topped up successfully.', _green);
    } on ApiException catch (error) {
      _showMessage(error.message, _red);
    }
  }

  Future<void> _openCashDepositSheet() async {
    final result = await showModalBottomSheet<(double, String)>(
      context: context,
      isScrollControlled: true,
      backgroundColor: _card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => _CashDepositSheet(
        suggestedAmount: _wallet?.pendingCashOwed ?? 0,
      ),
    );
    if (result == null || !mounted) return;

    try {
      await _repository.submitCashDeposit(
        amountSubmitted: result.$1,
        submissionMethod: result.$2,
      );
      await _load();
      if (!mounted) return;
      _showMessage('Cash deposit recorded.', _green);
    } on ApiException catch (error) {
      _showMessage(error.message, _red);
    }
  }

  void _showMessage(String message, Color color) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: color,
          behavior: SnackBarBehavior.floating,
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _card,
        elevation: 2,
        iconTheme: const IconThemeData(color: Colors.white),
        title: const Text('Wallet & Earnings', style: TextStyle(color: Colors.white)),
        actions: [
          IconButton(
            onPressed: _load,
            icon: const Icon(Icons.refresh_rounded, color: Colors.white70),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: SafeArea(child: _buildBody()),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    final failure = _error;
    if (failure != null && _wallet == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline_rounded, size: 52, color: _red),
              const SizedBox(height: 16),
              const Text(
                'Could not load your wallet',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                failure.message,
                style: const TextStyle(color: Color(0xFF94A3B8)),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: _load,
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: const Text('Try again'),
              ),
            ],
          ),
        ),
      );
    }

    final wallet = _wallet;
    final cod = _cod;
    final belowMin = wallet?.isBelowMinWallet ?? false;
    final topUp = wallet?.topUpNeeded ?? 0;

    return RefreshIndicator(
      onRefresh: _load,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: belowMin
                      ? [const Color(0xFF7F1D1D), const Color(0xFF991B1B)]
                      : [const Color(0xFF065F46), const Color(0xFF047857)],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'WALLET BALANCE',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: Colors.white70,
                      letterSpacing: 1,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    wallet?.walletBalanceLabel ?? '—',
                    style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w800, color: Colors.white),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    belowMin
                        ? 'Below the Rs. 500 minimum. Top up ${formatPkr(topUp)} to go online.'
                        : 'You can go online and receive deliveries.',
                    style: const TextStyle(fontSize: 12.5, color: Colors.white70, height: 1.4),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    label: 'Total earnings',
                    value: wallet?.earningsLabel ?? '—',
                    color: _green,
                    cardColor: _card,
                    borderColor: _border,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    label: 'Cash owed',
                    value: wallet?.pendingCashLabel ?? '—',
                    color: const Color(0xFFF59E0B),
                    cardColor: _card,
                    borderColor: _border,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _StatCard(
              label: 'COD eligibility',
              value: (cod?.canAcceptCod ?? false) ? 'Eligible' : 'Capped',
              color: (cod?.canAcceptCod ?? false) ? _green : _red,
              cardColor: _card,
              borderColor: _border,
              subtitle: cod == null
                  ? null
                  : '${cod.pendingCashLabel} held of the ${cod.capLabel} cap',
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: FilledButton.icon(
                onPressed: _openRechargeSheet,
                style: FilledButton.styleFrom(
                  backgroundColor: _green,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                icon: const Icon(Icons.add_rounded, size: 18),
                label: const Text('Top up wallet', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton.icon(
                onPressed: _openCashDepositSheet,
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: _border),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                icon: const Icon(Icons.point_of_sale_rounded, size: 18),
                label: const Text('Submit COD cash', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Deliveries deduct a flat Rs. 10 from the wallet. Cash on Delivery '
              'orders add the order total to cash owed, which must be submitted.',
              style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8), height: 1.5),
            ),
            const SizedBox(height: 8),
            Text(
              'Minimum wallet to go online: ${formatPkr(AppConstants.riderMinWalletBalance)}',
              style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.color,
    required this.cardColor,
    required this.borderColor,
    this.subtitle,
  });

  final String label;
  final String value;
  final Color color;
  final Color cardColor;
  final Color borderColor;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF94A3B8)),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: color),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 2),
            Text(
              subtitle!,
              style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
            ),
          ],
        ],
      ),
    );
  }
}

/// Bottom sheet collecting a recharge amount + method.
class _RechargeSheet extends StatefulWidget {
  const _RechargeSheet();

  @override
  State<_RechargeSheet> createState() => _RechargeSheetState();
}

class _RechargeSheetState extends State<_RechargeSheet> {
  /// Mirrors the backend's `VALID_RECHARGE_METHODS`.
  static const Map<String, String> _methods = {
    'bank_transfer': 'Bank transfer',
    'jazzcash': 'JazzCash',
    'easypaisa': 'EasyPaisa',
    'card': 'Card',
  };

  final _amountController = TextEditingController(text: '500');
  String _method = 'bank_transfer';

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + bottomInset),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Top up wallet',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _amountController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            style: const TextStyle(color: Colors.white),
            decoration: const InputDecoration(
              labelText: 'Amount (PKR)',
              labelStyle: TextStyle(color: Color(0xFF94A3B8)),
              enabledBorder: OutlineInputBorder(borderSide: BorderSide(color: Color(0xFF334155))),
              focusedBorder: OutlineInputBorder(borderSide: BorderSide(color: Color(0xFF10B981))),
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _methods.entries
                .map(
                  (entry) => ChoiceChip(
                    label: Text(entry.value),
                    selected: _method == entry.key,
                    onSelected: (_) => setState(() => _method = entry.key),
                    labelStyle: const TextStyle(color: Colors.white),
                    selectedColor: const Color(0xFF065F46),
                    backgroundColor: const Color(0xFF0F172A),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 50,
            child: FilledButton(
              onPressed: () {
                final amount = double.tryParse(_amountController.text.trim());
                if (amount == null || amount <= 0) return;
                Navigator.of(context).pop((amount, _method));
              },
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: const Text('Confirm top up', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
        ],
      ),
    );
  }
}

/// Bottom sheet collecting a COD cash deposit amount + method.
class _CashDepositSheet extends StatefulWidget {
  const _CashDepositSheet({required this.suggestedAmount});

  final double suggestedAmount;

  @override
  State<_CashDepositSheet> createState() => _CashDepositSheetState();
}

class _CashDepositSheetState extends State<_CashDepositSheet> {
  /// Mirrors the backend's `VALID_DEPOSIT_METHODS`.
  static const Map<String, String> _methods = {
    'bank_transfer': 'Bank transfer',
    'mobile_wallet': 'Mobile wallet',
    'hub': 'Hub drop-off',
  };

  late final TextEditingController _amountController;
  String _method = 'bank_transfer';

  @override
  void initState() {
    super.initState();
    _amountController = TextEditingController(
      text: widget.suggestedAmount > 0 ? widget.suggestedAmount.toStringAsFixed(0) : '',
    );
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + bottomInset),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Submit COD cash',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          const SizedBox(height: 6),
          Text(
            'Cash owed: ${formatPkr(widget.suggestedAmount)}',
            style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _amountController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            style: const TextStyle(color: Colors.white),
            decoration: const InputDecoration(
              labelText: 'Amount submitted (PKR)',
              labelStyle: TextStyle(color: Color(0xFF94A3B8)),
              enabledBorder: OutlineInputBorder(borderSide: BorderSide(color: Color(0xFF334155))),
              focusedBorder: OutlineInputBorder(borderSide: BorderSide(color: Color(0xFF10B981))),
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _methods.entries
                .map(
                  (entry) => ChoiceChip(
                    label: Text(entry.value),
                    selected: _method == entry.key,
                    onSelected: (_) => setState(() => _method = entry.key),
                    labelStyle: const TextStyle(color: Colors.white),
                    selectedColor: const Color(0xFF065F46),
                    backgroundColor: const Color(0xFF0F172A),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 50,
            child: FilledButton(
              onPressed: () {
                final amount = double.tryParse(_amountController.text.trim());
                if (amount == null || amount <= 0) return;
                Navigator.of(context).pop((amount, _method));
              },
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: const Text('Submit deposit', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
        ],
      ),
    );
  }
}
