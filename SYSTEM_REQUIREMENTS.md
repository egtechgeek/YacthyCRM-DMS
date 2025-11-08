# YachtCRM-DMS System Requirements

This document outlines the recommended and minimum system requirements for running YachtCRM-DMS smoothly.

---

## Server Requirements

### Minimum Specifications
- **CPU:** 2 cores / 2 vCPUs
- **RAM:** 4 GB
- **Storage:** 20 GB SSD
- **Bandwidth:** 100 GB/month

### Recommended Specifications
- **CPU:** 4 cores / 4 vCPUs
- **RAM:** 8 GB
- **Storage:** 40 GB SSD (NVMe preferred)
- **Bandwidth:** Unmetered or 500 GB/month

### Production/High-Traffic Specifications
- **CPU:** 8+ cores / 8+ vCPUs
- **RAM:** 16 GB+
- **Storage:** 100 GB+ SSD NVMe
- **Bandwidth:** Unmetered
- **Load Balancer:** Optional (for high availability)

---

## Software Requirements

### Operating System (Linux - Recommended)
- **Ubuntu:** 20.04 LTS or 22.04 LTS (Recommended)
- **Debian:** 11 or 12
- **CentOS:** 8+ or Rocky Linux 8+
- **AlmaLinux:** 8+

### Operating System (Windows - Supported)
- **Windows Server:** 2019 or 2022
- **Windows 10/11:** Pro or Enterprise (for development)

### Web Server
**Linux:**
- Apache 2.4+ with mod_rewrite, mod_headers (Recommended)
- OR Nginx 1.18+

**Windows:**
- IIS 10+ with URL Rewrite module
- OR Apache 2.4+ (via XAMPP/WAMP)

### PHP
- **Version:** 8.1, 8.2, or 8.3 (8.2 recommended)
- **Required Extensions:**
  - OpenSSL
  - PDO (with MySQL/MariaDB driver)
  - Mbstring
  - Tokenizer
  - XML
  - Ctype
  - JSON
  - BCMath
  - Fileinfo
  - GD or Imagick (for image manipulation)
  - Zip
  - Curl
  
**Recommended php.ini settings:**
```ini
memory_limit = 256M          ; Minimum, 512M recommended
max_execution_time = 300     ; 5 minutes
upload_max_filesize = 20M
post_max_size = 20M
max_input_vars = 3000
```

### Database
- **MySQL:** 8.0+ (Recommended)
- **MariaDB:** 10.6+ (Also recommended)
- **PostgreSQL:** 13+ (Supported but not tested)

**Recommended Database Settings:**
```ini
innodb_buffer_pool_size = 1G    ; For 4GB RAM server
max_connections = 150
query_cache_size = 64M
innodb_log_file_size = 256M
```

### Node.js & npm
- **Node.js:** 18.x LTS or 20.x LTS (for building frontend)
- **npm:** 9.x or 10.x

**Note:** Node.js is only required for building the frontend. After building, the application runs entirely on PHP.

### Composer
- **Version:** 2.5+

### Additional Tools
- **Git:** For version control and updates (optional but recommended)
- **Supervisor:** For queue workers (optional, for email/background jobs)

---

## Browser Requirements (Client-Side)

### Supported Browsers
- **Chrome:** 100+ (Recommended)
- **Firefox:** 100+
- **Safari:** 15+
- **Edge:** 100+
- **Opera:** 85+

### Not Supported
- Internet Explorer (all versions)
- Browsers with JavaScript disabled

---

## Network Requirements

### Ports
- **HTTP:** 80 (will redirect to HTTPS)
- **HTTPS:** 443 (Required)
- **SSH:** 22 (for server management)
- **MySQL:** 3306 (local access only, not exposed)

### Firewall Rules
- Allow inbound: 80, 443
- Allow outbound: 80, 443, 25 (SMTP), 587 (SMTP TLS)
- Block: 3306 (except localhost)

### External Services (Optional)
If using payment integrations:
- **Stripe API:** api.stripe.com (port 443)
- **Square API:** connect.squareup.com (port 443)

---

## Performance Considerations

### For 1-10 Concurrent Users
- Minimum specs will suffice
- 4 GB RAM, 2 CPU cores

### For 10-50 Concurrent Users
- Recommended specs
- 8 GB RAM, 4 CPU cores
- Consider Redis for caching

### For 50+ Concurrent Users
- Production specs
- 16 GB+ RAM, 8+ CPU cores
- Redis for sessions and cache
- CDN for static assets
- Database optimization (indexing, query caching)
- Consider horizontal scaling

---

## Storage Requirements

### Database Size Estimates
- **Small organization (< 1000 records):** 100 MB
- **Medium organization (1000-10,000 records):** 500 MB - 2 GB
- **Large organization (10,000+ records):** 2 GB - 10 GB+

### File Storage
- **PDF Invoices/Quotes:** ~50-200 KB per document
- **Vehicle/Yacht Documents:** Variable (user uploads)
- **Logos/Images:** ~1-5 MB total
- **Email Logs:** ~1 KB per email

