import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GeoStatus } from '../../shared/enums';

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel('ServiceCategory') private readonly categoryModel: Model<any>,
    @InjectModel('Service') private readonly serviceModel: Model<any>,
  ) {}

  async getCategories() {
    return this.categoryModel
      .find({ status: GeoStatus.ACTIVE })
      .sort({ sortOrder: 1, name: 1 })
      .lean();
  }

  async createCategory(dto: { name: string; description?: string; icon?: string; parentId?: string; sortOrder?: number }) {
    const slug = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return this.categoryModel.create({
      ...dto,
      slug: `${slug}-${Date.now().toString(36)}`,
      status: GeoStatus.ACTIVE,
    });
  }

  async getServices(query: { categoryId?: string; search?: string }) {
    const filter: any = { status: GeoStatus.ACTIVE };
    if (query.categoryId) filter.categoryId = query.categoryId;
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    }
    return this.serviceModel.find(filter).sort({ name: 1 }).lean();
  }

  async getServiceById(id: string) {
    const service = await this.serviceModel.findById(id).lean();
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async createService(dto: any) {
    const slug = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return this.serviceModel.create({
      ...dto,
      slug: `${slug}-${Date.now().toString(36)}`,
      status: GeoStatus.ACTIVE,
    });
  }
}
