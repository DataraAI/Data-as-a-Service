# 🚀 DataraAI Deployment Guide

This guide will help you deploy your DataraAI application to your purchased domain.

## 📋 **Prerequisites**

1. **Domain**: Your purchased domain from Namecheap
2. **Server**: VPS or cloud server (DigitalOcean, Linode, AWS EC2, etc.)
3. **Server Requirements**:
   - Ubuntu 20.04+ or similar Linux distribution
   - 2GB+ RAM
   - 20GB+ storage
   - Docker and Docker Compose installed

## 🛠 **Server Setup**

### 1. Connect to Your Server
```bash
ssh root@your-server-ip
```

### 2. Install Dependencies
```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Nginx (for reverse proxy)
apt install nginx -y

# Install Node.js (for building frontend)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install nodejs -y
```

### 3. Upload Your Code
```bash
# Option A: Using Git (recommended)
git clone https://github.com/yourusername/dataraai.git
cd dataraai

# Option B: Using SCP
# scp -r /path/to/dataraai root@your-server-ip:/root/
```

## 🚀 **Deployment Options**

### **Option 1: Quick Deploy (Recommended)**
```bash
# Make deployment script executable
chmod +x deploy.sh

# Deploy to your domain
./deploy.sh your-domain.com
```

### **Option 2: Manual Deploy**
```bash
# 1. Build frontend
cd newfrontend/future-robot-trainer
npm install
npm run build
cd ../..

# 2. Update nginx configuration
nano nginx.conf
# Replace 'your-domain.com' with your actual domain

# 3. Start services
docker-compose up -d

# 4. Check status
docker-compose ps
```

## 🔧 **Configuration**

### 1. Update Domain in nginx.conf
```bash
nano nginx.conf
# Replace 'your-domain.com' with your actual domain
```

### 2. Set Environment Variables
```bash
nano .env
```
Add your configuration:
```env
FLASK_ENV=production
MONGODB_PASSWORD=your_secure_password
DOMAIN=your-domain.com
```

### 3. Configure DNS
In your Namecheap panel:
- Point your domain's A record to your server's IP address
- Add CNAME record for www pointing to your domain

## 🔒 **SSL Certificate Setup**

### Using Let's Encrypt (Free)
```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Update nginx.conf for SSL
```bash
nano nginx.conf
# Uncomment and update SSL certificate paths
```

## 📊 **Monitoring & Maintenance**

### Check Service Status
```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f

# Restart services
docker-compose restart
```

### Backup Your Data
```bash
# Backup dataset and uploads
tar -czf dataraai-backup-$(date +%Y%m%d).tar.gz dataset/ uploads/

# Backup database (if using external DB)
# Add your database backup commands here
```

## 🔄 **Updates**

### Update Application
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

## 🆘 **Troubleshooting**

### Common Issues

1. **Services not starting**
   ```bash
   docker-compose logs
   ```

2. **Port conflicts**
   ```bash
   netstat -tulpn | grep :80
   ```

3. **Permission issues**
   ```bash
   chown -R 1000:1000 dataset/ uploads/
   ```

4. **Memory issues**
   ```bash
   free -h
   # Consider upgrading server if needed
   ```

### Health Checks
```bash
# Check all services
curl http://your-domain.com/api/health
curl http://your-domain.com/robotics/
curl http://your-domain.com/
```

## 📈 **Scaling**

### For Higher Traffic
1. **Load Balancer**: Use multiple server instances
2. **CDN**: CloudFlare for static assets
3. **Database**: External MongoDB/PostgreSQL
4. **Caching**: Redis for session management

### Performance Optimization
1. **Enable Gzip**: Already configured in nginx.conf
2. **Static Assets**: Serve directly from nginx
3. **Database Indexing**: Optimize queries
4. **Monitoring**: Set up application monitoring

## 🎯 **Final Checklist**

- [ ] Domain DNS configured
- [ ] SSL certificate installed
- [ ] All services running (`docker-compose ps`)
- [ ] Health checks passing
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] Security updates applied

## 📞 **Support**

If you encounter issues:
1. Check logs: `docker-compose logs`
2. Verify DNS: `nslookup your-domain.com`
3. Test connectivity: `curl -I http://your-domain.com`
4. Check server resources: `htop`, `df -h`

---

**Your DataraAI application will be available at:**
- Main App: `https://your-domain.com`
- API: `https://your-domain.com/api`
- Robotics: `https://your-domain.com/robotics`