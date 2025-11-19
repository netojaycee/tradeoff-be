import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './entities/audit-log.entity';
import { AuditAction } from '../../common/enums/audit.enum';
import { DeviceInfo } from '../../common/interfaces/common.interface';

interface LogParams {
  action: AuditAction | string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  description: string;
  metadata?: Record<string, any>;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  deviceInfo: DeviceInfo;
  endpoint?: string;
  httpMethod?: string;
  statusCode?: number;
  responseTime?: number;
  riskLevel?: string;
  suspicious?: boolean;
  flags?: string[];
  sessionId?: string;
  requestId?: string;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(params: LogParams): Promise<void> {
    try {
      const auditLog = new this.auditLogModel({
        action: params.action,
        userId: params.userId,
        userEmail: params.userEmail,
        userRole: params.userRole,
        entityType: params.entityType,
        entityId: params.entityId,
        entityName: params.entityName,
        description: params.description,
        metadata: params.metadata,
        previousValues: params.previousValues,
        newValues: params.newValues,
        ipAddress: params.deviceInfo.ip,
        userAgent: params.deviceInfo.userAgent,
        deviceType: params.deviceInfo.deviceType,
        browser: params.deviceInfo.browser,
        operatingSystem: params.deviceInfo.os,
        location: params.deviceInfo.location,
        endpoint: params.endpoint,
        httpMethod: params.httpMethod,
        statusCode: params.statusCode,
        responseTime: params.responseTime,
        riskLevel: params.riskLevel || 'low',
        suspicious: params.suspicious || false,
        flags: params.flags,
        sessionId: params.sessionId,
        requestId: params.requestId,
      });

      await auditLog.save();
    } catch (error) {
      // Log audit failures but don't throw to avoid breaking main functionality
      console.error('Failed to save audit log:', error);
    }
  }

  async findByUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ logs: AuditLogDocument[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.auditLogModel
        .find({ userId })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.auditLogModel.countDocuments({ userId }),
    ]);

    return {
      logs,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async findSuspiciousActivity(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ logs: AuditLogDocument[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.auditLogModel
        .find({ suspicious: true })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.auditLogModel.countDocuments({ suspicious: true }),
    ]);

    return {
      logs,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async findByAction(
    action: AuditAction | string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ logs: AuditLogDocument[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.auditLogModel
        .find({ action })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.auditLogModel.countDocuments({ action }),
    ]);

    return {
      logs,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async getStatistics(): Promise<any> {
    const [totalLogs, suspiciousLogs, recentLogs, topActions, topIpAddresses] =
      await Promise.all([
        this.auditLogModel.countDocuments(),
        this.auditLogModel.countDocuments({ suspicious: true }),
        this.auditLogModel.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        }),
        this.auditLogModel.aggregate([
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        this.auditLogModel.aggregate([
          { $group: { _id: '$ipAddress', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
      ]);

    return {
      totalLogs,
      suspiciousLogs,
      recentLogs,
      topActions,
      topIpAddresses,
    };
  }
}
