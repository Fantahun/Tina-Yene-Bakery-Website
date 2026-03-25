export interface OrderItemLineInput {
  quantity: number;
  productName: string;
  sizeName?: string | null;
  serves?: string | null;
}

export interface OrderItemLineParts {
  quantityText: string;
  productText: string;
  sizeText: string | null;
  servesText: string | null;
}

export function getOrderItemLineParts(item: OrderItemLineInput): OrderItemLineParts {
  return {
    quantityText: `${item.quantity}x`,
    productText: item.productName,
    sizeText: item.sizeName?.trim() ? item.sizeName.trim() : null,
    servesText: item.serves?.trim() ? item.serves.trim() : null,
  };
}

export function formatOrderItemPlainLine(item: OrderItemLineInput): string {
  const parts = getOrderItemLineParts(item);
  const productWithSize = parts.sizeText
    ? `${parts.productText} (${parts.sizeText})`
    : parts.productText;
  const servesSuffix = parts.servesText ? ` - Serves ${parts.servesText}` : "";

  return `${parts.quantityText} ${productWithSize}${servesSuffix}`;
}

