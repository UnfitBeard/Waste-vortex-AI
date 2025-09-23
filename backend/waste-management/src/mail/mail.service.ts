import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as path from 'path';
import * as fs from 'fs';
import * as handlebars from 'handlebars';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private templatesDir: string;

  constructor(private config: ConfigService) {
    this.templatesDir = path.join(__dirname, 'templates');
    
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST'),
      port: this.config.get('SMTP_PORT'),
      secure: this.config.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASSWORD'),
      },
    });
  }

  private async loadTemplate(templateName: string, context: any = {}): Promise<string> {
    // First try the direct path (for development)
    let templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
    
    // If not found, try the dist directory (for production)
    if (!fs.existsSync(templatePath)) {
      templatePath = path.join(process.cwd(), 'dist', 'src', 'mail', 'templates', `${templateName}.hbs`);
    }
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templateName}.hbs`);
    }
    
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);
    return template(context);
  }

  async sendPasswordResetLink(email: string, resetUrl: string): Promise<void> {
    const html = await this.loadTemplate('password-reset', { resetUrl });
    
    await this.transporter.sendMail({
      from: this.config.get('MAIL_FROM'),
      to: email,
      subject: 'Password Reset Request',
      html,
    });
  }

  async sendEmailVerification(email: string, verificationUrl: string): Promise<void> {
    const html = await this.loadTemplate('email-verification', { verificationUrl });
    
    await this.transporter.sendMail({
      from: this.config.get('MAIL_FROM'),
      to: email,
      subject: 'Verify Your Email',
      html,
    });
  }
}
