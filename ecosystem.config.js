module.exports = {
  apps: [{
    name: 'kaira-backend',
    script: 'server.js',
    // Optional: If your app is not in /home/backonyxia, change this path.
    cwd: '/home/backonyxia',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5001,
      // This is the MongoDB URI from your server.js. Keep it here or manage it securely.
      MONGODB_URI: 'mongodb+srv://xavihachem:sahara1000@Onyxia.z28fcca.mongodb.net/hamzashop?retryWrites=true&w=majority'
    }
  }]
};
