import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:speedy_meals/data/models/rider_models.dart';
import 'package:speedy_meals/data/repositories/rider_repository.dart';
import 'package:speedy_meals/features/maps/maps.dart';
import 'package:speedy_meals/screens/rider/rider_dashboard_screen.dart';

/// Counts profile fetches so the test can see when the dashboard refetches.
class _CountingRepository extends RiderRepository {
  int profileCalls = 0;
  RiderProfile current = const RiderProfile(
    id: 'r_001',
    name: 'Test Rider',
    phoneNumber: '03001234567',
    approvalStatus: 'pending',
    isOnline: false,
  );

  @override
  Future<RiderProfile> profile() async {
    profileCalls++;
    return current;
  }

  @override
  Future<RiderAssignments> assignments() async => const RiderAssignments(active: []);

  @override
  Future<RiderWallet> earnings() async =>
      const RiderWallet(walletBalance: 0, earningsBalance: 0);
}

void main() {
  late _CountingRepository repo;
  late StreamController<Map<String, String>> pushes;
  late RiderLocationService locationService;

  setUp(() {
    repo = _CountingRepository();
    pushes = StreamController<Map<String, String>>.broadcast();
    locationService = RiderLocationService(
      isLocationServiceEnabledFn: () async => true,
      checkPermissionFn: () async => LocationPermission.whileInUse,
      getPositionStreamFn: ({LocationSettings? locationSettings}) => const Stream.empty(),
    );
  });

  tearDown(() => pushes.close());

  Future<void> pumpDashboard(WidgetTester tester, {Duration? refreshInterval}) async {
    await tester.pumpWidget(MaterialApp(
      home: RiderDashboardScreen(
        repository: repo,
        locationService: locationService,
        pushEvents: pushes.stream,
        refreshInterval: refreshInterval,
      ),
    ));
    await tester.pump();
  }

  testWidgets('an admin change pushed to the rider refetches the profile', (tester) async {
    await pumpDashboard(tester);
    expect(repo.profileCalls, 1);

    repo.current = const RiderProfile(
      id: 'r_001',
      name: 'Test Rider',
      phoneNumber: '03001234567',
      approvalStatus: 'approved',
      isOnline: false,
    );
    pushes.add({'type': 'rider_account', 'change': 'approval'});
    await tester.pump();

    expect(repo.profileCalls, 2);
  });

  testWidgets('unrelated pushes do not refetch', (tester) async {
    await pumpDashboard(tester);
    pushes.add({'type': 'order_status', 'order_id': 'o1'});
    await tester.pump();

    expect(repo.profileCalls, 1);
  });

  testWidgets('falls back to polling when push is unavailable', (tester) async {
    await pumpDashboard(tester, refreshInterval: const Duration(seconds: 30));
    expect(repo.profileCalls, 1);

    await tester.pump(const Duration(seconds: 31));
    expect(repo.profileCalls, 2);

    // Unmount so the periodic timer is cancelled before the test ends.
    await tester.pumpWidget(const SizedBox());
  });
}
