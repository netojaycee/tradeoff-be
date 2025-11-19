import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from './entities/category.entity';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';

/**
 * Categories Module
 * Manages product categories and subcategories
 * Supports hierarchical category structure
 * Tracks product counts and manages category metadata
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Category.name,
        schema: CategorySchema,
      },
    ]),
  ],
  providers: [CategoriesService],
  controllers: [CategoriesController],
  exports: [CategoriesService], // Export service for use in other modules (e.g., Products)
})
export class CategoriesModule {}
