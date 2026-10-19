/**
 * Order status helpers shared by the restaurant and admin portals.
 *
 * The backend places every order directly in "Accepted" (there is no "Placed"
 * status) and the restaurant then moves it Accepted -> Preparing -> Ready for
 * Pickup. "Placed" is kept only so offline fixtures keep working. A "new" order
 * is one the kitchen has not started yet.
 */
export const NEW_ORDER_STATUSES = ['Placed', 'Accepted'] as const;

export function isNewOrder(status: string): boolean {
  return (NEW_ORDER_STATUSES as readonly string[]).includes(status);
}

/** Orders the kitchen is working on. */
export function isInKitchen(status: string): boolean {
  return status === 'Preparing';
}
