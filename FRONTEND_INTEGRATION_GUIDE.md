# Frontend Integration Guide: Unified Order Creation with Payment

## Overview

The `/orders` endpoint now provides a unified flow that:
1. Creates the order with all cart items
2. Automatically initializes payment with the specified gateway
3. Returns both order details and payment authorization URL in one response

This eliminates the need for separate order and payment initialization calls.

---

## API Endpoint

**POST** `/orders`

**Authentication**: Required (Bearer token in Authorization header)

---

## Request Body

```json
{
  "items": [
    {
      "productId": "507f1f77bcf86cd799439011",
      "quantity": 2,
      "selectedSize": "M",
      "itemNotes": "Please gift wrap this"
    },
    {
      "productId": "507f1f77bcf86cd799439012",
      "quantity": 1,
      "selectedSize": "42"
    }
  ],
  "shippingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+234812345678",
    "address": "123 Main Street, Suite 100",
    "city": "Lagos",
    "state": "Lagos",
    "country": "Nigeria",
    "postalCode": "100001"
  },
  "shippingMethod": "express",
  "buyerNotes": "Please delivery between 9am-5pm",
  "couponCode": "SAVE10",
  "paymentMethod": "paystack",
  "paymentNote": "Paying with card"
}
```

### Field Details

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `items` | Array | ✓ | Array of cart items with quantities |
| `items[].productId` | String | ✓ | MongoDB ObjectId of the product |
| `items[].quantity` | Number | ✓ | Quantity (minimum 1) |
| `items[].selectedSize` | String | Optional | Size/variant if applicable |
| `items[].itemNotes` | String | Optional | Special instructions for this item |
| `shippingAddress` | Object | ✓ | Shipping address details |
| `shippingAddress.firstName` | String | ✓ | First name (minimum 2 chars) |
| `shippingAddress.lastName` | String | ✓ | Last name (minimum 2 chars) |
| `shippingAddress.email` | String | ✓ | Valid email address |
| `shippingAddress.phone` | String | ✓ | Phone number (minimum 10 chars) |
| `shippingAddress.address` | String | ✓ | Street address (minimum 5 chars) |
| `shippingAddress.city` | String | ✓ | City (minimum 2 chars) |
| `shippingAddress.state` | String | ✓ | State/Region (minimum 2 chars) |
| `shippingAddress.country` | String | ✓ | Country (minimum 2 chars) |
| `shippingAddress.postalCode` | String | Optional | Postal code |
| `shippingMethod` | String | Optional | Shipping method (e.g., "standard", "express") |
| `buyerNotes` | String | Optional | General notes for the order (max 500 chars) |
| `couponCode` | String | Optional | Discount coupon code |
| `paymentMethod` | String | Optional | Payment gateway: `"paystack"`, `"flutterwave"`, `"stripe"` (default: `"paystack"`) |
| `paymentNote` | String | Optional | Note for the payment (max 500 chars) |

---

## Response (Success)

### With Payment Initialization
When `paymentMethod` is provided and payment initialization succeeds:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "order": {
      "id": "507f1f77bcf86cd799439013",
      "orderNumber": "ORD1732025150000123",
      "buyerId": "507f1f77bcf86cd799439001",
      "status": "pending",
      "subtotal": 50000,
      "totalShippingCost": 2500,
      "totalServiceFee": 1750,
      "totalTaxes": 4075,
      "totalAmount": 58325,
      "currency": "NGN",
      "itemCount": 3,
      "sellerCount": 2,
      "items": [
        {
          "id": "507f1f77bcf86cd799439014",
          "productId": "507f1f77bcf86cd799439011",
          "sellerId": "507f1f77bcf86cd799439002",
          "productTitle": "Premium Designer Bag",
          "productImage": "https://...",
          "productBrand": "Gucci",
          "productSize": "M",
          "quantity": 2,
          "unitPrice": 25000,
          "totalPrice": 50000,
          "shippingCost": 2500,
          "itemServiceFee": 1750,
          "itemTaxes": 4075,
          "itemTotal": 58325,
          "sellerName": "Fashion Store",
          "sellerEmail": "store@example.com",
          "itemStatus": "pending",
          "available": true
        }
      ],
      "sellerIds": ["507f1f77bcf86cd799439002", "507f1f77bcf86cd799439003"],
      "sellerPayouts": [
        {
          "sellerId": "507f1f77bcf86cd799439002",
          "sellerName": "Fashion Store",
          "itemCount": 2,
          "revenue": 48250,
          "serviceFee": 1750,
          "paid": false
        }
      ],
      "paymentStatus": "pending",
      "paymentMethod": "card",
      "shippingAddress": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "phone": "+234812345678",
        "address": "123 Main Street, Suite 100",
        "city": "Lagos",
        "state": "Lagos",
        "country": "Nigeria"
      },
      "shippingMethod": "express",
      "buyerNotes": "Please delivery between 9am-5pm",
      "createdAt": "2024-11-19T10:00:00Z",
      "updatedAt": "2024-11-19T10:00:00Z"
    },
    "payment": {
      "reference": "PAY1732025150000456",
      "authorizationUrl": "https://checkout.paystack.com/...",
      "accessCode": "cdc42vf6y1",
      "amount": 58325,
      "currency": "NGN",
      "paymentMethod": "paystack"
    }
  },
  "timestamp": "2024-11-19T10:00:00Z"
}
```

### Without Payment (or payment init fails)
When `paymentMethod` is not provided or payment initialization fails:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "order": { /* order object */ }
  },
  "timestamp": "2024-11-19T10:00:00Z"
}
```

