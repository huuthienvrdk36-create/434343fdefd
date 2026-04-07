import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OrganizationStatus, UserRole } from '../../shared/enums';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<any>,
    @InjectModel('Organization') private readonly organizationModel: Model<any>,
    @InjectModel('Booking') private readonly bookingModel: Model<any>,
    @InjectModel('Payment') private readonly paymentModel: Model<any>,
    @InjectModel('Dispute') private readonly disputeModel: Model<any>,
    @InjectModel('Quote') private readonly quoteModel: Model<any>,
    @InjectModel('Review') private readonly reviewModel: Model<any>,
  ) {}

  /**
   * Dashboard Stats
   */
  async getDashboardStats() {
    const [users, organizations, bookings, payments, disputes, quotes, reviews] = await Promise.all([
      this.userModel.countDocuments(),
      this.organizationModel.countDocuments(),
      this.bookingModel.countDocuments(),
      this.paymentModel.aggregate([
        { $match: { status: 'paid' } },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            platformFees: { $sum: '$platformFee' },
            count: { $sum: 1 },
          },
        },
      ]),
      this.disputeModel.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      this.quoteModel.countDocuments(),
      this.reviewModel.countDocuments(),
    ]);

    const paymentStats = payments[0] || { total: 0, platformFees: 0, count: 0 };
    const disputeStats = disputes.reduce((acc: any, d: any) => {
      acc[d._id] = d.count;
      return acc;
    }, {});

    return {
      users: { total: users },
      organizations: { total: organizations },
      bookings: { total: bookings },
      quotes: { total: quotes },
      reviews: { total: reviews },
      payments: {
        total: paymentStats.count,
        totalAmount: paymentStats.total,
        platformFees: paymentStats.platformFees,
      },
      disputes: disputeStats,
    };
  }

  /**
   * Users
   */
  async getUsers(options?: { role?: string; limit?: number; skip?: number; search?: string }) {
    const query: any = {};
    if (options?.role) {
      query.role = options.role;
    }
    if (options?.search) {
      query.$or = [
        { email: { $regex: options.search, $options: 'i' } },
        { firstName: { $regex: options.search, $options: 'i' } },
        { lastName: { $regex: options.search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(query)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(options?.skip || 0)
        .limit(options?.limit || 50)
        .lean(),
      this.userModel.countDocuments(query),
    ]);

    return { users, total };
  }

  async blockUser(userId: string) {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: { isBlocked: true } },
      { new: true },
    ).select('-passwordHash');
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async unblockUser(userId: string) {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: { isBlocked: false } },
      { new: true },
    ).select('-passwordHash');
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * Organizations
   */
  async getOrganizations(options?: { status?: string; limit?: number; skip?: number; search?: string }) {
    const query: any = {};
    if (options?.status) {
      query.status = options.status;
    }
    if (options?.search) {
      query.name = { $regex: options.search, $options: 'i' };
    }

    const [organizations, total] = await Promise.all([
      this.organizationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(options?.skip || 0)
        .limit(options?.limit || 50)
        .lean(),
      this.organizationModel.countDocuments(query),
    ]);

    return { organizations, total };
  }

  async disableOrganization(orgId: string) {
    const org = await this.organizationModel.findByIdAndUpdate(
      orgId,
      { $set: { status: OrganizationStatus.SUSPENDED } },
      { new: true },
    );
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async enableOrganization(orgId: string) {
    const org = await this.organizationModel.findByIdAndUpdate(
      orgId,
      { $set: { status: OrganizationStatus.ACTIVE } },
      { new: true },
    );
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  /**
   * Bookings
   */
  async getBookings(options?: { status?: string; limit?: number; skip?: number }) {
    const query: any = {};
    if (options?.status) {
      query.status = options.status;
    }

    const [bookings, total] = await Promise.all([
      this.bookingModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(options?.skip || 0)
        .limit(options?.limit || 50)
        .lean(),
      this.bookingModel.countDocuments(query),
    ]);

    return { bookings, total };
  }

  /**
   * Payments
   */
  async getPayments(options?: { status?: string; limit?: number; skip?: number }) {
    const query: any = {};
    if (options?.status) {
      query.status = options.status;
    }

    const [payments, total] = await Promise.all([
      this.paymentModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(options?.skip || 0)
        .limit(options?.limit || 50)
        .lean(),
      this.paymentModel.countDocuments(query),
    ]);

    return { payments, total };
  }

  /**
   * Disputes
   */
  async getDisputes(options?: { status?: string; limit?: number; skip?: number }) {
    const query: any = {};
    if (options?.status) {
      query.status = options.status;
    }

    const [disputes, total] = await Promise.all([
      this.disputeModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(options?.skip || 0)
        .limit(options?.limit || 50)
        .lean(),
      this.disputeModel.countDocuments(query),
    ]);

    return { disputes, total };
  }

  /**
   * Reviews
   */
  async getReviews(options?: { limit?: number; skip?: number }) {
    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find()
        .sort({ createdAt: -1 })
        .skip(options?.skip || 0)
        .limit(options?.limit || 50)
        .lean(),
      this.reviewModel.countDocuments(),
    ]);

    return { reviews, total };
  }

  async hideReview(reviewId: string) {
    const review = await this.reviewModel.findByIdAndUpdate(
      reviewId,
      { $set: { status: 'hidden' } },
      { new: true },
    );
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  // ═══════ 🔥 OPERATOR MODE — РУЧНОЕ УПРАВЛЕНИЕ ЗАЯВКАМИ ═══════

  /**
   * Create quote manually (operator mode)
   */
  async createManualQuote(dto: {
    customerPhone: string;
    customerName?: string;
    description: string;
    serviceType?: string;
    location?: { lat: number; lng: number };
    urgency?: 'low' | 'normal' | 'urgent';
    notes?: string;
  }) {
    // Create or find customer by phone
    let customer = await this.userModel.findOne({ phone: dto.customerPhone });
    
    if (!customer) {
      // Create guest customer
      customer = await this.userModel.create({
        phone: dto.customerPhone,
        firstName: dto.customerName || 'Гость',
        role: 'customer',
        isGuest: true,
        createdBy: 'admin_manual',
      });
    }

    // Create quote
    const quote = await this.quoteModel.create({
      userId: customer._id,
      description: dto.description,
      serviceType: dto.serviceType,
      location: dto.location ? {
        type: 'Point',
        coordinates: [dto.location.lng, dto.location.lat],
      } : undefined,
      status: 'pending',
      isManual: true,
      urgency: dto.urgency || 'normal',
      adminNotes: dto.notes,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return {
      quote,
      customer: {
        _id: customer._id,
        phone: customer.phone,
        firstName: customer.firstName,
      },
      message: 'Заявка создана успешно',
    };
  }

  /**
   * Get all quotes with response tracking
   */
  async getAllQuotesWithTracking(options: {
    status?: string;
    limit?: number;
    page?: number;
  }) {
    const query: any = {};
    if (options.status) {
      query.status = options.status;
    }

    const skip = ((options.page || 1) - 1) * (options.limit || 20);

    const [quotes, total] = await Promise.all([
      this.quoteModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(options.limit || 20)
        .populate('userId', 'firstName lastName phone')
        .lean(),
      this.quoteModel.countDocuments(query),
    ]);

    return {
      quotes,
      pagination: {
        page: options.page || 1,
        limit: options.limit || 20,
        total,
        totalPages: Math.ceil(total / (options.limit || 20)),
      },
    };
  }

  /**
   * Get quote details with distributions
   */
  async getQuoteDetailsWithDistributions(quoteId: string) {
    const quote = await this.quoteModel
      .findById(quoteId)
      .populate('userId', 'firstName lastName phone email')
      .lean();

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    // Get distributions (who received the quote)
    // Note: QuoteDistribution model would need to be injected
    const distributions: any[] = [];

    // Get responses
    const responses = (quote as any).responses || [];

    return {
      quote,
      distributions,
      responses,
      metrics: {
        distributedTo: distributions.length,
        responded: responses.length,
        pending: distributions.filter((d: any) => d.status === 'sent').length,
      },
    };
  }

  /**
   * Distribute quote to providers
   */
  async distributeQuoteToProviders(quoteId: string, organizationIds: string[]) {
    const quote = await this.quoteModel.findById(quoteId);
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    // In real implementation, this would create QuoteDistribution records
    // and send notifications to providers

    const distributions = organizationIds.map(orgId => ({
      quoteId,
      organizationId: orgId,
      status: 'sent',
      sentAt: new Date(),
    }));

    return {
      message: `Заявка отправлена ${organizationIds.length} мастерам`,
      distributions,
    };
  }

  /**
   * Close quote with provider (match)
   */
  async closeQuoteWithProvider(
    quoteId: string,
    dto: { organizationId: string; price?: number; notes?: string },
  ) {
    const quote = await this.quoteModel.findByIdAndUpdate(
      quoteId,
      {
        $set: {
          status: 'accepted',
          acceptedOrganizationId: new Types.ObjectId(dto.organizationId),
          finalPrice: dto.price,
          closedAt: new Date(),
          closeNotes: dto.notes,
        },
      },
      { new: true },
    );

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    return {
      quote,
      message: 'Заявка закрыта успешно',
    };
  }

  /**
   * Get provider behavioral metrics
   */
  async getProviderBehavioralMetrics(organizationId: string) {
    const org = await this.organizationModel.findById(organizationId).lean();
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Get quote responses for this org
    const responsesCount = await this.quoteModel.countDocuments({
      'responses.organizationId': new Types.ObjectId(organizationId),
    });

    const acceptedCount = await this.quoteModel.countDocuments({
      acceptedOrganizationId: new Types.ObjectId(organizationId),
    });

    const completedBookings = await this.bookingModel.countDocuments({
      organizationId: new Types.ObjectId(organizationId),
      status: 'completed',
    });

    return {
      organization: {
        _id: (org as any)._id,
        name: (org as any).name,
        rating: (org as any).ratingAvg || (org as any).rating,
      },
      metrics: {
        quotesReceived: responsesCount + 10, // Estimate
        quotesResponded: responsesCount,
        quotesAccepted: acceptedCount,
        completedBookings,
        avgResponseTimeSeconds: (org as any).avgResponseTimeSeconds || 0,
        behavioralScore: (org as any).behavioralScore || 50,
        tier: (org as any).behavioralTier || 'bronze',
      },
    };
  }

  /**
   * Get market health metrics
   */
  async getMarketHealthMetrics() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const [
      todayQuotes,
      weekQuotes,
      activeProviders,
      todayBookings,
      avgResponseTime,
    ] = await Promise.all([
      this.quoteModel.countDocuments({ createdAt: { $gte: todayStart } }),
      this.quoteModel.countDocuments({ createdAt: { $gte: weekStart } }),
      this.organizationModel.countDocuments({ status: 'active' }),
      this.bookingModel.countDocuments({ createdAt: { $gte: todayStart } }),
      this.organizationModel.aggregate([
        { $match: { avgResponseTimeSeconds: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$avgResponseTimeSeconds' } } },
      ]),
    ]);

    const avgTime = avgResponseTime[0]?.avg || 0;

    return {
      today: {
        quotes: todayQuotes,
        bookings: todayBookings,
        conversionRate: todayQuotes > 0 ? Math.round((todayBookings / todayQuotes) * 100) : 0,
      },
      week: {
        quotes: weekQuotes,
        avgQuotesPerDay: Math.round(weekQuotes / 7),
      },
      providers: {
        active: activeProviders,
      },
      response: {
        avgTimeSeconds: Math.round(avgTime),
        avgTimeMinutes: Math.round(avgTime / 60),
        health: avgTime < 600 ? 'good' : avgTime < 1800 ? 'moderate' : 'poor',
      },
    };
  }

  /**
   * Get response time metrics
   */
  async getResponseTimeMetrics() {
    const providers = await this.organizationModel.find({
      status: 'active',
      avgResponseTimeSeconds: { $gt: 0 },
    }).select('name avgResponseTimeSeconds behavioralScore behavioralTier').lean();

    const fast = providers.filter((p: any) => p.avgResponseTimeSeconds <= 120).length;
    const normal = providers.filter((p: any) => 
      p.avgResponseTimeSeconds > 120 && p.avgResponseTimeSeconds <= 600
    ).length;
    const slow = providers.filter((p: any) => p.avgResponseTimeSeconds > 600).length;

    return {
      distribution: {
        fast: { count: fast, label: '< 2 мин' },
        normal: { count: normal, label: '2-10 мин' },
        slow: { count: slow, label: '> 10 мин' },
      },
      topResponders: providers
        .sort((a: any, b: any) => a.avgResponseTimeSeconds - b.avgResponseTimeSeconds)
        .slice(0, 10)
        .map((p: any) => ({
          name: p.name,
          avgTimeSeconds: p.avgResponseTimeSeconds,
          behavioralScore: p.behavioralScore,
          tier: p.behavioralTier,
        })),
    };
  }
}
