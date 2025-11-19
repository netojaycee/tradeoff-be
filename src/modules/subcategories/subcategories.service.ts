import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Subcategory,
  SubcategoryDocument,
} from './entities/subcategory.entity';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';
import {
  GetSubcategoriesQueryDto,
  SubcategoryResponseDto,
  PaginatedSubcategoryResponseDto,
} from './dto/query.dto';
import { generateSlug } from '../../utils/slug-generator';

@Injectable()
export class SubcategoriesService {
  constructor(
    @InjectModel(Subcategory.name)
    private subcategoryModel: Model<SubcategoryDocument>,
  ) {}

  /**
   * Create a new subcategory
   * @param createSubcategoryDto - Subcategory data from request
   * @returns Created subcategory
   */
  async create(
    createSubcategoryDto: CreateSubcategoryDto,
  ): Promise<SubcategoryResponseDto> {
    try {
      // Validate category ID
      if (!Types.ObjectId.isValid(createSubcategoryDto.categoryId)) {
        throw new BadRequestException('Invalid category ID format');
      }

      // Generate slug if not provided
      const slug =
        createSubcategoryDto.slug || generateSlug(createSubcategoryDto.name);

      // Check if slug already exists for this category
      const existingSlug = await this.subcategoryModel.findOne({
        slug,
        categoryId: new Types.ObjectId(createSubcategoryDto.categoryId),
      });
      if (existingSlug) {
        throw new ConflictException(
          `A subcategory with slug "${slug}" already exists in this category`,
        );
      }

      // Create new subcategory
      const subcategory = new this.subcategoryModel({
        name: createSubcategoryDto.name,
        slug,
        categoryId: new Types.ObjectId(createSubcategoryDto.categoryId),
        description: createSubcategoryDto.description,
        icon: createSubcategoryDto.icon,
        order: createSubcategoryDto.order ?? 0,
        isActive: createSubcategoryDto.isActive ?? true,
        productCount: 0,
        seoMetadata: {
          metaTitle: createSubcategoryDto.metaTitle,
          metaDescription: createSubcategoryDto.metaDescription,
          metaKeywords: createSubcategoryDto.metaKeywords || [],
        },
      });

      const savedSubcategory = await subcategory.save();
      return this.mapSubcategoryToResponseDto(savedSubcategory);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      console.error('Error creating subcategory:', error);
      throw new InternalServerErrorException('Failed to create subcategory');
    }
  }

