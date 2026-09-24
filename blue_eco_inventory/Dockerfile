FROM php:8.4-cli

# Install system dependencies needed by common Laravel extensions
RUN apt-get update && apt-get install -y \
    ca-certificates \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libpq-dev \
    libzip-dev \
    zip \
    unzip \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions Laravel needs
RUN docker-php-ext-install pdo_pgsql pgsql mbstring exif pcntl bcmath gd zip

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy composer files first (better build caching)
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts

# Copy the rest of the application
COPY . .

# Re-run composer to trigger any post-install scripts now that all files are present
RUN composer dump-autoload --optimize

RUN chmod -R 755 storage bootstrap/cache

# Render provides the port to bind to via the PORT env variable
EXPOSE 8000

# db:seed used to run here on every single boot/restart/deploy. It's
# idempotent (firstOrCreate/updateOrCreate) so it never duplicated rows,
# but it still added a handful of DB round trips to every cold start for
# no benefit after the first run. Seed once manually instead:
#   render exec -- php artisan db:seed --force
# (or from the Render shell tab), then redeploy.
CMD php artisan config:clear && \
    php artisan migrate --force && \
    php artisan serve --host=0.0.0.0 --port=${PORT:-8000}