/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';
import axios, { AxiosInstance } from 'axios';
import { ContaminationNotificationService } from '../notifications/contamination-notification.service';

@Injectable()
export class ContaminationClient {
  private http: AxiosInstance;

  constructor(
    private readonly config: ConfigService,
    @Inject(ContaminationNotificationService)
    private readonly notificationService: ContaminationNotificationService,
  ) {
    this.http = axios.create({
      baseURL: this.config.get<string>('CONTAMINATION_API_URL'),
      timeout: 10000,
      headers: this.config.get<string>('CONTAMINATION_API_URL')
        ? {
            Authorization: `Bearer ${this.config.get<string>('CONTAMINATION_API_URL')}`,
          }
        : {},
    });
  }
  async scoreImageByUrl(imageUrl: string, wasteType: string, location: string) {
    const { data } = await this.http.post('', { imageUrl });

    const score =
      data.score ?? data.contamination_score ?? data.prediction ?? 0;
    const label = data.label ?? data.class ?? 'unknown';

    // Send notification if contamination is detected
    if (score > 0.3) {
      // Threshold can be adjusted
      await this.notificationService.sendContaminationAlert({
        wasteType,
        location,
        score: Number(score),
        label,
        detectedAt: new Date(),
        imageUrl,
      });
    }

    return { score: Number(score), label };
  }

  async scoreByBuffer(
    buffer: Buffer,
    filename: string,
    wasteType: string,
    location: string,
  ) {
    const form = new FormData();
    form.append('file', buffer, { filename });
    const { data } = await this.http.post('', form, {
      headers: form.getHeaders(),
    });

    const score =
      data.score ?? data.contamination_score ?? data.prediction ?? 0;
    const label = data.label ?? data.class ?? 'unknown';

    // Send notification if contamination is detected
    if (score > 0.3) {
      // Threshold can be adjusted
      await this.notificationService.sendContaminationAlert({
        wasteType,
        location,
        score: Number(score),
        label,
        detectedAt: new Date(),
      });
    }

    return { score: Number(score), label };
  }
}
