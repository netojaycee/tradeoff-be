import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Subcategory,
  SubcategorySchema,
} from './entities/subcategory.entity';
import { SubcategoriesService } from './subcategories.service';
import { SubcategoriesController } from './subcategories.controller';

/**
 * Subcategories Module
 * Manages product subcategories under main categories
 * Supports optional subcategory assignment to products
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Subcategory.name,
        schema: SubcategorySchema,
      },
    ]),
  ],
  providers: [SubcategoriesService],
  controllers: [SubcategoriesController],
  exports: [SubcategoriesService], // Export for use in products module
})
export class SubcategoriesModule {}