**Example Total Storage:**
- 5,000 invoices × 100 KB = 500 MB
- 1,000 documents × 500 KB = 500 MB
- Database: 1 GB
- **Total:** ~2-3 GB (leave 10x headroom = 20-30 GB)

---

## Caching & Optimization

### Recommended Caching Strategy

**Development:**
```env
CACHE_DRIVER=file
SESSION_DRIVER=file
```

**Production (Small):**
```env
CACHE_DRIVER=database
SESSION_DRIVER=database
```

**Production (Medium/Large):**
```env
CACHE_DRIVER=redis
SESSION_DRIVER=redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
```

### OpCache (PHP)
Enable OPcache for production:
```ini
opcache.enable=1
opcache.memory_consumption=256
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0  ; In production
```

---

## Monitoring Recommendations

### Server Monitoring
- **CPU Usage:** Should average < 60%
- **RAM Usage:** Should stay < 80%
- **Disk I/O:** Monitor for bottlenecks
- **Disk Space:** Alert when > 80% full

### Application Monitoring
- **Response Time:** < 500ms for most pages
- **Database Queries:** Monitor slow queries (> 1s)
- **Error Logs:** Check Laravel logs daily

### Tools
- **Linux:** htop, iotop, netdata, Grafana
- **Plesk:** Built-in monitoring
- **Laravel:** Laravel Telescope (dev), Laravel Horizon (queues)

---

## Scaling Strategies

### Vertical Scaling (Single Server)
1. Increase RAM (easiest)
2. Add CPU cores
3. Upgrade to faster SSD (NVMe)
4. Enable Redis caching

### Horizontal Scaling (Multiple Servers)
1. **Load Balancer** → Multiple app servers
2. **Separate Database Server** (MySQL on dedicated server)
3. **Redis Server** (separate for caching/sessions)
4. **File Storage:** NFS or object storage (S3, Spaces)
5. **CDN:** For static assets

---

## Backup Requirements

### Minimum Backup Storage
- **Full Backup:** 2x application size
- **Incremental:** 0.5x per day × 7 days

### Backup Schedule
- **Daily:** Database (automated)
- **Weekly:** Full file backup
- **Monthly:** Archived backups (keep 12 months)

---

## Development Environment

### Local Development
- **RAM:** 4 GB minimum
- **Storage:** 10 GB
- **OS:** Windows, macOS, or Linux

### Recommended Local Setup
- **Docker:** Use Laravel Sail
- **OR XAMPP/WAMP/MAMP:** For Windows/Mac
- **OR Valet:** For macOS
- **OR Homestead:** Laravel's official Vagrant box

---

## Third-Party Service Requirements (Optional)

### Email Sending
- **SMTP Server** or
- **Email Service:** SendGrid, Mailgun, Amazon SES
- **Port:** 587 (TLS) or 465 (SSL)

### Payment Processing (Optional)
- **Stripe Account** (for credit card processing)
- **Square Account** (alternative payment processor)

### SSL Certificate
- **Let's Encrypt:** Free (Recommended)
- **Commercial SSL:** Optional

---

## Estimated Costs

### Hosting (Linux VPS)
- **Shared Hosting:** $5-15/month (not recommended for production)
- **VPS (Recommended specs):** $20-40/month
  - DigitalOcean, Linode, Vultr: $24/month (4GB RAM, 2 CPU)
  - Hetzner: €9/month (8GB RAM, 2 CPU)
- **Managed Hosting:** $50-200/month
  - Ploi.io, Forge, Cloudways
- **Dedicated Server:** $100+/month

### Additional Costs
- **Domain:** $10-15/year
- **SSL Certificate:** $0 (Let's Encrypt) or $50-200/year
- **Email Service:** $0-50/month (depends on volume)
- **Backups:** $5-20/month (depends on storage)
- **Payment Processing:** 2.9% + $0.30 per transaction (Stripe/Square)

---

## Quick Reference

| Component | Minimum | Recommended | Production |
|-----------|---------|-------------|------------|
| CPU | 2 cores | 4 cores | 8+ cores |
| RAM | 4 GB | 8 GB | 16+ GB |
| Storage | 20 GB | 40 GB | 100+ GB |
| PHP | 8.1 | 8.2 | 8.2+ |
| MySQL | 8.0 | 8.0 | 8.0+ |
| Node.js | 18 LTS | 20 LTS | 20 LTS |

---

## Performance Benchmarks

**Expected Performance (Recommended Specs):**
- **Page Load Time:** < 500ms
- **API Response Time:** < 200ms
- **Concurrent Users:** 20-30
- **Database Queries/sec:** 500+
- **PDF Generation:** < 2 seconds per document

**Optimization Tips:**
- Enable OpCache
- Use Redis for caching
- Enable GZIP compression
- Optimize database indexes
- Use CDN for static assets (optional)

