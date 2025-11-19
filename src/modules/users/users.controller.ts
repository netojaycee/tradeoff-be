import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/user.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'inactive', 'suspended'],
  })
  @ApiQuery({ name: 'role', required: false, enum: ['user', 'admin'] })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
    @Query('role') role?: string,
  ) {
    const filters: Record<string, string> = {};
    if (status) filters.status = status;
    if (role) filters.role = role;

    return this.usersService.findAll(parseInt(page), parseInt(limit), filters);
  }

  @Get('search')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Search users (Admin only)' })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search query',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  searchUsers(
    @Query('q') query: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.usersService.searchUsers(
      query,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  getProfile(@CurrentUser('sub') userId: string) {
    return this.usersService.findById(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    // Transform the DTO to match the expected types
    const profileData: Partial<any> = { ...updateUserDto };

    // Convert dateOfBirth string to Date if provided
    if (updateUserDto.dateOfBirth) {
      profileData.dateOfBirth = new Date(updateUserDto.dateOfBirth);
    }

    return this.usersService.updateProfile(userId, profileData);
  }

  @Get('seller-stats')
  @ApiOperation({ summary: 'Get current user seller statistics' })
  @ApiResponse({
    status: 200,
    description: 'Seller stats retrieved successfully',
  })
  getSellerStats(@CurrentUser('sub') userId: string) {
    return this.usersService.getSellerStats(userId);
  }

  @Post('favorites/:productId')
  @ApiOperation({ summary: 'Add product to favorites' })
  @ApiResponse({ status: 200, description: 'Product added to favorites' })
  addToFavorites(
    @CurrentUser('sub') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.usersService.addToFavorites(userId, productId);
  }

  @Delete('favorites/:productId')
  @ApiOperation({ summary: 'Remove product from favorites' })
  @ApiResponse({ status: 200, description: 'Product removed from favorites' })
  removeFromFavorites(
    @CurrentUser('sub') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.usersService.removeFromFavorites(userId, productId);
  }

  @Post('follow/:sellerId')
  @ApiOperation({ summary: 'Follow a seller' })
  @ApiResponse({ status: 200, description: 'Seller followed successfully' })
  followSeller(
    @CurrentUser('sub') userId: string,
    @Param('sellerId') sellerId: string,
  ) {
    return this.usersService.followSeller(userId, sellerId);
  }

  @Delete('follow/:sellerId')
  @ApiOperation({ summary: 'Unfollow a seller' })
  @ApiResponse({ status: 200, description: 'Seller unfollowed successfully' })
  unfollowSeller(
    @CurrentUser('sub') userId: string,
    @Param('sellerId') sellerId: string,
  ) {
    return this.usersService.unfollowSeller(userId, sellerId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Get(':id/seller-stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get seller statistics for specific user (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Seller stats retrieved successfully',
  })
  getUserSellerStats(@Param('id') id: string) {
    return this.usersService.getSellerStats(id);
  }
}
