import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  CalculateOrderDto,
  OrderCalculationResponseDto,
  UpdateOrderStatusDto,
  CancelOrderDto,
  ReviewOrderDto,
  CreateDisputeDto,
  GetOrdersQueryDto,
  OrderResponseDto,
  PaginatedOrdersResponseDto,
  ProcessSellerPayoutDto,
} from './dto/order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums';

/**
 * Orders Controller
 * Handles all order-related HTTP requests
 */
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Calculate order totals (cart calculation)
   * POST /orders/calculate
   */
  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  async calculateOrder(
    @Body() calculateOrderDto: CalculateOrderDto,
    @Request() req,
  ): Promise<OrderCalculationResponseDto> {
    const buyerId = req.user.sub;
    return this.ordersService.calculateOrder(calculateOrderDto, buyerId);
  }

  /**
   * Create a new order
   * POST /orders
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @Request() req,
  ): Promise<OrderResponseDto> {
    const buyerId = req.user.sub;
    return this.ordersService.create(createOrderDto, buyerId);
  }

  /**
   * Get all orders (admin) or user's orders
   * GET /orders
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() queryDto: GetOrdersQueryDto,
    @Request() req,
  ): Promise<PaginatedOrdersResponseDto> {
    const userId = req.user.sub;
    const userRole = req.user.role;
    return this.ordersService.findAll(queryDto, userId, userRole);
  }

  /**
   * Get my orders as buyer
   * GET /orders/my/purchases
   */
  @Get('my/purchases')
  @HttpCode(HttpStatus.OK)
  async getMyPurchases(
    @Query() queryDto: GetOrdersQueryDto,
    @Request() req,
  ): Promise<PaginatedOrdersResponseDto> {
    const userId = req.user.sub;
    return this.ordersService.getUserOrders(userId, queryDto, 'buyer');
  }

  /**
   * Get my orders as seller
   * GET /orders/my/sales
   */
  @Get('my/sales')
  @HttpCode(HttpStatus.OK)
  async getMySales(
    @Query() queryDto: GetOrdersQueryDto,
    @Request() req,
  ): Promise<PaginatedOrdersResponseDto> {
    const userId = req.user.sub;
    return this.ordersService.getUserOrders(userId, queryDto, 'seller');
  }

  /**
   * Get order by ID
   * GET /orders/:id
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(
    @Param('id') orderId: string,
    @Request() req,
  ): Promise<OrderResponseDto> {
    if (!orderId || orderId.trim().length === 0) {
      throw new BadRequestException('Order ID parameter is required');
    }

    const userId = req.user.sub;
    const userRole = req.user.role;
    return this.ordersService.findById(orderId, userId, userRole);
  }

  /**
   * Update order status
   * PATCH /orders/:id/status
   * Sellers can confirm, process, ship. Admins can do anything.
   */
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') orderId: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
    @Request() req,
  ): Promise<OrderResponseDto> {
    if (!orderId || orderId.trim().length === 0) {
      throw new BadRequestException('Order ID parameter is required');
    }

    const userId = req.user.sub;
    const userRole = req.user.role;
    return this.ordersService.updateStatus(
      orderId,
      updateStatusDto,
      userId,
      userRole,
    );
  }

  /**
   * Cancel order
   * POST /orders/:id/cancel
   * Buyers and sellers can cancel under certain conditions
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelOrder(
    @Param('id') orderId: string,
    @Body() cancelDto: CancelOrderDto,
    @Request() req,
  ): Promise<OrderResponseDto> {
    if (!orderId || orderId.trim().length === 0) {
      throw new BadRequestException('Order ID parameter is required');
    }

    const userId = req.user.sub;
    return this.ordersService.cancelOrder(orderId, cancelDto, userId);
  }

  /**
   * Review order (rate and review)
   * POST /orders/:id/review
   * Only for delivered orders
   */
  @Post(':id/review')
  @HttpCode(HttpStatus.OK)
  async reviewOrder(
    @Param('id') orderId: string,
    @Body() reviewDto: ReviewOrderDto,
    @Request() req,
  ): Promise<{ message: string }> {
    if (!orderId || orderId.trim().length === 0) {
      throw new BadRequestException('Order ID parameter is required');
    }

    // This would be implemented in OrdersService
    // For now, return a placeholder
    return { message: 'Review functionality coming soon' };
  }

  /**
   * Create dispute
   * POST /orders/:id/dispute
   * For problematic orders
   */
  @Post(':id/dispute')
  @HttpCode(HttpStatus.CREATED)
  async createDispute(
    @Param('id') orderId: string,
    @Body() disputeDto: CreateDisputeDto,
    @Request() req,
  ): Promise<{ message: string }> {
    if (!orderId || orderId.trim().length === 0) {
      throw new BadRequestException('Order ID parameter is required');
    }

    // This would be implemented in OrdersService
    // For now, return a placeholder
    return { message: 'Dispute functionality coming soon' };
  }

  /**
   * Get user's orders by user ID (admin only)
   * GET /orders/user/:userId
   */
  @Get('user/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getUserOrders(
    @Param('userId') userId: string,
    @Query() queryDto: GetOrdersQueryDto,
  ): Promise<PaginatedOrdersResponseDto> {
    if (!userId || userId.trim().length === 0) {
      throw new BadRequestException('User ID parameter is required');
    }

    return this.ordersService.getUserOrders(userId, queryDto, 'all');
  }

  /**
   * Delete order (admin only)
   * DELETE /orders/:id
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOrder(@Param('id') orderId: string): Promise<void> {
    if (!orderId || orderId.trim().length === 0) {
      throw new BadRequestException('Order ID parameter is required');
    }

    // This would be implemented in OrdersService
    // For now, return a placeholder
    throw new BadRequestException('Order deletion not implemented');
  }

  /**
   * Process seller payout (admin only)
   * POST /orders/:id/payout
   */
  @Post(':id/payout')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async processSellerPayout(
    @Param('id') orderId: string,
    @Body() payoutDto: ProcessSellerPayoutDto,
  ): Promise<{ message: string }> {
    if (!orderId || orderId.trim().length === 0) {
      throw new BadRequestException('Order ID parameter is required');
    }

    await this.ordersService.processSellerPayout(orderId, payoutDto);
    return { message: 'Seller payout processed successfully' };
  }

  /**
   * Get order statistics (admin only)
   * GET /orders/stats/summary
   */
  @Get('stats/summary')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getOrderStats(): Promise<any> {
    // This would be implemented in OrdersService
    // For now, return a placeholder
    return {
      message: 'Order statistics functionality coming soon',
      totalOrders: 0,
      pendingOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      totalRevenue: 0,
    };
  }
}
