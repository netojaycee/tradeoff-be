import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryDto } from './create-category.dto';

/**
 * DTO for updating a category
 * Inherits from CreateCategoryDto but all fields are optional
 */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
