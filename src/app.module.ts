import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
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
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get<string>('NODE_ENV') === 'production';
        return {
          type: 'postgres' as const,
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: Number(configService.get<string>('DB_PORT', '5432')),
          username: configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', 'root'),
          database: configService.get<string>('DB_NAME', 'orga_structure'),
          entities: [],
          synchronize: !isProduction, // Disable in production
          autoLoadEntities: true,
          logging: !isProduction ? ['query', 'error'] : ['error'], // Detailed logs in dev, errors only in prod
        };
      },
    }),
    OrgChartModule,
  ],
})
export class AppModule {}
