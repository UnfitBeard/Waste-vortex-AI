import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';

export interface ContaminationNotificationData {
  wasteType: string;
  location: string;
  score: number;
  label: string;
  detectedAt: Date;
  imageUrl?: string;
}

@Injectable()
export class ContaminationNotificationService {
  private driverEmails: Record<string, string>;

  constructor(
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {
    this.loadDriverEmails();
  }

  private loadDriverEmails() {
    this.driverEmails = {
      plastic: this.configService.get<string>('DRIVER_EMAIL_PLASTIC') || 'felixkerich@yahoo.com',
      paper: this.configService.get<string>('DRIVER_EMAIL_PAPER') || 'felixkerich@yahoo.com',
      glass: this.configService.get<string>('DRIVER_EMAIL_GLASS') || 'felixkerich@yahoo.com',
      metal: this.configService.get<string>('DRIVER_EMAIL_METAL') || 'felixkerich@yahoo.com',
      organic: this.configService.get<string>('DRIVER_EMAIL_ORGANIC') || 'felixkerich@yahoo.com',
      // Add more waste types as needed
    };
  }

  private getDriverEmail(wasteType: string): string {
    const normalizedType = wasteType.toLowerCase();
    const defaultEmail = this.configService.get<string>('DEFAULT_DRIVER_EMAIL');
    if (!defaultEmail) {
      throw new Error('DEFAULT_DRIVER_EMAIL is not configured');
    }
    return this.driverEmails[normalizedType] || defaultEmail;
  }

  private optimizeCloudinaryUrl(imageUrl: string): string {
    try {
      // If it's already a Cloudinary URL, add optimization parameters
      if (imageUrl.includes('res.cloudinary.com')) {
        // Remove any existing transformations
        const baseUrl = imageUrl.split('/').slice(0, 7).join('/');
        const publicIdWithExtension = imageUrl.split('/').slice(7).join('/').split('?')[0];
        
        // Add Cloudinary transformations for better email display
        return `${baseUrl}/c_limit,w_800,h_600,f_auto,q_auto/${publicIdWithExtension}`;
      }
      return imageUrl;
    } catch (e) {
      console.error('Error optimizing Cloudinary URL:', e);
      return imageUrl;
    }
  }

  async sendContaminationAlert(notificationData: ContaminationNotificationData): Promise<void> {
    const { wasteType, location, score, label, detectedAt, imageUrl } = notificationData;
    
    try {
      const driverEmail = this.getDriverEmail(wasteType);
      const formattedDate = detectedAt.toLocaleString();
      
      // Get the dashboard URL from config or use a default
      const dashboardBaseUrl = this.configService.get<string>('DASHBOARD_URL') || 'http://localhost:3000';
      const dashboardUrl = `${dashboardBaseUrl}/dashboard`; // Adjust the path as needed
      
      const emailContext: Record<string, any> = {
        wasteType,
        location,
        score: (score * 100).toFixed(2) + '%',
        label,
        detectedAt: formattedDate,
        currentYear: new Date().getFullYear(),
        dashboardUrl,
      };

      // Add optimized image URL to context if it exists
      if (imageUrl) {
        emailContext.imageUrl = this.optimizeCloudinaryUrl(imageUrl);
      }
      
      await this.mailService.sendEmail({
        to: driverEmail,
        subject: `Contamination Alert - ${wasteType.toUpperCase()} Waste`,
        template: 'contamination-alert',
        context: emailContext,
      });
    } catch (error) {
      console.error('Failed to send contamination alert:', error);
      throw new Error(`Failed to send contamination notification: ${error.message}`);
    }
  }
}
