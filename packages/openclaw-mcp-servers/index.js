const data = require('./servers.json');

module.exports = {
  servers: data.mcpServers,
  config: () => {
    const config = { mcpServers: {} };
    for (const [key, val] of Object.entries(data.mcpServers)) {
      config.mcpServers[key] = { url: val.url };
    }
    return config;
  },
  x402: data.x402,
  pricing: data.pricing,
  totalTools: data.totalTools,
};
