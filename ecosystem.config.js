module.exports = {
  apps: [
    {
      name: 'telegram-payment-backend',
      script: 'server.js',
      cwd: './backend',
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 4000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true
    },
    {
      name: 'telegram-bot',
      script: 'TG_Automation.py',
      cwd: './TG Bot Script',
      interpreter: 'python3',
      instances: 1,
      watch: false,
      max_memory_restart: '500M',
      env_production: {
        PYTHONPATH: '/usr/bin/python3'
      },
      error_file: './logs/bot-error.log',
      out_file: './logs/bot-out.log',
      log_file: './logs/bot-combined.log',
      time: true
    }
  ]
};