import { FROM_EMAIL } from '../../env.ts';

type Maildata = {
  from?: string;
  to: string;
  subject: string;
  body: string;
};

export class Mail {
  key: string;
  constructor(key: string) {
    this.key = key;
  }
  async send({ from, to, subject, body }: Maildata) {
    try {
      const response = await fetch('https://api.resend.com/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.key}`,
        },
        body: JSON.stringify({
          from: from || FROM_EMAIL,
          to,
          subject,
          html: body,
        }),
      });
      if (!response.ok) throw new Error();
      return { ok: true, response };
    } catch (err) {
      console.error('Error ao enviar email', err);
      return { ok: false };
    }
  }
}
