# Captain Ellenbogen Yacht Management CRM - Backend

Laravel 10+ API backend for the Captain Ellenbogen Yacht Management CRM system.

## Requirements

- PHP 8.1 or higher
- Composer
- MySQL 5.7+ or MariaDB
- Apache with mod_rewrite (for Plesk deployment)

## Installation

1. Install dependencies:
```bash
composer install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Generate application key:
```bash
php artisan key:generate
```

4. Configure database in `.env`:
```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=yacht_crm
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

5. Run migrations:
```bash
php artisan migrate
```

6. Install Laravel Sanctum:
```bash
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
```

## Configuration

### CORS
Configure `FRONTEND_URL` in `.env` to match your React frontend URL.

### Stripe
Add your Stripe credentials to `.env`:
```
STRIPE_KEY=your_stripe_key
STRIPE_SECRET=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

### Square
Add your Square credentials to `.env`:
```
SQUARE_APPLICATION_ID=your_app_id
SQUARE_ACCESS_TOKEN=your_access_token
SQUARE_ENVIRONMENT=sandbox
SQUARE_WEBHOOK_SIGNATURE_KEY=your_webhook_key
```

### Email (SMTP)
Configure SMTP settings in `.env`:
```
MAIL_MAILER=smtp
MAIL_HOST=your_smtp_host
MAIL_PORT=587
MAIL_USERNAME=your_email
MAIL_PASSWORD=your_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME="${APP_NAME}"
```

## API Structure

All API routes are prefixed with `/api` and require authentication via Laravel Sanctum.

## Development

Start the development server:
```bash
php artisan serve
```

The API will be available at `http://localhost:8000`

