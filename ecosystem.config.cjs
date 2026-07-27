module.exports = {
  apps: [{
    name: 'proj-mgmt',
    script: 'dist/server.js',
    instances: 4,              // 4 个 CPU 核心
    exec_mode: 'cluster',       // 多进程负载均衡
    max_memory_restart: '1G',   // 内存超 1G 自动重启
    max_restarts: 10,           // 短时间内最多重启 10 次
    restart_delay: 5000,        // 重启间隔 5 秒
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
  }],
};
