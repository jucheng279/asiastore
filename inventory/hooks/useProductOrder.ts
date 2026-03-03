interface Orderable {
  id: string;
  order: number;
}

export function reorderProducts<T extends Orderable>(
  products: T[],
  productId: string,
  newOrder: number
): T[] {
  const productsCopy = products.map(p => ({ ...p }));
  const movingProduct = productsCopy.find(p => p.id === productId);

  if (!movingProduct) return products;

  const oldOrder = movingProduct.order;

  if (oldOrder === newOrder) return products;

  productsCopy.forEach(p => {
    if (p.id !== productId && p.order > oldOrder) {
      p.order = p.order - 1;
    }
  });

  const hasDuplicate = productsCopy.some(
    p => p.id !== productId && p.order === newOrder
  );

  if (hasDuplicate) {
    productsCopy.forEach(p => {
      if (p.id !== productId && p.order >= newOrder) {
        p.order = p.order + 1;
      }
    });
  }

  movingProduct.order = newOrder;

  return productsCopy.sort((a, b) => a.order - b.order);
}

export function getNextOrder<T extends Orderable>(products: T[]): number {
  if (products.length === 0) return 1;
  return Math.max(...products.map(p => p.order)) + 1;
}
