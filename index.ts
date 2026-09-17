import { app } from './app.ts';
import { prisma } from './core/prisma.ts';

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor LMS rodando com Express e PostgreSQL na porta ${PORT}`);
  console.log(`👉 http://localhost:${PORT}`);
});

function shutdown(signal: string) {
  console.log(`\nEncerrando servidor (${signal})...`);
  server.close(async () => {
    console.log('Servidor HTTP encerrado.');
    await prisma.$disconnect();
    console.log('Conexões do PostgreSQL encerradas com sucesso.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forçando encerramento após timeout.');
    process.exit(1);
  }, 5000).unref();
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
