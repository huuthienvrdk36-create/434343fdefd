import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../../shared/enums';
import { PlatformConfigService } from '../platform-config/platform-config.service';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly configService: PlatformConfigService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard stats' })
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // Users
  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'skip', required: false })
  getUsers(
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.adminService.getUsers({
      role,
      search,
      limit: limit ? parseInt(limit) : undefined,
      skip: skip ? parseInt(skip) : undefined,
    });
  }

  @Post('users/:id/block')
  @ApiOperation({ summary: 'Block user' })
  blockUser(@Param('id') id: string) {
    return this.adminService.blockUser(id);
  }

  @Post('users/:id/unblock')
  @ApiOperation({ summary: 'Unblock user' })
  unblockUser(@Param('id') id: string) {
    return this.adminService.unblockUser(id);
  }

  // Organizations
  @Get('organizations')
  @ApiOperation({ summary: 'Get all organizations' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'skip', required: false })
  getOrganizations(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.adminService.getOrganizations({
      status,
      search,
      limit: limit ? parseInt(limit) : undefined,
      skip: skip ? parseInt(skip) : undefined,
    });
  }

  @Post('organizations/:id/disable')
  @ApiOperation({ summary: 'Disable organization' })
  disableOrganization(@Param('id') id: string) {
    return this.adminService.disableOrganization(id);
  }

  @Post('organizations/:id/enable')
  @ApiOperation({ summary: 'Enable organization' })
  enableOrganization(@Param('id') id: string) {
    return this.adminService.enableOrganization(id);
  }

  // Bookings
  @Get('bookings')
  @ApiOperation({ summary: 'Get all bookings' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'skip', required: false })
  getBookings(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.adminService.getBookings({
      status,
      limit: limit ? parseInt(limit) : undefined,
      skip: skip ? parseInt(skip) : undefined,
    });
  }

  // Payments
  @Get('payments')
  @ApiOperation({ summary: 'Get all payments' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'skip', required: false })
  getPayments(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.adminService.getPayments({
      status,
      limit: limit ? parseInt(limit) : undefined,
      skip: skip ? parseInt(skip) : undefined,
    });
  }

  // Disputes
  @Get('disputes')
  @ApiOperation({ summary: 'Get all disputes' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'skip', required: false })
  getDisputes(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.adminService.getDisputes({
      status,
      limit: limit ? parseInt(limit) : undefined,
      skip: skip ? parseInt(skip) : undefined,
    });
  }

  // Reviews
  @Get('reviews')
  @ApiOperation({ summary: 'Get all reviews' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'skip', required: false })
  getReviews(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.adminService.getReviews({
      limit: limit ? parseInt(limit) : undefined,
      skip: skip ? parseInt(skip) : undefined,
    });
  }

  @Post('reviews/:id/hide')
  @ApiOperation({ summary: 'Hide review' })
  hideReview(@Param('id') id: string) {
    return this.adminService.hideReview(id);
  }

  // ==================== Platform Config ====================

  @Get('config')
  @ApiOperation({ summary: 'Get all platform configuration' })
  getConfig() {
    return this.configService.getAll(false);
  }

  @Post('config')
  @ApiOperation({ summary: 'Set a platform configuration value' })
  setConfig(@Body() body: { key: string; value: any }) {
    return this.configService.set(body.key, body.value);
  }

  // ═══════ 🔥 OPERATOR MODE — РУЧНОЕ УПРАВЛЕНИЕ ЗАЯВКАМИ ═══════

  /**
   * Create quote manually (operator mode)
   * ТЫ = ОПЕРАТОР
   */
  @Post('quotes/manual')
  @ApiOperation({ summary: 'Create quote manually (operator mode)' })
  createManualQuote(
    @Body() dto: {
      customerPhone: string;
      customerName?: string;
      description: string;
      serviceType?: string;
      location?: { lat: number; lng: number };
      urgency?: 'low' | 'normal' | 'urgent';
      notes?: string;
    },
  ) {
    return this.adminService.createManualQuote(dto);
  }

  /**
   * Get all quotes with response tracking
   */
  @Get('quotes/all')
  @ApiOperation({ summary: 'Get all quotes with tracking' })
  getAllQuotes(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    return this.adminService.getAllQuotesWithTracking({
      status,
      limit: limit ? parseInt(limit) : 20,
      page: page ? parseInt(page) : 1,
    });
  }

  /**
   * Get quote details with distribution info
   */
  @Get('quotes/:id/details')
  @ApiOperation({ summary: 'Get quote details with distributions' })
  getQuoteDetailsWithDistributions(@Param('id') id: string) {
    return this.adminService.getQuoteDetailsWithDistributions(id);
  }

  /**
   * Distribute quote to specific providers
   */
  @Post('quotes/:id/distribute')
  @ApiOperation({ summary: 'Distribute quote to providers' })
  distributeQuoteToProviders(
    @Param('id') quoteId: string,
    @Body() dto: { organizationIds: string[] },
  ) {
    return this.adminService.distributeQuoteToProviders(quoteId, dto.organizationIds);
  }

  /**
   * Close quote (match client with provider)
   */
  @Post('quotes/:id/close')
  @ApiOperation({ summary: 'Close quote with provider' })
  closeQuoteWithProvider(
    @Param('id') quoteId: string,
    @Body() dto: { 
      organizationId: string;
      price?: number;
      notes?: string;
    },
  ) {
    return this.adminService.closeQuoteWithProvider(quoteId, dto);
  }

  /**
   * Get provider response metrics
   */
  @Get('providers/:id/metrics')
  @ApiOperation({ summary: 'Get provider behavioral metrics' })
  getProviderMetrics(@Param('id') id: string) {
    return this.adminService.getProviderBehavioralMetrics(id);
  }

  /**
   * Get market health metrics
   */
  @Get('metrics/market')
  @ApiOperation({ summary: 'Get market health metrics' })
  getMarketMetrics() {
    return this.adminService.getMarketHealthMetrics();
  }

  /**
   * Get response time metrics
   */
  @Get('metrics/response')
  @ApiOperation({ summary: 'Get response time metrics' })
  getResponseMetrics() {
    return this.adminService.getResponseTimeMetrics();
  }
}
