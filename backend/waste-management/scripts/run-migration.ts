import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { updateUsersEmailVerification } from '../src/migrations/update-users-email-verification';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const connection = app.get('DatabaseConnection');
  
  try {
    await updateUsersEmailVerification(connection);
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

bootstrap();
