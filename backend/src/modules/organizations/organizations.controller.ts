import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { RankingService } from './ranking.service';
import { ProviderStatsService } from './provider-stats.service';
import { DynamicCommissionService } from './dynamic-commission.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../../shared/enums';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly orgsService: OrganizationsService,
    private readonly rankingService: RankingService,
    private readonly providerStatsService: ProviderStatsService,
    private readonly commissionService: DynamicCommissionService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List organizations' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sort', required: false, description: 'rank or rating' })
  list(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
  ) {
    return this.orgsService.list({
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      sort: sort || 'rank',
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER_OWNER, UserRole.ADMIN)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create organization' })
  create(@Req() req: any, @Body() dto: any) {
    return this.orgsService.create(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my organizations' })
  myOrganizations(@Req() req: any) {
    return this.orgsService.myOrganizations(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  getById(@Param('id') id: string) {
    return this.orgsService.getById(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get provider stats for organization' })
  getStats(@Param('id') id: string) {
    return this.orgsService.getProviderStats(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update organization' })
  update(@Param('id') id: string, @Req() req: any, @Body() dto: any) {
    return this.orgsService.update(id, req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/boost')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate boost for organization (admin)' })
  activateBoost(
    @Param('id') id: string,
    @Body() dto: { durationDays?: number; multiplier?: number },
  ) {
    return this.rankingService.activateBoost(id, dto.durationDays, dto.multiplier);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/boost/deactivate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate boost for organization (admin)' })
  deactivateBoost(@Param('id') id: string) {
    return this.rankingService.deactivateBoost(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('ranking/recalculate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Recalculate all organization ranks (admin)' })
  async recalculateRanks() {
    const count = await this.rankingService.recalculateAllRanks();
    return { recalculated: count };
  }

  // ═══════ PROVIDER PRESSURE API ═══════

  /**
   * GET /organizations/:id/pressure
   * Full pressure stats for provider dashboard
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id/pressure')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get provider pressure stats' })
  getProviderPressure(@Param('id') id: string) {
    return this.providerStatsService.getProviderPressureStats(id);
  }

  /**
   * GET /organizations/:id/commission
   * Commission breakdown with tips
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id/commission')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get commission breakdown' })
  getCommission(@Param('id') id: string) {
    return this.commissionService.calculateCommissionRate(id);
  }

  /**
   * GET /organizations/boost/plans
   * Available boost plans
   */
  @Get('boost/plans')
  @ApiOperation({ summary: 'Get available boost plans' })
  getBoostPlans() {
    return this.providerStatsService.getBoostPlans();
  }

  /**
   * POST /organizations/:id/boost/activate
   * Activate boost for provider
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER_OWNER, UserRole.ADMIN)
  @Post(':id/boost/activate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate boost plan' })
  activateBoostPlan(
    @Param('id') id: string,
    @Body() dto: { planId: string },
  ) {
    return this.providerStatsService.activateBoost(id, dto.planId);
  }
}
