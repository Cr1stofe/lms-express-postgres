import { jsPDF } from 'jspdf';
import type { CertificateFullData } from '../query.ts';
import { SERVER_NAME } from '../../../env.ts';

export function generateCertificate(c: CertificateFullData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  doc.setFillColor('#000000');
  doc.rect(0, 0, width, height, 'F');
  doc.setDrawColor('#222');
  doc.setLineWidth(2);
  doc.rect(20, 20, width - 40, height - 40);
  doc.rect(30, 30, width - 60, height - 60);

  function center(
    text: string,
    y: number,
    opts: {
      size?: number;
      color?: string;
      style?: 'normal' | 'bold';
      font?: string;
    },
  ) {
    const {
      size = 16,
      color = '#fff',
      style = 'normal',
      font = 'times',
    } = opts;
    doc.setTextColor(color);
    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.text(text, width / 2, y, { align: 'center' });
  }

  center('Certificado de Conclusão', 140, { size: 48, style: 'bold' });
  center('certifico que', 200, { size: 18, color: '#bbb' });
  center(c.name, 250, { size: 36, style: 'bold' });
  center('concluiu o curso', 300, { size: 18, color: '#bbb' });
  center(c.title, 345, { size: 28, style: 'bold' });
  center(`em ${c.completed}`, 385, { size: 16, color: '#bbb' });
  center(`Carga Horária: ${c.hours * 2}h`, 440, { size: 24 });
  center(`${SERVER_NAME}/api/lms/certificate/${c.id}`, 540, {
    size: 16,
    color: '#aaa',
    font: 'courier',
  });

  return Buffer.from(doc.output('arraybuffer'));
}
