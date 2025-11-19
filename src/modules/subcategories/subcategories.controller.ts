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
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { SubcategoriesService } from './subcategories.service';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';
import {
  GetSubcategoriesQueryDto,
  SubcategoryResponseDto,
  PaginatedSubcategoryResponseDto,
} from './dto/query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user.enum';

/**
 * Subcategories Controller
 * Handles all subcategory-related HTTP requests
 * Public endpoints: GET (all, by ID, by slug, by category)
 * Protected endpoints: POST (admin only), PATCH (admin only), DELETE (admin only)
 */
@Controller('subcategories')
export class SubcategoriesController {
  constructor(private readonly subcategoriesService: SubcategoriesService) {}

  /**
   * Create a new subcategory
   * POST /subcategories
   * Requires admin authentication
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createSubcategoryDto: CreateSubcategoryDto,
  ): Promise<SubcategoryResponseDto> {
    return this.subcategoriesService.create(createSubcategoryDto);
  }

  /**
   * Get all subcategories with filters and pagination
   * GET /subcategories
   * Public endpoint
   *
   * Query parameters:
   * - page: number (default: 1)
   * - limit: number (default: 10, max: 100)
   * - categoryId: string (filter by category)
   * - isActive: boolean
   * - sortBy: string (name, createdAt, order, productCount)
   * - order: 'asc' | 'desc' (default: asc)
   * - search: string (search in name, description)
   */
  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() queryDto: GetSubcategoriesQueryDto,
  ): Promise<PaginatedSubcategoryResponseDto> {
    return this.subcategoriesService.findAll(queryDto);
  }

  /**
   * Get all subcategories for a specific category
   * GET /subcategories/category/:categoryId
   * Public endpoint
   *
   * @param categoryId - Category ID
   */
  @Get('category/:categoryId')
  @Public()
  @HttpCode(HttpStatus.OK)
  async findByCategory(
    @Param('categoryId') categoryId: string,
  ): Promise<SubcategoryResponseDto[]> {
    if (!categoryId || categoryId.trim().length === 0) {
      throw new BadRequestException('Category ID parameter is required');
    }
    return this.subcategoriesService.findByCategory(categoryId);
  }

  /**
   * Get subcategory by slug
   * GET /subcategories/slug/:slug
   * Public endpoint
   *
   * @param slug - Subcategory slug (URL-friendly identifier)
   */
  @Get('slug/:slug')
  @Public()
  @HttpCode(HttpStatus.OK)
  async findBySlug(
    @Param('slug') slug: string,
  ): Promise<SubcategoryResponseDto> {
    if (!slug || slug.trim().length === 0) {
      throw new BadRequestException('Slug parameter is required');
    }
    return this.subcategoriesService.findBySlug(slug);
  }

  /**
   * Get subcategory by ID
   * GET /subcategories/:id
   * Public endpoint
   *
   * @param id - Subcategory ID
   */
  @Get(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string): Promise<SubcategoryResponseDto> {
    if (!id || id.trim().length === 0) {
      throw new BadRequestException('Subcategory ID parameter is required');
    }
    return this.subcategoriesService.findById(id);
  }

  /**
   * Update a subcategory
   * PATCH /subcategories/:id
   * Requires admin authentication
   *
   * @param id - Subcategory ID
   * @param updateSubcategoryDto - Update data (all fields optional)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateSubcategoryDto: UpdateSubcategoryDto,
  ): Promise<SubcategoryResponseDto> {
    if (!id || id.trim().length === 0) {
      throw new BadRequestException('Subcategory ID parameter is required');
    }
    return this.subcategoriesService.update(id, updateSubcategoryDto);
  }

  /**
   * Delete a subcategory
   * DELETE /subcategories/:id
   * Requires admin authentication
   *
   * Note: Cannot delete subcategory if it has products
   *
   * @param id - Subcategory ID
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    if (!id || id.trim().length === 0) {
      throw new BadRequestException('Subcategory ID parameter is required');
    }
    return this.subcategoriesService.delete(id);
  }
}
