// Shared utility functions
export function formatCurrency(amount, currency = 'MYR') {
    return new Intl.NumberFormat('en-MY', {
        style: 'currency',
        currency,
    }).format(amount);
}
export function formatDate(date) {
    return new Date(date).toLocaleDateString('en-MY');
}
export function generateId() {
    return crypto.randomUUID();
}