  /**
   * Get all subcategories with filters and pagination
   * @param queryDto - Query parameters
   * @returns Paginated list of subcategories
   */
  async findAll(
    queryDto: GetSubcategoriesQueryDto,
  ): Promise<PaginatedSubcategoryResponseDto> {
    try {
      const page = Math.max(1, queryDto.page || 1);
      const limit = Math.max(1, Math.min(100, queryDto.limit || 10));
      const skip = (page - 1) * limit;

      // Build filter query
      const filter: any = {};

      // Filter by category ID
      if (queryDto.categoryId) {
        if (!Types.ObjectId.isValid(queryDto.categoryId)) {
          throw new BadRequestException('Invalid category ID format');
        }
        filter.categoryId = new Types.ObjectId(queryDto.categoryId);
      }

      // Filter by active status
      if (queryDto.isActive !== undefined) {
        filter.isActive = queryDto.isActive;
      }

      // Search functionality
      if (queryDto.search) {
        filter.$or = [
          { name: { $regex: queryDto.search, $options: 'i' } },
          { description: { $regex: queryDto.search, $options: 'i' } },
        ];
      }

      // Determine sort order
      const sortOrder = queryDto.order === 'desc' ? -1 : 1;
      const sortField = queryDto.sortBy || 'order';
      const sort: any = {};
      sort[sortField] = sortOrder;

      // Execute query with pagination
      const [subcategories, total] = await Promise.all([
        this.subcategoryModel
          .find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('categoryId', 'name slug')
          .lean()
          .exec(),
        this.subcategoryModel.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        data: subcategories.map((subcat) =>
          this.mapSubcategoryToResponseDto(subcat),
        ),
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

      console.error('Error fetching subcategories:', error);
      throw new InternalServerErrorException('Failed to fetch subcategories');
    }
  }

  /**
   * Get a subcategory by ID
   * @param id - Subcategory ID
   * @returns Subcategory details
   */
  async findById(id: string): Promise<SubcategoryResponseDto> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid subcategory ID format');
      }

      const subcategory = await this.subcategoryModel
        .findById(id)
        .populate('categoryId', 'name slug')
        .lean()
        .exec();

      if (!subcategory) {
        throw new NotFoundException('Subcategory not found');
      }

      return this.mapSubcategoryToResponseDto(subcategory);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      console.error('Error fetching subcategory by ID:', error);
      throw new InternalServerErrorException('Failed to fetch subcategory');
    }
  }

  /**
   * Get a subcategory by slug
   * @param slug - Subcategory slug
   * @returns Subcategory details
   */
  async findBySlug(slug: string): Promise<SubcategoryResponseDto> {
    try {
      if (!slug || slug.trim().length === 0) {
        throw new BadRequestException('Slug parameter is required');
      }

      const subcategory = await this.subcategoryModel
        .findOne({ slug: slug.toLowerCase() })
        .populate('categoryId', 'name slug')
        .lean()
        .exec();

      if (!subcategory) {
        throw new NotFoundException(
          `Subcategory with slug "${slug}" not found`,
        );
      }

      return this.mapSubcategoryToResponseDto(subcategory);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      console.error('Error fetching subcategory by slug:', error);
      throw new InternalServerErrorException('Failed to fetch subcategory');
    }
  }

  /**
   * Get all active subcategories for a specific category
   * @param categoryId - Category ID
   * @returns List of active subcategories
   */
  async findByCategory(categoryId: string): Promise<SubcategoryResponseDto[]> {
    try {
      if (!Types.ObjectId.isValid(categoryId)) {
        throw new BadRequestException('Invalid category ID format');
      }

      const subcategories = await this.subcategoryModel
        .find({
          categoryId: new Types.ObjectId(categoryId),
          isActive: true,
        })
        .sort({ order: 1 })
        .populate('categoryId', 'name slug')
        .lean()
        .exec();

      return subcategories.map((subcat) =>
        this.mapSubcategoryToResponseDto(subcat),
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      console.error('Error fetching subcategories by category:', error);
      throw new InternalServerErrorException('Failed to fetch subcategories');
    }
  }

  /**
   * Update a subcategory
   * @param id - Subcategory ID
   * @param updateSubcategoryDto - Update data
   * @returns Updated subcategory
   */
  async update(
    id: string,
    updateSubcategoryDto: UpdateSubcategoryDto,
  ): Promise<SubcategoryResponseDto> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid subcategory ID format');
      }

      const subcategory = await this.subcategoryModel.findById(id);
      if (!subcategory) {
        throw new NotFoundException('Subcategory not found');
      }

      // Check if slug is being changed
      if (
        updateSubcategoryDto.slug &&
        updateSubcategoryDto.slug !== subcategory.slug
      ) {
        const existingSlug = await this.subcategoryModel.findOne({
          slug: updateSubcategoryDto.slug,
          _id: { $ne: id },
          categoryId: subcategory.categoryId,
        });
        if (existingSlug) {
          throw new ConflictException(
            `A subcategory with slug "${updateSubcategoryDto.slug}" already exists in this category`,
          );
        }
      }

      // Apply updates
      const updateData: any = {
        ...updateSubcategoryDto,
      };

      // Generate new slug if name is being changed but slug is not
      if (updateSubcategoryDto.name && !updateSubcategoryDto.slug) {
        updateData.slug = generateSlug(updateSubcategoryDto.name);
      }

      // Update SEO metadata
      if (
        updateSubcategoryDto.metaTitle ||
        updateSubcategoryDto.metaDescription ||
        updateSubcategoryDto.metaKeywords
      ) {
        updateData.seoMetadata = {
          ...subcategory.seoMetadata,
          metaTitle: updateSubcategoryDto.metaTitle,
          metaDescription: updateSubcategoryDto.metaDescription,
          metaKeywords: updateSubcategoryDto.metaKeywords,
        };
      }

      const updatedSubcategory = await this.subcategoryModel
        .findByIdAndUpdate(id, updateData, {
          new: true,
          runValidators: true,
        })
        .populate('categoryId', 'name slug')
        .lean()
        .exec();

      return this.mapSubcategoryToResponseDto(updatedSubcategory);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      console.error('Error updating subcategory:', error);
      throw new InternalServerErrorException('Failed to update subcategory');
    }
  }

  /**
   * Delete a subcategory
   * @param id - Subcategory ID
   */
  async delete(id: string): Promise<{ message: string }> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid subcategory ID format');
      }

      const subcategory = await this.subcategoryModel.findById(id);
      if (!subcategory) {
        throw new NotFoundException('Subcategory not found');
      }

      // Check if subcategory has products
      if (subcategory.productCount > 0) {
        throw new ConflictException(
          `Cannot delete subcategory with ${subcategory.productCount} products. Please reassign or delete products first.`,
        );
      }

      await this.subcategoryModel.findByIdAndDelete(id);

      return { message: 'Subcategory deleted successfully' };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      console.error('Error deleting subcategory:', error);
      throw new InternalServerErrorException('Failed to delete subcategory');
    }
  }

  /**
   * Increment product count for a subcategory
   * Called when a product is created with this subcategory
   * @param subcategoryId - Subcategory ID
   */
  async incrementProductCount(subcategoryId: string): Promise<void> {
    try {
      if (!Types.ObjectId.isValid(subcategoryId)) {
        return; // Silently ignore invalid IDs
      }

      await this.subcategoryModel.findByIdAndUpdate(
        subcategoryId,
        { $inc: { productCount: 1 } },
        { new: true },
      );
    } catch (error) {
      console.error('Error incrementing product count:', error);
      // Don't throw - this is a secondary operation
    }
  }

  /**
   * Decrement product count for a subcategory
   * Called when a product is deleted
   * @param subcategoryId - Subcategory ID
   */
  async decrementProductCount(subcategoryId: string): Promise<void> {
    try {
      if (!Types.ObjectId.isValid(subcategoryId)) {
        return; // Silently ignore invalid IDs
      }

      await this.subcategoryModel.findByIdAndUpdate(
        subcategoryId,
        { $inc: { productCount: -1 } },
        { new: true },
      );
    } catch (error) {
      console.error('Error decrementing product count:', error);
      // Don't throw - this is a secondary operation
    }
  }

  /**
   * Map subcategory document to response DTO
   * @param subcategory - Subcategory document
   * @returns Formatted subcategory response
   */
  private mapSubcategoryToResponseDto(
    subcategory: any,
  ): SubcategoryResponseDto {
    return {
      id: subcategory._id?.toString() || subcategory.id,
      name: subcategory.name,
      slug: subcategory.slug,
      categoryId:
        subcategory.categoryId?._id?.toString() || subcategory.categoryId,
      categoryName: subcategory.categoryId?.name,
      description: subcategory.description,
      icon: subcategory.icon,
      order: subcategory.order,
      isActive: subcategory.isActive,
      productCount: subcategory.productCount,
      metaKeywords: subcategory.seoMetadata?.metaKeywords,
      metaTitle: subcategory.seoMetadata?.metaTitle,
      metaDescription: subcategory.seoMetadata?.metaDescription,
      createdAt: subcategory.createdAt,
      updatedAt: subcategory.updatedAt,
    };
  }
}
