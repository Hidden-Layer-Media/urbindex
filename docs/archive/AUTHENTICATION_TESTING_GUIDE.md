# Urbindex Authentication Testing Guide

## Quick Testing Checklist

### ✅ Core Authentication Flows
- [ ] **Email/Password Sign In**: Test with valid credentials
- [ ] **Email/Password Sign Up**: Create new account with strong password
- [ ] **OAuth Google**: Sign in with Google account
- [ ] **OAuth GitHub**: Sign in with GitHub account  
- [ ] **Anonymous Sign In**: Continue as guest user
- [ ] **Password Reset**: Test password reset flow

### ✅ Error Handling & Validation
- [ ] **Invalid Email**: Test malformed email addresses
- [ ] **Wrong Password**: Test incorrect password scenarios
- [ ] **Non-existent Account**: Test account not found errors
- [ ] **Rate Limiting**: Test multiple failed attempts
- [ ] **Network Errors**: Test offline/connectivity issues
- [ ] **Form Validation**: Test all field validation scenarios

### ✅ Session Management
- [ ] **Session Timeout**: Wait for 30-minute timeout
- [ ] **Warning Display**: Verify 5-minute warning appears
- [ ] **Session Refresh**: Test manual session extension
- [ ] **Activity Tracking**: Verify session extends on user activity
- [ ] **Cross-tab Sync**: Test session behavior across browser tabs

### ✅ Security Features
- [ ] **Password Strength**: Test weak/strong password requirements
- [ ] **Input Sanitization**: Test special character handling
- [ ] **XSS Protection**: Test script injection attempts
- [ ] **Rate Limiting**: Verify protection against brute force
- [ ] **Session Security**: Test session hijacking protection

### ✅ User Experience
- [ ] **Visual States**: Verify authentication status indicators
- [ ] **Guest vs Logged-in**: Test different user state displays
- [ ] **Feature Access**: Test feature availability by auth state
- [ ] **Responsive Design**: Test on mobile/tablet devices
- [ ] **Accessibility**: Test keyboard navigation and screen readers

## Testing Commands

### Manual Testing Commands
```bash
# Test authentication in browser console
# 1. Open browser developer tools
# 2. Go to Console tab
# 3. Test authentication functions

# Test error handling
app.getAuthErrorMessage({code: 'auth/user-not-found'})
app.validatePasswordStrength('weak')
app.checkRateLimit('test-user')

# Test session management
app.checkSessionTimeout()
app.refreshSession()

# Test form validation
app.validateFormInput(emailInput, 'email')
app.validateFormInput(passwordInput, 'password')
```

### Automated Testing Recommendations
```javascript
// Unit tests for authentication methods
describe('Authentication System', () => {
  test('should validate email correctly', () => {
    expect(app.validateEmail({value: 'test@example.com'})).toBe(true);
    expect(app.validateEmail({value: 'invalid-email'})).toBe(false);
  });
  
  test('should check password strength', () => {
    const weak = app.validatePasswordStrength('123');
    const strong = app.validatePasswordStrength('StrongPass123!');
    expect(weak.strength).toBe('weak');
    expect(strong.strength).toBe('strong');
  });
  
  test('should handle rate limiting', () => {
    expect(app.checkRateLimit('test-user')).toBe(true);
  });
});
```

## Browser Testing Matrix

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] Mobile Firefox

### Test Scenarios by Browser
- OAuth popup behavior
- Session persistence
- Form validation feedback
- Rate limiting effectiveness
- Mobile responsive design

## Security Testing

### Penetration Testing
1. **Brute Force Attack Simulation**
   - Script multiple failed login attempts
   - Verify rate limiting activates
   - Check account lockout behavior

2. **Input Validation Testing**
   - SQL injection attempts
   - XSS payload testing
   - Buffer overflow attempts
   - Special character handling

3. **Session Security Testing**
   - Session hijacking attempts
   - Token manipulation
   - Cross-site request forgery
   - Session fixation protection

### Tools for Security Testing
```bash
# Rate limiting test
curl -X POST https://urbindex.web.app/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}' \
  --max-time 1

# Multiple attempts to trigger rate limiting
for i in {1..10}; do
  curl -X POST https://urbindex.web.app/api/auth/signin \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done
```

## Performance Testing

### Load Testing
- Multiple concurrent sign-in attempts
- Session management under load
- Database query optimization
- Network timeout handling

### Metrics to Monitor
- Authentication response time (< 2 seconds)
- Session timeout accuracy (30 minutes ± 1 minute)
- Rate limiting activation (5 attempts in 15 minutes)
- Error message clarity (user-friendly messages)

## User Acceptance Testing

### Test Scenarios
1. **New User Registration**
   - Sign up with email/password
   - Receive verification email
   - Verify email address
   - Complete profile setup

2. **Returning User Sign In**
   - Sign in with existing credentials
   - Access protected features
   - Session management behavior

3. **OAuth Integration**
   - Sign in with Google
   - Sign in with GitHub
   - Account linking behavior

4. **Guest User Experience**
   - Anonymous sign in
   - Limited feature access
   - Upgrade prompts

### Success Criteria
- [ ] 95%+ authentication success rate
- [ ] Clear error messages for all failure scenarios
- [ ] Smooth session timeout handling
- [ ] Intuitive user state indicators
- [ ] Effective rate limiting protection

## Troubleshooting Common Issues

### Authentication Problems
```javascript
// Check authentication state
console.log('Current user:', app.currentUser);
console.log('Auth status:', app.getAuthErrorMessage(error));

// Test rate limiting
app.recordAuthAttempt('test-user');
console.log('Rate limited:', app.checkRateLimit('test-user'));

// Debug session management
console.log('Last activity:', app.lastActivity);
console.log('Session timeout:', app.sessionTimeout);
```

### Firebase Rules Issues
```javascript
// Test security rules
firebase.firestore().runTransaction(async (transaction) => {
  // Test rate limiting
  const rateLimitDoc = firebase.firestore().collection('rate_limits').doc('test-user');
  await transaction.get(rateLimitDoc);
});
```

## Test Reporting

### Create Test Report Template
```markdown
## Authentication Test Report - [Date]

### Test Environment
- Browser: [Chrome/Firefox/Safari/Edge]
- Device: [Desktop/Mobile]
- Network: [Online/Offline/Slow]

### Test Results
| Test Case | Status | Notes |
|-----------|--------|-------|
| Email Sign In | ✅ Pass | Valid credentials work correctly |
| Invalid Password | ✅ Pass | Clear error message displayed |
| Rate Limiting | ✅ Pass | Activates after 5 attempts |
| Session Timeout | ✅ Pass | 30-minute timeout working |

### Issues Found
1. **Issue**: [Description]
   - **Severity**: [High/Medium/Low]
   - **Reproduction**: [Steps]
   - **Expected**: [What should happen]
   - **Actual**: [What actually happens]

### Recommendations
- [ ] Fix high-priority issues
- [ ] Optimize performance bottlenecks
- [ ] Improve user experience
- [ ] Update documentation
```

## Continuous Testing

### Automated Testing Setup
- Unit tests for authentication methods
- Integration tests for Firebase rules
- End-to-end tests for user flows
- Security tests for vulnerability scanning

### Monitoring & Alerts
- Authentication error rate monitoring
- Session timeout incident tracking
- Rate limiting effectiveness metrics
- User experience feedback collection

This testing guide ensures comprehensive coverage of all authentication improvements and maintains system security and usability standards.