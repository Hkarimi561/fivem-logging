const net = require('net');
const { URL } = require('url');

function waitTcp(host, port, { timeoutMs = 120000, label } = {}) {
  const start = Date.now();
  const tag = label || `${host}:${port}`;
  return new Promise((resolve, reject) => {
    function attempt() {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timeout waiting for ${tag}`));
        return;
      }
      const socket = net.connect({ host, port }, () => {
        socket.end();
        resolve();
      });
      socket.on('error', () => {
        socket.destroy();
        setTimeout(attempt, 2000);
      });
    }
    attempt();
  });
}

async function main() {
  const esNode = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
  const u = new URL(esNode);
  const esPort = u.port ? parseInt(u.port, 10) : 9200;
  await waitTcp(u.hostname, esPort, { label: 'Elasticsearch' });
  console.log('[wait-for] Elasticsearch TCP is up');

  const mysqlHost = process.env.MYSQL_HOST || 'localhost';
  const mysqlPort = parseInt(process.env.MYSQL_PORT || '3306', 10);
  await waitTcp(mysqlHost, mysqlPort, { label: 'MySQL' });
  console.log('[wait-for] MySQL TCP is up');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
