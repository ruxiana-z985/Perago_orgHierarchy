import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmModuleOptions } from '@nestjs/typeorm/dist/interfaces/typeorm-options.interface';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { OrgChartModule } from './org-chart.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ttl: Number(configService.get<number>('THROTTLE_TTL', 60)), // seconds
        limit: Number(configService.get<number>('THROTTLE_LIMIT', 100)), // requests per ttl
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const isProduction = configService.get<string>('NODE_ENV') === 'production';
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const synchronize = configService.get<string>('DB_SYNCHRONIZE') === 'true';
        const baseOptions: TypeOrmModuleOptions = {
          type: 'postgres' as const,
          entities: [],
          synchronize: isProduction ? synchronize : true,
          autoLoadEntities: true,
          logging: !isProduction ? ['query', 'error'] : ['error'], // Detailed logs in dev, errors only in prod
          retryAttempts: 10,
          retryDelay: 3000,
        };

        if (databaseUrl) {
          return {
            ...baseOptions,
            url: databaseUrl,
            ssl: isProduction ? { rejectUnauthorized: false } : false,
          };
        }

        return {
          ...baseOptions,
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: Number(configService.get<string>('DB_PORT', '5432')),
          username: configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', 'root'),
          database: configService.get<string>('DB_NAME', 'orga_structure'),
        };
      },
    }),
    OrgChartModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
