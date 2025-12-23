// Configuración de PM2 para producción
// Uso: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'erika-backend',
      script: './server/index.js',
      instances: 1,
      exec_mode: 'cluster',
      
      // Variables de entorno
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      
      // Logs
      error_file: './logs/error.log',
      out_file: './logs/output.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto-restart
      watch: false,
      max_memory_restart: '500M',
      
      // Gestión de errores
      min_uptime: '10s',
      max_restarts: 10,
      autorestart: true,
      
      // Configuración de cluster
      instance_var: 'INSTANCE_ID'
    }
  ]
};