import nodemailer from 'nodemailer';
import { getConfig } from '../config';

const { email } = getConfig();
export const transporter = nodemailer.createTransport({
  host: email.smtp_host,
  port: email.smtp_port,
  secure: email.smtp_secure,
  auth: {
    user: email.smtp_user,
    pass: email.smtp_pass,
  },
});
