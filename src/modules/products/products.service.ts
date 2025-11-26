import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from './entities/product.entity';
import { CategoriesService } from '../categories/categories.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import {
  GetProductsQueryDto,
  GetUserProductsQueryDto,
  SearchProductsDto,
  PaginatedProductResponseDto,
  ProductResponseDto,
} from './dto/query.dto';
import { generateSlug } from '../../utils/slug-generator';
import { ProductStatus } from '../../common/enums/product.enum';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private categoriesService: CategoriesService,
  ) {}

  /**
   * Create a new product
   * @param createProductDto - Product data from request
   * @param sellerId - ID of the seller creating the product
   * @returns Created product
   */
  async create(
    createProductDto: CreateProductDto,
    sellerId: string,
  ): Promise<ProductResponseDto> {
    try {
      // Validate MongoDB ObjectId format
      if (!Types.ObjectId.isValid(sellerId)) {
        throw new BadRequestException('Invalid seller ID format');
      }

      // Generate unique slug from title
      const slug = generateSlug(createProductDto.title);

      // Check if slug already exists
      const existingProduct = await this.productModel.findOne({ slug });
      if (existingProduct) {
        throw new ConflictException('A product with this title already exists');
      }

      // Convert subcategoryId string to ObjectId if provided
      const subCategoryId = createProductDto.subCategoryId
        ? new Types.ObjectId(createProductDto.subCategoryId)
        : undefined;

      // Create product with draft status
      const product = new this.productModel({
        ...createProductDto,
        subCategory: subCategoryId,
        slug,
        sellerId: new Types.ObjectId(sellerId),
        status: ProductStatus.DRAFT,
        images: createProductDto.images || [],
        shipping: createProductDto.shipping,
      });

      const savedProduct = await product.save();

      // Populate seller information from User model (if needed)
      const populatedProduct = await this.productModel
        .findById(savedProduct.id)
        .lean()
        .exec();

      return this.mapProductToResponseDto(populatedProduct);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update an existing product
   * @param productId - ID of product to update
   * @param updateProductDto - Updated product data
   * @param userId - ID of user making the request
   * @returns Updated product
   */
  async update(
    productId: string,
    updateProductDto: UpdateProductDto,
    userId: string,
  ): Promise<ProductResponseDto> {
    try {
      // Validate MongoDB ObjectIds
      if (
        !Types.ObjectId.isValid(productId) ||
        !Types.ObjectId.isValid(userId)
      ) {
        throw new BadRequestException('Invalid ID format');
      }

      const product = await this.productModel.findById(productId);
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Check ownership
      if (product.sellerId.toString() !== userId) {
        throw new ForbiddenException(
          'You do not have permission to update this product',
        );
      }

      // Prevent updates to sold products
      if (product.sold) {
        throw new BadRequestException('Cannot update a sold product');
      }

      // Update product
      Object.assign(product, updateProductDto);
      const updatedProduct = await product.save();

      return this.mapProductToResponseDto(updatedProduct.toObject());
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update product: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete a product
   * @param productId - ID of product to delete
   * @param userId - ID of user making the request
   */
  async delete(productId: string, userId: string): Promise<void> {
    try {
      if (
        !Types.ObjectId.isValid(productId) ||
        !Types.ObjectId.isValid(userId)
      ) {
        throw new BadRequestException('Invalid ID format');
      }

      const product = await this.productModel.findById(productId);
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Check ownership
      if (product.sellerId.toString() !== userId) {
        throw new ForbiddenException(
          'You do not have permission to delete this product',
        );
      }

      await this.productModel.findByIdAndDelete(productId);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get all products with filters and pagination
   * @param queryDto - Query parameters
   * @returns Paginated products
   */
  async findAll(
    queryDto: GetProductsQueryDto,
  ): Promise<PaginatedProductResponseDto> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        category,
        condition,
        brand,
        minPrice,
        maxPrice,
        sortBy = 'newest',
        status = ProductStatus.ACTIVE,
      } = queryDto;

      const skip = (page - 1) * limit;
      const query: any = { status };

      // Add filters - category is slug, find by category slug
      if (category) {
        // Find category by slug using CategoriesService
        try {
          const categoryDoc = await this.categoriesService.findBySlug(category);
          query.category = new Types.ObjectId(categoryDoc.id);
        } catch {
          // Return empty result if category slug not found
          return {
            data: [],
            total: 0,
            page,
            limit,
            pages: 0,
            hasMore: false,
          };
        }
      }
      if (condition) query.condition = condition;
      if (brand) query.brand = { $regex: brand, $options: 'i' };
      if (minPrice !== undefined || maxPrice !== undefined) {
        query.sellingPrice = {};
        if (minPrice !== undefined) query.sellingPrice.$gte = minPrice;
        if (maxPrice !== undefined) query.sellingPrice.$lte = maxPrice;
      }

      // Text search
      if (search) {
        query.$text = { $search: search };
      }

      // Build sort
      const sortOptions: any = {};
      switch (sortBy) {
        case 'price-low':
          sortOptions.sellingPrice = 1;
          break;
        case 'price-high':
          sortOptions.sellingPrice = -1;
          break;
        case 'popular':
          sortOptions.views = -1;
          break;
        case 'trending':
          sortOptions.likes = -1;
          break;
        case 'oldest':
          sortOptions.createdAt = 1;
          break;
        case 'newest':
        default:
          sortOptions.createdAt = -1;
          break;
      }

      // Execute query with category population
      const [products, total] = await Promise.all([
        this.productModel
          .find(query)
          .populate('category', 'name slug')
          .populate('subCategory', 'name slug')
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.productModel.countDocuments(query),
      ]);

      const pages = Math.ceil(total / limit);

      return {
        data: products.map((product) => this.mapProductToResponseDto(product)),
        total,
        page,
        limit,
        pages,
        hasMore: page < pages,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to fetch products: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get a single product by ID
   * @param productId - ID of product to fetch
   * @returns Product details
   */
  async findById(productId: string): Promise<ProductResponseDto> {
    try {
      if (!Types.ObjectId.isValid(productId)) {
        throw new BadRequestException('Invalid product ID format');
      }

      const product = await this.productModel
        .findById(productId)
        .populate('category', 'name slug')
        .populate('subCategory', 'name slug icon categoryId')
        .lean()
        .exec();

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      return this.mapProductToResponseDto(product);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to fetch product: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get product by slug
   * @param slug - Product slug
   * @returns Product details
   */
  async findBySlug(slug: string): Promise<ProductResponseDto> {
    try {
      const product = await this.productModel
        .findOne({ slug })
        .populate('category', 'name slug')
        .populate('subCategory', 'name slug icon categoryId')
        .lean()
        .exec();

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      return this.mapProductToResponseDto(product);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to fetch product: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get all products for a specific user (seller)
   * @param userId - ID of the seller
   * @param queryDto - Query parameters
   * @returns Paginated user's products
   */
  async findUserProducts(
    userId: string,
    queryDto: GetUserProductsQueryDto,
  ): Promise<PaginatedProductResponseDto> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid user ID format');
      }

      const {
        page = 1,
        limit = 20,
        status,
        sortBy = 'newest',
        search,
      } = queryDto;
      const skip = (page - 1) * limit;

      const query: any = { sellerId: new Types.ObjectId(userId) };
      if (status) query.status = status;
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { brand: { $regex: search, $options: 'i' } },
        ];
      }

      const sortOptions: any = {};
      switch (sortBy) {
        case 'price-low':
          sortOptions.sellingPrice = 1;
          break;
        case 'price-high':
          sortOptions.sellingPrice = -1;
          break;
        case 'popular':
          sortOptions.views = -1;
          break;
        case 'oldest':
          sortOptions.createdAt = 1;
          break;
        case 'newest':
        default:
          sortOptions.createdAt = -1;
          break;
      }

      const [products, total] = await Promise.all([
        this.productModel
          .find(query)
          .populate('category', 'name slug')
          .populate('subCategory', 'name slug icon categoryId')
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.productModel.countDocuments(query),
      ]);

      const pages = Math.ceil(total / limit);

      return {
        data: products.map((product) => this.mapProductToResponseDto(product)),
        total,
        page,
        limit,
        pages,
        hasMore: page < pages,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to fetch user products: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Search products using text search
   * @param searchDto - Search parameters
   * @returns Paginated search results
   */
  async search(
    searchDto: SearchProductsDto,
  ): Promise<PaginatedProductResponseDto> {
    try {
      const {
        q,
        page = 1,
        limit = 20,
        category,
        minPrice,
        maxPrice,
        sortBy = 'relevance',
      } = searchDto;
      const skip = (page - 1) * limit;

      const query: any = { status: ProductStatus.ACTIVE };

      // Text search
      if (q) {
        query.$text = { $search: q };
      }

      // Add filters
      if (category) query.category = category;
      if (minPrice !== undefined || maxPrice !== undefined) {
        query.sellingPrice = {};
        if (minPrice !== undefined) query.sellingPrice.$gte = minPrice;
        if (maxPrice !== undefined) query.sellingPrice.$lte = maxPrice;
      }

      // Build sort
      const sortOptions: any = {};
      switch (sortBy) {
        case 'price-low':
          sortOptions.sellingPrice = 1;
          break;
        case 'price-high':
          sortOptions.sellingPrice = -1;
          break;
        case 'popular':
          sortOptions.views = -1;
          break;
        case 'newest':
          sortOptions.createdAt = -1;
          break;
        case 'relevance':
        default:
          sortOptions.score = { $meta: 'textScore' };
          break;
      }

      // Execute search
      const [products, total] = await Promise.all([
        this.productModel
          .find(
            query,
            sortBy === 'relevance' ? { score: { $meta: 'textScore' } } : {},
          )
          .populate('category', 'name slug')
          .populate('subCategory', 'name slug icon categoryId')
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.productModel.countDocuments(query),
      ]);

      const pages = Math.ceil(total / limit);

      return {
        data: products.map((product) => this.mapProductToResponseDto(product)),
        total,
        page,
        limit,
        pages,
        hasMore: page < pages,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to search products: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Increment view count for a product
   * @param productId - ID of product
   */
  async incrementViews(productId: string): Promise<void> {
    try {
      if (!Types.ObjectId.isValid(productId)) {
        throw new BadRequestException('Invalid product ID format');
      }

      await this.productModel.findByIdAndUpdate(
        productId,
        {
          $inc: { views: 1 },
          $set: { lastViewedAt: new Date() },
        },
        { new: true },
      );
    } catch (error) {
      // Silently fail on view increment
      console.error(
        `Failed to increment views: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Toggle like for a product by a user
   * @param productId - ID of product
   * @param userId - ID of user
   * @returns Updated like count
   */
  async toggleLike(productId: string, userId: string): Promise<number | null> {
    try {
      if (
        !Types.ObjectId.isValid(productId) ||
        !Types.ObjectId.isValid(userId)
      ) {
        throw new BadRequestException('Invalid ID format');
      }

      const product = await this.productModel.findById(productId);
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const userObjectId = new Types.ObjectId(userId);
      const hasLiked = product.likedBy?.some((id) => id.toString() === userId);

      if (hasLiked) {
        // Remove like
        await this.productModel.findByIdAndUpdate(
          productId,
          {
            $pull: { likedBy: userObjectId },
            $inc: { likes: -1 },
          },
          { new: true },
        );
      } else {
        // Add like
        await this.productModel.findByIdAndUpdate(
          productId,
          {
            $push: { likedBy: userObjectId },
            $inc: { likes: 1 },
          },
          { new: true },
        );
      }

      const updatedProduct = await this.productModel.findById(productId);
      return updatedProduct?.likes || null;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to toggle like: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Toggle save for a product by a user
   * @param productId - ID of product
   * @param userId - ID of user
   * @returns Updated save count
   */
  async toggleSave(productId: string, userId: string): Promise<number | null> {
    try {
      if (
        !Types.ObjectId.isValid(productId) ||
        !Types.ObjectId.isValid(userId)
      ) {
        throw new BadRequestException('Invalid ID format');
      }

      const product = await this.productModel.findById(productId);
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const userObjectId = new Types.ObjectId(userId);
      const hasSaved = product.savedBy?.some((id) => id.toString() === userId);

      if (hasSaved) {
        // Remove save
        await this.productModel.findByIdAndUpdate(
          productId,
          {
            $pull: { savedBy: userObjectId },
            $inc: { saves: -1 },
          },
          { new: true },
        );
      } else {
        // Add save
        await this.productModel.findByIdAndUpdate(
          productId,
          {
            $push: { savedBy: userObjectId },
            $inc: { saves: 1 },
          },
          { new: true },
        );
      }

      const updatedProduct = await this.productModel.findById(productId);
      return updatedProduct?.saves || null;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to toggle save: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Map product document to response DTO
   * @param product - Product document
   * @returns Product response DTO
   */
  private mapProductToResponseDto(product: any): ProductResponseDto {
    return {
      id: product._id?.toString() || product.id,
      title: product.title,
      description: product.description,
      brand: product.brand,
      model: product.model,
      serialNumber: product.serialNumber,
      category: product.category,
      subCategory: product.subCategory,
      gender: product.gender,
      sellerId: product.sellerId.toString(),
      sellerName: product.sellerName,
      isVerifiedSeller: product.isVerifiedSeller,
      originalPrice: product.originalPrice,
      sellingPrice: product.sellingPrice,
      retailPrice: product.retailPrice,
      currency: product.currency,
      negotiable: product.negotiable,
      condition: product.condition,
      yearPurchased: product.yearPurchased,
      purchaseLocation: product.purchaseLocation,
      receiptAvailable: product.receiptAvailable,
      careInstructions: product.careInstructions,
      flaws: product.flaws,
      size: product.size,
      sizeType: product.sizeType,
      measurements: product.measurements,
      materials: product.materials,
      color: product.color,
      colors: product.colors,
      pattern: product.pattern,
      season: product.season,
      tags: product.tags,
      images: product.images,
      authenticationStatus: product.authenticationStatus,
      authenticationCertificate: product.authenticationCertificate,
      slug: product.slug,
      status: product.status,
      featured: product.featured,
      promoted: product.promoted,
      quantity: product.quantity,
      sold: product.sold,
      shipping: product.shipping,
      shippingMethods: product.shippingMethods,
      views: product.views,
      likes: product.likes,
      saves: product.saves,
      shares: product.shares,
      inquiries: product.inquiries,
      averageRating: product.averageRating,
      totalReviews: product.totalReviews,
      keywords: product.keywords,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      location: product.location,
      publishedAt: product.publishedAt,
      lastViewedAt: product.lastViewedAt,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      isVerified: product.isVerified,
    };
  }
}