---

## Frontend Implementation Example

### Step 1: Collect Cart & Shipping Data

```javascript
const orderData = {
  items: cartItems.map(item => ({
    productId: item.id,
    quantity: item.qty,
    selectedSize: item.size
  })),
  shippingAddress: {
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    phone: formData.phone,
    address: formData.address,
    city: formData.city,
    state: formData.state,
    country: formData.country,
    postalCode: formData.postal
  },
  shippingMethod: "express",
  buyerNotes: formData.notes,
  paymentMethod: "paystack" // Choose: paystack, flutterwave, stripe
};
```

### Step 2: Create Order with Payment

```javascript
async function createOrderWithPayment(orderData) {
  try {
    const response = await fetch('/api/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.data?.message || 'Order creation failed');
    }

    const { data } = await response.json();
    return data;
  } catch (error) {
    console.error('Order creation error:', error);
    throw error;
  }
}
```

### Step 3: Redirect to Payment

```javascript
async function handleCheckout() {
  try {
    const orderResponse = await createOrderWithPayment(orderData);
    
    // Extract payment info
    const { order, payment } = orderResponse;
    
    if (payment && payment.authorizationUrl) {
      // Store order ID for verification later
      localStorage.setItem('currentOrderId', order.id);
      localStorage.setItem('paymentReference', payment.reference);
      
      // Redirect to PayStack (or other gateway) for payment
      window.location.href = payment.authorizationUrl;
    } else {
      // Order created but no payment
      console.log('Order created:', order.orderNumber);
      navigate(`/order-confirmation/${order.id}`);
    }
  } catch (error) {
    showError('Failed to create order: ' + error.message);
  }
}
```

### Step 4: Handle Payment Callback

After payment completes (or is cancelled), user will be redirected to:
```
{origin}/checkout/callback?reference={PAYMENT_REFERENCE}
```

```javascript
// In callback component
useEffect(() => {
  const reference = new URLSearchParams(window.location.search).get('reference');
  
  if (reference) {
    verifyPayment(reference);
  }
}, []);

async function verifyPayment(reference) {
  try {
    const response = await fetch('/api/v1/payments/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ reference })
    });

    const result = await response.json();
    
    if (result.data.status === 'success') {
      // Payment successful
      const orderId = localStorage.getItem('currentOrderId');
      navigate(`/order-confirmation/${orderId}`);
    } else {
      // Payment failed
      showError('Payment verification failed');
      navigate('/checkout');
    }
  } catch (error) {
    console.error('Payment verification error:', error);
  }
}
```

---

## Webhook Updates

When payment is confirmed (via PayStack webhook), the backend automatically:

1. Updates `order.paymentStatus` to `"completed"`
2. Updates `order.status` to `"confirmed"`
3. Reduces product quantities in inventory
4. Marks products as `sold: true` if quantity reaches 0
5. Creates seller payouts for each item
6. Sends confirmation emails to buyer and sellers

**No frontend action needed** - the webhook is processed server-side.

---

## Error Handling

### Example Error Response

```json
{
  "success": false,
  "message": "Operation failed",
  "data": {
    "error": "Some items are no longer available",
    "unavailableItems": ["507f1f77bcf86cd799439011"]
  },
  "timestamp": "2024-11-19T10:00:00Z"
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid order ID format` | Bad productId | Verify all productIds are valid MongoDB ObjectIds |
| `Product not found` | Product doesn't exist | Refresh cart, product may have been deleted |
| `Some items are no longer available` | Out of stock | Update cart with available quantities |
| `You cannot buy your own product` | Trying to buy own product | Remove from cart |
| `Invalid seller ID format` | Bad sellerId | Backend error, contact support |

---

## Standard Request/Response Flow

### Complete Happy Path

1. **Frontend** → POST `/orders` with cart + payment details
2. **Backend** → Creates order, initializes Paystack payment
3. **Backend** → Returns `{ order, payment }`
4. **Frontend** → Redirects user to `payment.authorizationUrl`
5. **User** → Completes payment on PayStack
6. **PayStack** → Redirects to `{origin}/checkout/callback?reference=...`
7. **Frontend** → Calls POST `/payments/verify` with reference
8. **Backend** (webhook) → Confirms payment, updates order, reduces inventory
9. **Frontend** → Shows order confirmation

---

## Summary for Frontend

**What to send in request:**
- Cart items (productId, quantity, optional size)
- Shipping address (complete form)
- Payment method (`"paystack"`, `"flutterwave"`, or `"stripe"`)

**What you get back:**
- Full order details (order ID, totals, items, seller info)
- Payment data including `authorizationUrl` for redirect

**What to do with the response:**
- Store order ID for reference
- Redirect user to `authorizationUrl` for payment
- After payment callback, verify with `/payments/verify`
- Show order confirmation

**Webhook handles automatically:**
- Payment confirmation
- Order status updates
- Inventory reduction
- Seller payout creation
- Email notifications
