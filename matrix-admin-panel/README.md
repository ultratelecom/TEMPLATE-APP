# Matrix Admin Panel

A secure Next.js admin panel for Matrix user management with enterprise-grade security features.

## 🔐 Security Features

- **Bcrypt Password Hashing**: Admin credentials are stored with secure bcrypt hashing
- **JWT Authentication**: Server-side session management with secure HTTP-only cookies
- **Environment Variable Protection**: Matrix admin token never exposed to frontend
- **Route Protection**: Middleware-based authentication for all admin routes
- **Input Validation**: Comprehensive validation of all user inputs
- **CSRF Protection**: Built-in protection against cross-site request forgery

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Generate Admin Password Hash

```bash
node scripts/generate-password-hash.js your_secure_password_here
```

This will output a bcrypt hash that you'll need for the next step.

### 3. Configure Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.local .env.local.example
```

Edit `.env.local` with your actual values:

```env
# Matrix Admin Configuration
MATRIX_ADMIN_TOKEN=your_matrix_admin_token_here
MATRIX_ADMIN_API_URL=https://your-matrix-server.com:8008

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_long_random_secret_key_here

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=your_generated_bcrypt_hash_here
```

### 4. Start the Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` and you'll be redirected to the login page.

## 🔧 Configuration

### Matrix Server Setup

1. **Enable Admin API**: Ensure your Synapse server has the admin API enabled
2. **Generate Admin Token**: Create an admin access token for API access
3. **Configure Homeserver**: Update your Matrix server URL in the environment variables

### Admin Credentials

- **Username**: Set in `ADMIN_USERNAME` (default: `admin`)
- **Password**: Generate hash using the provided script
- **JWT Secret**: Use a long, random string for `NEXTAUTH_SECRET`

## 📝 Usage

### Creating Matrix Users

1. **Login**: Use your admin credentials to access the dashboard
2. **Fill Form**: Enter user details in the creation form
3. **Matrix ID Format**: Use full Matrix IDs (e.g., `@username:matrix.org`)
4. **Admin Privileges**: Optionally grant admin rights to new users

### API Endpoints

- `POST /api/auth/login` - Admin authentication
- `POST /api/auth/logout` - Session termination
- `POST /api/users/create` - Create Matrix users (authenticated)

## 🛡️ Security Best Practices

### Environment Variables

- Never commit `.env.local` to version control
- Use strong, unique passwords and secrets
- Rotate admin tokens regularly
- Use HTTPS in production

### Server Configuration

- Enable rate limiting on your reverse proxy
- Use fail2ban or similar tools for brute force protection
- Monitor admin API access logs
- Implement network-level access controls

### Application Security

- Sessions expire after 24 hours
- HTTP-only cookies prevent XSS attacks
- CSRF tokens protect against cross-site requests
- Input validation prevents injection attacks

## 🔄 API Reference

### Create User Endpoint

**POST** `/api/users/create`

**Headers:**
```
Content-Type: application/json
Cookie: auth-token=<jwt_token>
```

**Request Body:**
```json
{
  "username": "@newuser:matrix.org",
  "password": "secure_password",
  "displayName": "New User",
  "admin": false
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "name": "@newuser:matrix.org",
    "displayname": "New User",
    "admin": false,
    "creation_ts": 1640995200000
  }
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Cannot connect to Matrix server**
   - Verify `MATRIX_ADMIN_API_URL` is correct
   - Check network connectivity
   - Ensure Matrix server is running

2. **Invalid admin token**
   - Regenerate admin token on Matrix server
   - Update `MATRIX_ADMIN_TOKEN` in environment

3. **Login fails**
   - Verify password hash is generated correctly
   - Check `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH`

4. **User creation fails**
   - Check Matrix server logs for errors
   - Verify admin token has sufficient permissions
   - Ensure user doesn't already exist

### Debug Mode

Enable debug logging by setting:

```env
NODE_ENV=development
```

## 📦 Production Deployment

### Environment Setup

1. Set `NODE_ENV=production`
2. Use HTTPS for `NEXTAUTH_URL`
3. Enable secure cookie settings
4. Configure proper CORS headers

### Security Hardening

1. Use a reverse proxy (nginx/Apache)
2. Enable rate limiting
3. Set up SSL/TLS certificates
4. Configure firewall rules
5. Enable audit logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Security Considerations

- This admin panel has significant privileges
- Only deploy in trusted environments
- Regularly update dependencies for security patches
- Monitor access logs for suspicious activity
- Implement proper backup and recovery procedures

## 🆘 Support

For security issues, please contact the maintainers directly rather than opening public issues.