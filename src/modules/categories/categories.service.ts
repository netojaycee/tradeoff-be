import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import {
  GetCategoriesQueryDto,
  CategoryResponseDto,
  PaginatedCategoryResponseDto,
} from './dto/query.dto';
import { generateSlug } from '../../utils/slug-generator';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private categoryModel: Model<CategoryDocument>,
  ) {}

  /**
   * Create a new category
   * @param createCategoryDto - Category data from request
   * @returns Created category
   */
  async create(
    createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    try {
      // Generate slug if not provided
      const slug = generateSlug(createCategoryDto.name);

      // Check if slug already exists
      const existingCategory = await this.categoryModel.findOne({ slug });
      if (existingCategory) {
        throw new ConflictException(
          `A category with slug "${slug}" already exists`,
        );
      }

      // Check if name already exists
      const existingName = await this.categoryModel.findOne({
        name: createCategoryDto.name.toLowerCase(),
      });
      if (existingName) {
        throw new ConflictException(
          `A category with name "${createCategoryDto.name}" already exists`,
        );
      }

      // Create new category
      const category = new this.categoryModel({
        name: createCategoryDto.name,
        slug,
        description: createCategoryDto.description,
        gender: createCategoryDto.gender,
        image: createCategoryDto.image,
        icon: createCategoryDto.icon,
        isActive: createCategoryDto.isActive ?? true,
        sortOrder: createCategoryDto.sortOrder ?? 0,
        keywords: createCategoryDto.keywords || [],
        seoTitle: createCategoryDto.seoTitle,
        seoDescription: createCategoryDto.seoDescription,
        productCount: 0,
        activeProductCount: 0,
      });

      const savedCategory = await category.save();
      return this.mapCategoryToResponseDto(savedCategory);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      console.error('Error creating category:', error);
      throw new InternalServerErrorException('Failed to create category');
    }
  }

  /**
   * Get all categories with filters and pagination
   * @param queryDto - Query parameters
   * @returns Paginated list of categories
   */
  async findAll(
    queryDto: GetCategoriesQueryDto,
  ): Promise<PaginatedCategoryResponseDto> {
    try {
      const page = Math.max(1, queryDto.page || 1);
      const limit = Math.max(1, Math.min(100, queryDto.limit || 10));
      const skip = (page - 1) * limit;

      // Build filter query
      const filter: any = {};

      // Filter by active status
      if (queryDto.isActive !== undefined) {
        filter.isActive = queryDto.isActive;
      }

      // Filter by gender
      if (queryDto.gender) {
        filter.gender = queryDto.gender;
      }

      // Search functionality
      if (queryDto.search) {
        filter.$text = { $search: queryDto.search };
      }

      // Determine sort order
      const sortOrder = queryDto.order === 'desc' ? -1 : 1;
      const sortField = queryDto.sortBy || 'sortOrder';
      const sort: any = {};
      sort[sortField] = sortOrder;

      // Execute query with pagination
      const [categories, total] = await Promise.all([
        this.categoryModel
          .find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.categoryModel.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        data: categories.map((cat) => this.mapCategoryToResponseDto(cat)),
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      console.error('Error fetching categories:', error);
      throw new InternalServerErrorException('Failed to fetch categories');
    }
  }

  /**
   * Get a category by ID
   * @param id - Category ID
   * @returns Category details
   */
  async findById(id: string): Promise<CategoryResponseDto> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid category ID format');
      }

      const category = await this.categoryModel.findById(id).lean().exec();

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      return this.mapCategoryToResponseDto(category);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      console.error('Error fetching category by ID:', error);
      throw new InternalServerErrorException('Failed to fetch category');
    }
  }

  /**
   * Get a category by slug
   * @param slug - Category slug
   * @returns Category details
   */
  async findBySlug(slug: string): Promise<CategoryResponseDto> {
    try {
      if (!slug || slug.trim().length === 0) {
        throw new BadRequestException('Slug parameter is required');
      }

      const category = await this.categoryModel
        .findOne({ slug: slug.toLowerCase() })
        .lean()
        .exec();

      if (!category) {
        throw new NotFoundException(`Category with slug "${slug}" not found`);
      }

      return this.mapCategoryToResponseDto(category);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      console.error('Error fetching category by slug:', error);
      throw new InternalServerErrorException('Failed to fetch category');
    }
  }

  /**
   * Get all active categories sorted by sort order
   * Used for navigation menus and category listings
   * @returns List of active categories
   */
  async findActive(): Promise<CategoryResponseDto[]> {
    try {
      const categories = await this.categoryModel
        .find({ isActive: true })
        .sort({ sortOrder: 1 })
        .lean()
        .exec();

      return categories.map((cat) => this.mapCategoryToResponseDto(cat));
    } catch (error) {
      console.error('Error fetching active categories:', error);
      throw new InternalServerErrorException(
        'Failed to fetch active categories',
      );
    }
  }

  /**
   * Update a category
   * @param id - Category ID
   * @param updateCategoryDto - Update data
   * @returns Updated category
   */
  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid category ID format');
      }

      const category = await this.categoryModel.findById(id);
      if (!category) {
        throw new NotFoundException('Category not found');
      }

      // Check if slug is being changed and if new slug already exists
      if (updateCategoryDto.slug && updateCategoryDto.slug !== category.slug) {
        const existingSlug = await this.categoryModel.findOne({
          slug: updateCategoryDto.slug,
          _id: { $ne: id },
        });
        if (existingSlug) {
          throw new ConflictException(
            `A category with slug "${updateCategoryDto.slug}" already exists`,
          );
        }
      }

      // Check if name is being changed and if new name already exists
      if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
        const existingName = await this.categoryModel.findOne({
          name: updateCategoryDto.name,
          _id: { $ne: id },
        });
        if (existingName) {
          throw new ConflictException(
            `A category with name "${updateCategoryDto.name}" already exists`,
          );
        }
      }

      // Apply updates
      const updateData: any = {
        ...updateCategoryDto,
      };

      // Generate new slug if name is being changed but slug is not
      if (updateCategoryDto.name && !updateCategoryDto.slug) {
        updateData.slug = generateSlug(updateCategoryDto.name);
      }

      const updatedCategory = await this.categoryModel
        .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
        .lean()
        .exec();

      return this.mapCategoryToResponseDto(updatedCategory);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      console.error('Error updating category:', error);
      throw new InternalServerErrorException('Failed to update category');
    }
  }

  /**
   * Delete a category
   * @param id - Category ID
   */
  async delete(id: string): Promise<{ message: string }> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid category ID format');
      }

      const category = await this.categoryModel.findById(id);
      if (!category) {
        throw new NotFoundException('Category not found');
      }

      // Check if category has products
      if (category.productCount > 0) {
        throw new ConflictException(
          `Cannot delete category with ${category.productCount} products. Please reassign or delete products first.`,
        );
      }

      // Note: Subcategories are now in a separate model,
      // so no need to check for nested subcategories here

      await this.categoryModel.findByIdAndDelete(id);

      return { message: 'Category deleted successfully' };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      console.error('Error deleting category:', error);
      throw new InternalServerErrorException('Failed to delete category');
    }
  }

  /**
   * Increment product count for a category
   * Called when a product is created
   * @param categoryId - Category ID
   */
  async incrementProductCount(categoryId: string): Promise<void> {
    try {
      if (!Types.ObjectId.isValid(categoryId)) {
        return; // Silently ignore invalid IDs
      }

      await this.categoryModel.findByIdAndUpdate(
        categoryId,
        { $inc: { productCount: 1 } },
        { new: true },
      );
    } catch (error) {
      console.error('Error incrementing product count:', error);
      // Don't throw - this is a secondary operation
    }
  }

  /**
   * Decrement product count for a category
   * Called when a product is deleted
   * @param categoryId - Category ID
   */
  async decrementProductCount(categoryId: string): Promise<void> {
    try {
      if (!Types.ObjectId.isValid(categoryId)) {
        return; // Silently ignore invalid IDs
      }

      await this.categoryModel.findByIdAndUpdate(
        categoryId,
        { $inc: { productCount: -1 } },
        { new: true },
      );
    } catch (error) {
      console.error('Error decrementing product count:', error);
      // Don't throw - this is a secondary operation
    }
  }

  /**
   * Increment active product count for a category
   * Called when a product is published/activated
   * @param categoryId - Category ID
   */
  async incrementActiveProductCount(categoryId: string): Promise<void> {
    try {
      if (!Types.ObjectId.isValid(categoryId)) {
        return; // Silently ignore invalid IDs
      }

      await this.categoryModel.findByIdAndUpdate(
        categoryId,
        { $inc: { activeProductCount: 1 } },
        { new: true },
      );
    } catch (error) {
      console.error('Error incrementing active product count:', error);
      // Don't throw - this is a secondary operation
    }
  }

  /**
   * Decrement active product count for a category
   * Called when a product is unpublished/deactivated
   * @param categoryId - Category ID
   */
  async decrementActiveProductCount(categoryId: string): Promise<void> {
    try {
      if (!Types.ObjectId.isValid(categoryId)) {
        return; // Silently ignore invalid IDs
      }

      await this.categoryModel.findByIdAndUpdate(
        categoryId,
        { $inc: { activeProductCount: -1 } },
        { new: true },
      );
    } catch (error) {
      console.error('Error decrementing active product count:', error);
      // Don't throw - this is a secondary operation
    }
  }

  /**
   * Map category document to response DTO
   * @param category - Category document
   * @returns Formatted category response
   */
  private mapCategoryToResponseDto(category: any): CategoryResponseDto {
    return {
      id: category._id?.toString() || category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      gender: category.gender,
      image: category.image,
      icon: category.icon,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      keywords: category.keywords,
      seoTitle: category.seoTitle,
      seoDescription: category.seoDescription,
      productCount: category.productCount,
      activeProductCount: category.activeProductCount,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
