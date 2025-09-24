/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import FormData from 'form-data';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class ContaminationClient {
  private http: AxiosInstance;

  constructor(private readonly config: ConfigService) {
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
  async scoreImageByUrl(imageUrl: string) {
    const { data } = await this.http.post('', { imageUrl: imageUrl });

    const score =
      data.score ?? data.contamination_score ?? data.prediction ?? 0;
    const label = data.label ?? data.class ?? undefined;
    return { score: Number(score), label };
  }

  async scoreByBuffer(buffer: Buffer, filename: string) {
    const form = new FormData();
    form.append('file', buffer, { filename });
    const { data } = await this.http.post('', form, {
      headers: form.getHeaders(),
    });

    const score =
      data.score ?? data.contamination_score ?? data.prediction ?? 0;
    const label = data.label ?? data.class ?? undefined;
    return { score: Number(score), label };
  }
}
