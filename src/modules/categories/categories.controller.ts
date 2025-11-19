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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import {
  GetCategoriesQueryDto,
  CategoryResponseDto,
  PaginatedCategoryResponseDto,
} from './dto/query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user.enum';

/**
 * Categories Controller
 * Handles all category-related HTTP requests
 * Public endpoints: GET (all, by ID, by slug, active, parent, subcategories)
 * Protected endpoints: POST (admin only), PATCH (admin only), DELETE (admin only)
 */
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Create a new category
   * POST /categories
   * Requires admin authentication
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.create(createCategoryDto);
  }

  /**
   * Get all categories with filters and pagination
   * GET /categories
   * Public endpoint
   *
   * Query parameters:
   * - page: number (default: 1)
   * - limit: number (default: 10, max: 100)
   * - isActive: boolean
   * - sortBy: string (name, createdAt, sortOrder, productCount)
   * - order: 'asc' | 'desc' (default: asc)
   * - gender: string (MEN, WOMEN, UNISEX)
   * - search: string (search in name, description, keywords)
   */
  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() queryDto: GetCategoriesQueryDto,
  ): Promise<PaginatedCategoryResponseDto> {
    return this.categoriesService.findAll(queryDto);
  }

  /**
   * Get all active categories sorted by sort order
   * GET /categories/list/active
   * Public endpoint - used for navigation menus
   */
  @Get('list/active')
  @Public()
  @HttpCode(HttpStatus.OK)
  async findActive(): Promise<CategoryResponseDto[]> {
    return this.categoriesService.findActive();
  }

  /**
   * Get category by slug
   * GET /categories/slug/:slug
   * Public endpoint
   *
   * @param slug - Category slug (URL-friendly identifier)
   */
  @Get('slug/:slug')
  @Public()
  @HttpCode(HttpStatus.OK)
  async findBySlug(@Param('slug') slug: string): Promise<CategoryResponseDto> {
    if (!slug || slug.trim().length === 0) {
      throw new BadRequestException('Slug parameter is required');
    }
    return this.categoriesService.findBySlug(slug);
  }

  /**
   * Get category by ID
   * GET /categories/:id
   * Public endpoint
   *
   * @param id - Category ID
   */
  @Get(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string): Promise<CategoryResponseDto> {
    if (!id || id.trim().length === 0) {
      throw new BadRequestException('Category ID parameter is required');
    }
    return this.categoriesService.findById(id);
  }

  /**
   * Update a category
   * PATCH /categories/:id
   * Requires admin authentication
   *
   * @param id - Category ID
   * @param updateCategoryDto - Update data (all fields optional)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    if (!id || id.trim().length === 0) {
      throw new BadRequestException('Category ID parameter is required');
    }
    return this.categoriesService.update(id, updateCategoryDto);
  }

  /**
   * Delete a category
   * DELETE /categories/:id
   * Requires admin authentication
   *
   * Note: Cannot delete category if it has products or subcategories
   *
   * @param id - Category ID
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    if (!id || id.trim().length === 0) {
      throw new BadRequestException('Category ID parameter is required');
    }
    return this.categoriesService.delete(id);
  }
}
