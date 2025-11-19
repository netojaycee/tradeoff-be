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
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import {
  GetProductsQueryDto,
  GetUserProductsQueryDto,
  SearchProductsDto,
  PaginatedProductResponseDto,
  ProductResponseDto,
} from './dto/query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '@/common/decorators/public.decorator';

/**
 * Products Controller
 * Handles all product-related HTTP requests
 */
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * Create a new product
   * POST /products
   * Requires authentication
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createProductDto: CreateProductDto,
    @Request() req,
  ): Promise<ProductResponseDto> {
    const userId = req.user.sub;
    return this.productsService.create(createProductDto, userId);
  }

  /**
   * Get all products with filters and pagination
   * GET /products
   * Public endpoint
   */
  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() queryDto: GetProductsQueryDto,
  ): Promise<PaginatedProductResponseDto> {
    return this.productsService.findAll(queryDto);
  }

  /**
   * Search products using text search
   * GET /products/search
   * Public endpoint
   */
  @Get('search')
  @HttpCode(HttpStatus.OK)
  async search(
    @Query() searchDto: SearchProductsDto,
  ): Promise<PaginatedProductResponseDto> {
    return this.productsService.search(searchDto);
  }

  /**
   * Get product by slug
   * GET /products/slug/:slug
   * Public endpoint
   */
  @Get('slug/:slug')
  @Public()
  @HttpCode(HttpStatus.OK)
  async findBySlug(@Param('slug') slug: string): Promise<ProductResponseDto> {
    if (!slug || slug.trim().length === 0) {
      throw new BadRequestException('Slug parameter is required');
    }

    // Increment view count
    // We don't await this to avoid adding latency to the request
    const product = await this.productsService.findBySlug(slug);
    this.productsService
      .incrementViews(product.id)
      .catch((err) => console.error('Failed to increment views:', err));

    return product;
  }

  /**
   * Get user's products
   * GET /products/user/:userId
   * Public endpoint
   */
  @Get('user/:userId')
  @HttpCode(HttpStatus.OK)
  async findUserProducts(
    @Param('userId') userId: string,
    @Query() queryDto: GetUserProductsQueryDto,
  ): Promise<PaginatedProductResponseDto> {
    if (!userId || userId.trim().length === 0) {
      throw new BadRequestException('User ID parameter is required');
    }

    return this.productsService.findUserProducts(userId, queryDto);
  }

  /**
   * Get product by ID
   * GET /products/:id
   * Public endpoint
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string): Promise<ProductResponseDto> {
    if (!id || id.trim().length === 0) {
      throw new BadRequestException('Product ID parameter is required');
    }

    // Increment view count
    const product = await this.productsService.findById(id);
    this.productsService
      .incrementViews(id)
      .catch((err) => console.error('Failed to increment views:', err));

    return product;
  }

  /**
   * Update a product
   * PATCH /products/:id
   * Requires authentication and ownership
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req,
  ): Promise<ProductResponseDto> {
    if (!id || id.trim().length === 0) {
      throw new BadRequestException('Product ID parameter is required');
    }

    const userId = req.user.sub;
    return this.productsService.update(id, updateProductDto, userId);
  }

  /**
   * Delete a product
   * DELETE /products/:id
   * Requires authentication and ownership
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Request() req): Promise<void> {
    if (!id || id.trim().length === 0) {
      throw new BadRequestException('Product ID parameter is required');
    }

    const userId = req.user.sub;
    return this.productsService.delete(id, userId);
  }

  /**
   * Like/Unlike a product
   * POST /products/:id/like
   * Requires authentication
   */
  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async toggleLike(
    @Param('id') productId: string,
    @Request() req,
  ): Promise<{ likes: number | null; liked: boolean }> {
    if (!productId || productId.trim().length === 0) {
      throw new BadRequestException('Product ID parameter is required');
    }

    const userId = req.user.sub;
    const likes = await this.productsService.toggleLike(productId, userId);

    // Check if user currently has liked (by fetching updated product)
    const product = await this.productsService.findById(productId);
    const liked = (product.likedBy as any)?.some((id: any) => id === userId)
      ? true
      : false;

    return { likes, liked };
  }

  /**
   * Save/Unsave a product
   * POST /products/:id/save
   * Requires authentication
   */
  @Post(':id/save')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async toggleSave(
    @Param('id') productId: string,
    @Request() req,
  ): Promise<{ saves: number | null; saved: boolean }> {
    if (!productId || productId.trim().length === 0) {
      throw new BadRequestException('Product ID parameter is required');
    }

    const userId = req.user.sub;
    const saves = await this.productsService.toggleSave(productId, userId);

    // Check if user currently has saved (by fetching updated product)
    const product = await this.productsService.findById(productId);
    const saved = (product.savedBy as any)?.some((id: any) => id === userId)
      ? true
      : false;

    return { saves, saved };
  }

  /**
   * Get my products
   * GET /products/my/list
   * Requires authentication - user's own products
   */
  @Get('my/list')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getMyProducts(
    @Query() queryDto: GetUserProductsQueryDto,
    @Request() req,
  ): Promise<PaginatedProductResponseDto> {
    const userId = req.user.sub;
    return this.productsService.findUserProducts(userId, queryDto);
  }
}
