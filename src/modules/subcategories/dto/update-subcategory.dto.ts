import { PartialType } from '@nestjs/mapped-types';
import { CreateSubcategoryDto } from './create-subcategory.dto';

/**
 * DTO for updating a subcategory
 * Inherits from CreateSubcategoryDto but all fields are optional
 */
export class UpdateSubcategoryDto extends PartialType(
  CreateSubcategoryDto,
) {}
