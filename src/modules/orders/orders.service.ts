import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CreateOrderDto,
  CalculateOrderDto,
  OrderCalculationResponseDto,
  UpdateOrderStatusDto,
  CancelOrderDto,
  GetOrdersQueryDto,
  OrderResponseDto,
  OrderItemResponseDto,
  PaginatedOrdersResponseDto,
  ProcessSellerPayoutDto,
} from './dto/order.dto';
import { OrderStatus, PaymentStatus } from '@/common/enums/order.enum';
import { Order, OrderDocument } from './entities/order.entity';
import { OrderItem, OrderItemDocument } from './entities/order-item.entity';
import { Product, ProductDocument } from '../products/entities/product.entity';
import { User, UserDocument } from '../users/entities/user.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(OrderItem.name)
    private orderItemModel: Model<OrderItemDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /**
   * Calculate order totals before creation (cart calculation)
   */
  async calculateOrder(
    calculateOrderDto: CalculateOrderDto,
    buyerId: string,
  ): Promise<OrderCalculationResponseDto> {
    try {
      if (!Types.ObjectId.isValid(buyerId)) {
        throw new BadRequestException('Invalid buyer ID format');
      }

      const response: OrderCalculationResponseDto = {
        items: [],
        subtotal: 0,
        totalShippingCost: 0,
        totalServiceFee: 0,
        totalTaxes: 0,
        couponDiscount: 0,
        totalAmount: 0,
        currency: 'NGN',
        itemCount: 0,
        sellerCount: 0,
        unavailableItems: [],
        errors: [],
      };

      const sellerIds = new Set<string>();

      // Process each item
      for (const item of calculateOrderDto.items) {
        if (!Types.ObjectId.isValid(item.productId)) {
          response.errors.push(`Invalid product ID: ${item.productId}`);
          continue;
        }

        const product = (await this.productModel
          .findById(item.productId)
          .populate('sellerId', 'firstName lastName email')
          .lean()) as any;

        if (!product) {
          response.errors.push(`Product not found: ${item.productId}`);
          response.unavailableItems.push(item.productId);
          continue;
        }

        // Check availability
        let available = !product.sold && product.quantity >= item.quantity;
        let availabilityMessage: string | undefined;

        if (product.sold) {
          availabilityMessage = 'Product is no longer available';
        } else if (product.quantity < item.quantity) {
          availabilityMessage = `Only ${product.quantity} items available`;
        } else if (product.sellerId._id.toString() === buyerId) {
          availabilityMessage = 'You cannot buy your own product';
          available = false;
        }

        if (!available) {
          response.unavailableItems.push(item.productId);
        }

        // Calculate item pricing
        const unitPrice = product.sellingPrice;
        const totalPrice = unitPrice * item.quantity;
        const shippingCost = (product.shipping?.domestic || 0) * item.quantity;
        const itemServiceFee = this.calculateServiceFee(totalPrice);
        const itemTaxes = this.calculateTaxes(totalPrice + itemServiceFee);
        const itemTotal =
          totalPrice + shippingCost + itemServiceFee + itemTaxes;

        const itemData = {
          productId: item.productId,
          productTitle: product.title,
          unitPrice,
          quantity: item.quantity,
          totalPrice,
          shippingCost,
          itemServiceFee,
          itemTaxes,
          itemTotal,
          sellerId: product.sellerId._id.toString(),
          sellerName: `${product.sellerId.firstName} ${product.sellerId.lastName}`,
          available,
          availabilityMessage,
        };

        response.items.push(itemData);
        sellerIds.add(product.sellerId._id.toString());

        // Add to totals only if available
        if (available) {
          response.subtotal += totalPrice;
          response.totalShippingCost += shippingCost;
          response.totalServiceFee += itemServiceFee;
          response.totalTaxes += itemTaxes;
          response.itemCount += item.quantity;
        }
      }

      response.sellerCount = sellerIds.size;
      response.totalAmount =
        response.subtotal +
        response.totalShippingCost +
        response.totalServiceFee +
        response.totalTaxes -
        response.couponDiscount;

      return response;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to calculate order: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create a new multi-product order
   */
  async create(
    createOrderDto: CreateOrderDto,
    buyerId: string,
  ): Promise<OrderResponseDto> {
    try {
      if (!Types.ObjectId.isValid(buyerId)) {
        throw new BadRequestException('Invalid buyer ID format');
      }

      // First calculate and validate the order
      const calculation = await this.calculateOrder(
        { items: createOrderDto.items, couponCode: createOrderDto.couponCode },
        buyerId,
      );

      // Check for errors or unavailable items
      if (calculation.errors.length > 0) {
        throw new BadRequestException(
          `Order validation failed: ${calculation.errors.join(', ')}`,
        );
      }

      if (calculation.unavailableItems.length > 0) {
        throw new ConflictException(
          `Some items are no longer available: ${calculation.unavailableItems.join(', ')}`,
        );
      }

      if (calculation.items.length === 0) {
        throw new BadRequestException('No valid items in order');
      }

      // Generate unique order number
      const orderNumber = this.generateOrderNumber();

      // Prepare seller payouts data
      const sellerPayouts = this.preparellerPayouts(calculation.items);

      // Create the main order
      const order = new this.orderModel({
        orderNumber,
        buyerId: new Types.ObjectId(buyerId),
        status: OrderStatus.PENDING,

        // Order totals
        subtotal: calculation.subtotal,
        totalShippingCost: calculation.totalShippingCost,
        totalServiceFee: calculation.totalServiceFee,
        totalTaxes: calculation.totalTaxes,
        totalAmount: calculation.totalAmount,
        currency: calculation.currency,
        itemCount: calculation.itemCount,
        sellerCount: calculation.sellerCount,

        // Seller information
        sellerIds: Array.from(
          new Set(
            calculation.items.map((item) => new Types.ObjectId(item.sellerId)),
          ),
        ),
        sellerPayouts,

        // Payment
        paymentStatus: PaymentStatus.PENDING,

        // Shipping
        shippingAddress: createOrderDto.shippingAddress,
        shippingMethod: createOrderDto.shippingMethod,

        // Notes
        buyerNotes: createOrderDto.buyerNotes,

        // Status history
        statusHistory: [`Order created - ${new Date().toISOString()}`],
      });

      const savedOrder = await order.save();

      // Create order items
      const orderItems = await this.createOrderItems(
        savedOrder._id as Types.ObjectId,
        calculation.items,
        createOrderDto.items,
      );

      // Return complete order with items
      return this.mapOrderToResponseDto(savedOrder.toObject(), orderItems);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get all orders with filters and pagination
   */
  async findAll(
    queryDto: GetOrdersQueryDto,
    userId?: string,
    userRole?: string,
  ): Promise<PaginatedOrdersResponseDto> {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        search,
        sortBy = 'newest',
      } = queryDto;
      const skip = (page - 1) * limit;

      const query: any = {};

      // Role-based filtering
      if (userRole !== 'admin') {
        if (userId) {
          query.$or = [
            { buyerId: new Types.ObjectId(userId) },
            { sellerId: new Types.ObjectId(userId) },
          ];
        }
      }

      // Status filter
      if (status) {
        query.status = status;
      }

      // Search filter
      if (search) {
        query.$or = [
          { orderNumber: { $regex: search, $options: 'i' } },
          { productTitle: { $regex: search, $options: 'i' } },
          { productBrand: { $regex: search, $options: 'i' } },
        ];
      }

      // Build sort
      const sortOptions: any = {};
      switch (sortBy) {
        case 'amount-high':
          sortOptions.totalAmount = -1;
          break;
        case 'amount-low':
          sortOptions.totalAmount = 1;
          break;
        case 'oldest':
          sortOptions.createdAt = 1;
          break;
        case 'newest':
        default:
          sortOptions.createdAt = -1;
          break;
      }

      // Execute query
      const [orders, total] = await Promise.all([
        this.orderModel
          .find(query)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .populate('buyerId', 'firstName lastName email')
          .populate('sellerId', 'firstName lastName email')
          .populate('productId', 'title images slug')
          .lean()
          .exec(),
        this.orderModel.countDocuments(query),
      ]);

      const pages = Math.ceil(total / limit);

      return {
        data: orders.map((order) => this.mapOrderToResponseDto(order)),
        total,
        page,
        limit,
        pages,
        hasMore: page < pages,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to fetch orders: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get single order by ID with all items
   */
  async findById(
    orderId: string,
    userId?: string,
    userRole?: string,
  ): Promise<OrderResponseDto> {
    try {
      if (!Types.ObjectId.isValid(orderId)) {
        throw new BadRequestException('Invalid order ID format');
      }

      const [order, orderItems] = await Promise.all([
        this.orderModel
          .findById(orderId)
          .populate('buyerId', 'firstName lastName email')
          .populate('sellerIds', 'firstName lastName email')
          .lean()
          .exec(),
        this.orderItemModel
          .find({ orderId: new Types.ObjectId(orderId) })
          .lean()
          .exec(),
      ]);

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Check access permissions
      if (userRole !== 'admin' && userId) {
        const canAccess =
          order.buyerId._id?.toString() === userId ||
          order.sellerIds.some(
            (seller: any) => seller._id?.toString() === userId,
          );

        if (!canAccess) {
          throw new ForbiddenException(
            'You do not have permission to view this order',
          );
        }
      }

      return this.mapOrderToResponseDto(order, orderItems);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to fetch order: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update order status
   */
  async updateStatus(
    orderId: string,
    updateStatusDto: UpdateOrderStatusDto,
    userId: string,
    userRole: string,
  ): Promise<OrderResponseDto> {
    try {
      if (!Types.ObjectId.isValid(orderId)) {
        throw new BadRequestException('Invalid order ID format');
      }

      const order = await this.orderModel.findById(orderId);
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Check permissions
      const canUpdate = this.canUpdateOrderStatus(
        order,
        userId,
        userRole,
        updateStatusDto.status,
      );
      if (!canUpdate) {
        throw new ForbiddenException(
          'You do not have permission to update this order status',
        );
      }

      // Validate status transition
      this.validateStatusTransition(order.status, updateStatusDto.status);

      // Update order
      const now = new Date();
      order.status = updateStatusDto.status;

      // Set timestamp based on status
      switch (updateStatusDto.status) {
        case OrderStatus.CONFIRMED:
          order.confirmedAt = now;
          break;
        case OrderStatus.PROCESSING:
          order.processingAt = now;
          break;
        case OrderStatus.SHIPPED:
          order.shippedAt = now;
          if (updateStatusDto.trackingNumber) {
            order.trackingNumber = updateStatusDto.trackingNumber;
          }
          if (updateStatusDto.carrierName) {
            order.carrierName = updateStatusDto.carrierName;
          }
          break;
        case OrderStatus.DELIVERED:
          order.deliveredAt = now;
          break;
        case OrderStatus.CANCELLED:
          order.cancelledAt = now;
          order.cancellationReason = updateStatusDto.reason;
          order.cancelledBy = new Types.ObjectId(userId);
          // Restore product quantities for all items
          await this.restoreProductQuantity(order._id as Types.ObjectId);
          // Update all order items to cancelled
          await this.orderItemModel.updateMany(
            { orderId: order._id },
            {
              $set: {
                itemStatus: 'cancelled',
                cancelledAt: now,
                cancellationReason: updateStatusDto.reason,
              },
            },
          );
          break;
      }

      if (updateStatusDto.adminNotes && userRole === 'admin') {
        order.adminNotes = updateStatusDto.adminNotes;
      }

      // Update status history
      if (!order.statusHistory) {
        order.statusHistory = [];
      }
      order.statusHistory.push(
        `Status changed to ${updateStatusDto.status} - ${now.toISOString()}${updateStatusDto.reason ? ` - ${updateStatusDto.reason}` : ''}`,
      );

      const updatedOrder = await order.save();
      return this.mapOrderToResponseDto(updatedOrder.toObject());
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update order status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(
    orderId: string,
    cancelDto: CancelOrderDto,
    userId: string,
  ): Promise<OrderResponseDto> {
    try {
      if (!Types.ObjectId.isValid(orderId)) {
        throw new BadRequestException('Invalid order ID format');
      }

      const order = await this.orderModel.findById(orderId);
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Check if user can cancel
      const isBuyer = order.buyerId.toString() === userId;
      const isSeller = order.sellerIds?.some(
        (sellerId: any) => sellerId.toString() === userId,
      );

      if (!isBuyer && !isSeller) {
        throw new ForbiddenException(
          'You do not have permission to cancel this order',
        );
      }

      // Check if order can be cancelled
      if (
        [
          OrderStatus.DELIVERED,
          OrderStatus.CANCELLED,
          OrderStatus.REFUNDED,
        ].includes(order.status)
      ) {
        throw new BadRequestException(
          'Order cannot be cancelled in current status',
        );
      }

      // Update to cancelled status
      const updateStatusDto: UpdateOrderStatusDto = {
        status: OrderStatus.CANCELLED,
        reason: cancelDto.reason,
      };

      return this.updateStatus(orderId, updateStatusDto, userId, 'user');
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to cancel order: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Confirm order payment and update products
   */
  async confirmPayment(orderId: string, paymentData: any): Promise<void> {
    try {
      const order = await this.orderModel.findById(orderId);
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Get all order items
      const orderItems = await this.orderItemModel.find({
        orderId: new Types.ObjectId(orderId),
      });

      // Update payment status
      order.paymentStatus = PaymentStatus.COMPLETED;
      order.paidAt = new Date();
      order.paymentReference = paymentData.reference;
      order.paymentMethod = paymentData.method;
      order.paymentGateway = paymentData.gateway;

      // Update order status to confirmed
      if (order.status === OrderStatus.PENDING) {
        order.status = OrderStatus.CONFIRMED;
        order.confirmedAt = new Date();
      }

      // Update status history
      if (!order.statusHistory) {
        order.statusHistory = [];
      }
      order.statusHistory.push(
        `Payment confirmed - ${new Date().toISOString()}`,
      );

      await order.save();

      // Update all order items status
      await this.orderItemModel.updateMany(
        { orderId: new Types.ObjectId(orderId) },
        { $set: { itemStatus: 'confirmed' } },
      );

      // Update product quantities for each item
      for (const item of orderItems) {
        await this.updateProductAfterPayment(item.productId, item.quantity);
      }
    } catch (error) {
      console.error('Failed to confirm payment:', error);
      throw new BadRequestException(
        `Failed to confirm payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get user's orders (buyer or seller)
   */
  async getUserOrders(
    userId: string,
    queryDto: GetOrdersQueryDto,
    role: 'buyer' | 'seller' | 'all' = 'all',
  ): Promise<PaginatedOrdersResponseDto> {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        search,
        sortBy = 'newest',
      } = queryDto;
      const skip = (page - 1) * limit;

      const query: any = {};

      // Role-based filtering
      if (role === 'buyer') {
        query.buyerId = new Types.ObjectId(userId);
      } else if (role === 'seller') {
        query.sellerId = new Types.ObjectId(userId);
      } else {
        query.$or = [
          { buyerId: new Types.ObjectId(userId) },
          { sellerId: new Types.ObjectId(userId) },
        ];
      }

      // Apply other filters
      if (status) query.status = status;
      if (search) {
        query.$and = [
          query.$or ? { $or: query.$or } : {},
          {
            $or: [
              { orderNumber: { $regex: search, $options: 'i' } },
              { productTitle: { $regex: search, $options: 'i' } },
            ],
          },
        ];
        delete query.$or;
      }

      const sortOptions: any = {};
      switch (sortBy) {
        case 'amount-high':
          sortOptions.totalAmount = -1;
          break;
        case 'amount-low':
          sortOptions.totalAmount = 1;
          break;
        case 'oldest':
          sortOptions.createdAt = 1;
          break;
        case 'newest':
        default:
          sortOptions.createdAt = -1;
          break;
      }

      const [orders, total] = await Promise.all([
        this.orderModel
          .find(query)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .populate('buyerId', 'firstName lastName email')
          .populate('sellerId', 'firstName lastName email')
          .lean()
          .exec(),
        this.orderModel.countDocuments(query),
      ]);

      const pages = Math.ceil(total / limit);

      return {
        data: orders.map((order) => this.mapOrderToResponseDto(order)),
        total,
        page,
        limit,
        pages,
        hasMore: page < pages,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to fetch user orders: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create order items for multi-product order
   */
  private async createOrderItems(
    orderId: Types.ObjectId,
    calculatedItems: any[],
    originalItems: any[],
  ): Promise<OrderItemDocument[]> {
    const orderItems: any[] = [];

    for (let i = 0; i < calculatedItems.length; i++) {
      const calcItem = calculatedItems[i];
      const originalItem = originalItems.find(
        (item) => item.productId === calcItem.productId,
      );

      // Get full product and seller info
      const [product, seller] = await Promise.all([
        this.productModel.findById(calcItem.productId).lean(),
        this.userModel.findById(calcItem.sellerId).lean(),
      ]);

      if (!product || !seller) continue;

      const orderItem = {
        orderId,
        productId: new Types.ObjectId(calcItem.productId),
        sellerId: new Types.ObjectId(calcItem.sellerId),

        // Product snapshot
        productTitle: product.title,
        productImage: product.images[0],
        productBrand: product.brand,
        productSize: originalItem?.selectedSize || product.size,
        productCondition: product.condition,
        productCategory: product.category,
        productSubcategory: product.subCategory,

        // Quantity and pricing
        quantity: calcItem.quantity,
        unitPrice: calcItem.unitPrice,
        totalPrice: calcItem.totalPrice,
        shippingCost: calcItem.shippingCost,
        itemServiceFee: calcItem.itemServiceFee,
        itemTaxes: calcItem.itemTaxes,
        itemTotal: calcItem.itemTotal,

        // Seller info
        sellerName: calcItem.sellerName,
        sellerEmail: (seller as any).email,
        sellerPhone: (seller as any).phone,
        sellerRevenue: calcItem.totalPrice - calcItem.itemServiceFee, // Seller gets price minus platform fee

        // Status
        itemStatus: 'pending',
        available: calcItem.available,
        availabilityMessage: calcItem.availabilityMessage,
      };

      orderItems.push(orderItem);
    }

    return (await this.orderItemModel.insertMany(orderItems)) as any;
  }

  /**
   * Prepare seller payout data
   */
  private preparellerPayouts(items: any[]): any[] {
    const sellerMap = new Map();

    items.forEach((item) => {
      const sellerId = item.sellerId;
      if (!sellerMap.has(sellerId)) {
        sellerMap.set(sellerId, {
          sellerId: new Types.ObjectId(sellerId),
          sellerName: item.sellerName,
          itemCount: 0,
          revenue: 0,
          serviceFee: 0,
          paid: false,
        });
      }

      const payout = sellerMap.get(sellerId);
      payout.itemCount += item.quantity;
      payout.revenue += item.totalPrice - item.itemServiceFee;
      payout.serviceFee += item.itemServiceFee;
    });

    return Array.from(sellerMap.values());
  }

  /**
   * Process seller payout
   */
  async processSellerPayout(
    orderId: string,
    payoutDto: ProcessSellerPayoutDto,
  ): Promise<void> {
    try {
      const order = await this.orderModel.findById(orderId);
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Find and update seller payout
      const sellerPayoutIndex = order.sellerPayouts.findIndex(
        (payout) => payout.sellerId.toString() === payoutDto.sellerId,
      );

      if (sellerPayoutIndex === -1) {
        throw new NotFoundException('Seller not found in this order');
      }

      order.sellerPayouts[sellerPayoutIndex].paid = true;
      order.sellerPayouts[sellerPayoutIndex].payoutReference =
        payoutDto.payoutReference;
      order.sellerPayouts[sellerPayoutIndex].paidAt = new Date();

      // Update order items for this seller
      await this.orderItemModel.updateMany(
        {
          orderId: new Types.ObjectId(orderId),
          sellerId: new Types.ObjectId(payoutDto.sellerId),
        },
        {
          $set: {
            sellerPaid: true,
            sellerPayoutReference: payoutDto.payoutReference,
            sellerPaidAt: new Date(),
          },
        },
      );

      await order.save();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to process seller payout: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Private helper methods
   */
  private generateOrderNumber(): string {
    const prefix = 'ORD';
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}${timestamp}${random}`;
  }

  private calculateServiceFee(amount: number): number {
    // 3.5% service fee
    return Math.round(amount * 0.035);
  }

  private calculateTaxes(amount: number): number {
    // 7.5% VAT
    return Math.round(amount * 0.075);
  }

  private canUpdateOrderStatus(
    order: any,
    userId: string,
    userRole: string,
    newStatus: OrderStatus,
  ): boolean {
    if (userRole === 'admin') return true;

    const isBuyer = order.buyerId.toString() === userId;
    const isSeller = order.sellerId.toString() === userId;

    // Buyers can only cancel
    if (isBuyer && newStatus === OrderStatus.CANCELLED) return true;

    // Sellers can confirm, process, and ship
    if (
      isSeller &&
      [
        OrderStatus.CONFIRMED,
        OrderStatus.PROCESSING,
        OrderStatus.SHIPPED,
      ].includes(newStatus)
    ) {
      return true;
    }

    return false;
  }

  private validateStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
  ): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDED]: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  private async updateProductAfterPayment(
    productId: Types.ObjectId,
    quantity: number,
  ): Promise<void> {
    try {
      const product = await this.productModel.findById(productId);
      if (!product) return;

      const newQuantity = product.quantity - quantity;
      const updateData: any = {
        $inc: { quantity: -quantity },
      };

      // Mark as sold if quantity reaches 0
      if (newQuantity <= 0) {
        updateData.$set = {
          sold: true,
          soldAt: new Date(),
          quantity: 0,
        };
        delete updateData.$inc;
      }

      await this.productModel.findByIdAndUpdate(productId, updateData);
    } catch (error) {
      console.error('Failed to update product after payment:', error);
    }
  }

  private async restoreProductQuantity(orderId: Types.ObjectId): Promise<void> {
    try {
      // Get all order items to restore quantities
      const orderItems = await this.orderItemModel.find({ orderId });

      for (const item of orderItems) {
        const product = await this.productModel.findById(item.productId);
        if (!product) continue;

        await this.productModel.findByIdAndUpdate(item.productId, {
          $inc: { quantity: item.quantity },
          $set: { sold: false },
          $unset: { soldAt: 1 },
        });
      }
    } catch (error) {
      console.error('Failed to restore product quantity:', error);
    }
  }

  private mapOrderToResponseDto(
    order: any,
    orderItems?: any[],
  ): OrderResponseDto {
    const items: OrderItemResponseDto[] = orderItems
      ? orderItems.map((item) => ({
          id: item._id?.toString() || item.id,
          productId: item.productId?.toString(),
          sellerId: item.sellerId?.toString(),

          productTitle: item.productTitle,
          productImage: item.productImage,
          productBrand: item.productBrand,
          productSize: item.productSize,
          productCondition: item.productCondition,
          productCategory: item.productCategory,

          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          shippingCost: item.shippingCost,
          itemServiceFee: item.itemServiceFee,
          itemTaxes: item.itemTaxes,
          itemTotal: item.itemTotal,

          sellerName: item.sellerName,
          sellerEmail: item.sellerEmail,
          sellerRevenue: item.sellerRevenue,
          sellerPaid: item.sellerPaid,

          itemStatus: item.itemStatus,
          trackingNumber: item.trackingNumber,
          carrierName: item.carrierName,
          shippedAt: item.shippedAt,
          deliveredAt: item.deliveredAt,

          buyerRating: item.buyerRating,
          buyerReview: item.buyerReview,

          available: item.available,
          availabilityMessage: item.availabilityMessage,
        }))
      : [];

    return {
      id: order._id?.toString() || order.id,
      orderNumber: order.orderNumber,
      buyerId: order.buyerId?._id?.toString() || order.buyerId?.toString(),
      status: order.status,

      subtotal: order.subtotal,
      totalShippingCost: order.totalShippingCost,
      totalServiceFee: order.totalServiceFee,
      totalTaxes: order.totalTaxes,
      totalAmount: order.totalAmount,
      currency: order.currency,
      itemCount: order.itemCount,
      sellerCount: order.sellerCount,

      items,

      sellerIds:
        order.sellerIds?.map(
          (id: any) => id._id?.toString() || id.toString(),
        ) || [],
      sellerPayouts:
        order.sellerPayouts?.map((payout: any) => ({
          sellerId:
            payout.sellerId?._id?.toString() || payout.sellerId?.toString(),
          sellerName: payout.sellerName,
          itemCount: payout.itemCount,
          revenue: payout.revenue,
          serviceFee: payout.serviceFee,
          paid: payout.paid,
          payoutReference: payout.payoutReference,
          paidAt: payout.paidAt,
        })) || [],

      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      paymentReference: order.paymentReference,
      paidAt: order.paidAt,

      shippingAddress: order.shippingAddress,
      shippingMethod: order.shippingMethod,
      estimatedDelivery: order.estimatedDelivery,

      confirmedAt: order.confirmedAt,
      processingAt: order.processingAt,
      cancelledAt: order.cancelledAt,
      cancellationReason: order.cancellationReason,

      buyerRating: order.buyerRating,
      buyerReview: order.buyerReview,

      disputed: order.disputed,
      disputeReason: order.disputeReason,

      buyerNotes: order.buyerNotes,
      adminNotes: order.adminNotes,

      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
