# Riannah's Closet

## Overview

Riannah's Closet is a cloud-based wardrobe management mobile app built with Expo and React Native. It allows users to catalog clothing items, create outfit combinations, and visually plan daily looks. The app features an organic/botanical aesthetic with hand-drawn floral illustrations, targeting a "garden journal meets fashion lookbook" feel.

The app supports multi-user email-based authentication with PostgreSQL database storage, designed for both web and mobile (iOS/Android) platforms with cloud-synced data. Users register and log in with their email address, and can reset their password via email.

### Key Features
- **Wardrobe cataloging**: Take photos and categorize clothing items
- **Outfit creation**: Combine items into complete outfits with optional cover photos
- **Custom cover photos**: Upload photos of yourself wearing an outfit or items laid out together
- **Calendar planning**: Schedule multiple outfits per day
- **Cloud sync**: Data synced across web and mobile devices

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Expo SDK 54 with React Native 0.81
- **Navigation**: React Navigation v7 with bottom tabs + native stack navigators
  - Tab-based navigation (Wardrobe, Outfits, Calendar, Profile)
  - Modal presentations for item details, add/edit flows, and outfit builder
- **State Management**: TanStack React Query for server state, React useState for local UI state
- **Styling**: Custom theme system with light/dark mode support
  - Design tokens defined in `client/constants/theme.ts`
  - Typography uses Cormorant Garamond (headings) and Inter (body)
- **Animations**: React Native Reanimated for micro-interactions and transitions
- **Data Storage**: AsyncStorage for local persistence of clothing items, outfits, and user profile

### Backend Architecture
- **Server**: Express.js with TypeScript
- **Purpose**: Currently minimal - serves landing page and proxies for Expo bundler
- **Database**: PostgreSQL with Drizzle ORM (schema defined but not actively used for core app data)
- **Pattern**: Routes registered in `server/routes.ts`, storage abstraction in `server/storage.ts`

### Key Architectural Decisions

1. **Cloud-synced data with local caching**: Data stored in PostgreSQL, cached locally in AsyncStorage
   - Cache system in `client/lib/cache.ts` with 5-minute TTL
   - User-scoped cache keys prevent data leakage between accounts
   - Cache automatically invalidated on create/update/delete operations
   - Cache cleared on logout for security

2. **Offline-first sync queue**: Changes sync in the background with automatic retries
   - Implementation in `client/lib/sync-queue.ts`
   - Supported operations: `create_item`, `update_item`, `delete_item`, `create_outfit`, `update_outfit`, `delete_outfit`, `create_planned_outfit`, `delete_planned_outfit`
   - Uses temp IDs for optimistic updates (prefix: `temp_`)
   - Temp ID mapping system for planned outfits referencing temp outfit IDs
   - Max 3 retries with 5-second delay between attempts
   - `useSyncStatus` hook provides separate counts for items vs outfits
   - `SyncStatusIndicator` component displays "Syncing X items, Y outfits..."

3. **File-based navigation structure**: Each tab has its own stack navigator
   - Pattern: `client/navigation/[Feature]StackNavigator.tsx`
   - Enables deep linking and proper back navigation

4. **Path aliases**: `@/` maps to `client/`, `@shared/` maps to `shared/`
   - Configured in babel.config.js and tsconfig.json

5. **Shared types**: Core domain types (ClothingItem, Outfit, etc.) defined in `client/lib/types.ts`
   - Database schema in `shared/schema.ts` uses Drizzle ORM with Zod validation

6. **API versioning**: All API endpoints are prefixed with `/api/v1/`
   - **STATUS: v1 ENDPOINTS ARE NOW LOCKED** - Do not make breaking changes to v1 endpoints
   - Rationale: Ensures backward compatibility when mobile app is in App Store review
   - Pattern: Server routes and client API calls all use versioned paths
   - Breaking changes MUST be introduced under `/api/v2/` while maintaining v1 for existing users
   - The OpenAPI schema (`api-schema.json`) is uploaded to Cloudflare API Shield for validation

## TestFlight Setup (Pending)

### Status
- Apple Developer enrollment: **Pending approval**
- Expo project ID: `85944140-a9cb-4998-829c-b50296ae7d34`
- Expo account: danfred360

### Next Steps (after Apple Developer enrollment is approved)
1. Run locally: `npx eas login` then `npx eas build --platform ios --profile production`
2. Follow prompts to set up Apple Distribution Certificate
3. Once credentials are configured, future builds can run from Replit

### Secrets Already Configured
- EXPO_TOKEN: ✅
- APPLE_ID: ✅
- APPLE_APP_SPECIFIC_PASSWORD: ✅

## Over-the-Air (OTA) Updates

### Configuration
- **Runtime Version Policy**: `fingerprint` - automatically calculates compatibility
- **Update URL**: `https://u.expo.dev/85944140-a9cb-4998-829c-b50296ae7d34`
- **Channels**: `development`, `preview`, `production`

### Pushing Updates
After the app is in the App Store, push JavaScript updates without App Store review:

```bash
# Push update to production users
eas update --branch production --message "Bug fix description"

# Push update to preview/staging testers
eas update --branch preview --message "Testing new feature"
```

### What Can Be Updated OTA
- JavaScript code changes
- Styling and UI tweaks
- Images and assets
- Bug fixes

### What Requires New App Store Build
- Native code changes
- New native dependencies
- Expo SDK upgrades

## External Dependencies

### Core Services
- **PostgreSQL**: Database provisioned via Replit (connection via DATABASE_URL)
- **Drizzle ORM**: Database toolkit with schema-first design
- **Resend**: Email service for password reset and account deletion confirmation emails (via Replit integration)

### Third-Party Libraries
- **expo-image-picker**: For capturing/selecting clothing photos
- **expo-haptics**: Tactile feedback on interactions
- **expo-blur**: Native blur effects for iOS tab bar
- **react-native-keyboard-controller**: Keyboard-aware scroll views

### Development Tools
- **Metro bundler**: Expo's JavaScript bundler
- **drizzle-kit**: Database migrations (`npm run db:push`)
- **ESLint + Prettier**: Code formatting and linting

## API Documentation

### OpenAPI Schema
- **File**: `api-schema.json` - OpenAPI 3.0 schema for Cloudflare API Shield
- **STATUS: v1 ENDPOINTS ARE LOCKED** - Do not modify existing v1 endpoint schemas in ways that break compatibility
- **Adding new v1 endpoints**: Allowed, but must be backward compatible (no breaking changes)
- **Breaking changes**: Create new `/api/v2/` endpoints instead
- **Endpoints documented**:
  - Authentication: `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/me`
  - Password Reset: `/api/v1/auth/forgot-password`, `/api/v1/auth/verify-reset-token`, `/api/v1/auth/reset-password`
  - Account Management: `/api/v1/auth/account` (DELETE - deletes user and all data)
  - Profile: `/api/v1/profile`, `/api/v1/profile/email`
  - Clothing Items: `/api/v1/items`, `/api/v1/items/{id}`
  - Outfits: `/api/v1/outfits`, `/api/v1/outfits/{id}`
  - Planner: `/api/v1/planner`, `/api/v1/planner/{id}`

## Password Reset Flow

### How It Works
1. User enters email on ForgotPasswordScreen
2. Backend generates 6-digit reset code, stores it with 1-hour expiry
3. Resend sends email with reset code
4. User enters code on ResetPasswordScreen
5. Backend verifies code (checks expiry) and updates password

### Security Features
- Rate limiting: 3 requests per email per 15 minutes
- Token expiry: 1 hour
- Previous tokens for user are deleted when new one is created
- Generic success message prevents email enumeration

### Database Tables
- `users.email` - Required unique email field for authentication
- `password_reset_tokens` - Stores reset tokens with user_id, token, expires_at

## iOS Password AutoFill

### Configuration
The app supports iOS password autofill/save features through:

1. **TextInput props**: All auth screens use `textContentType` for iOS autofill:
   - Email fields: `textContentType="emailAddress"`
   - Login password: `textContentType="password"`
   - New password fields: `textContentType="newPassword"`

2. **Associated Domains**: Configured in `app.json`:
   ```json
   "associatedDomains": ["webcredentials:riannahscloset.com"]
   ```

3. **Apple App Site Association file**: Served at `/.well-known/apple-app-site-association`
   - Location: `server/public/.well-known/apple-app-site-association`
   - Must be accessible at `https://riannahscloset.com/.well-known/apple-app-site-association`

### Setup After Apple Developer Enrollment
1. Get your Team ID from Apple Developer portal (10-character ID like `ABCD1234EF`)
2. Update the AASA file: Replace `XXXXXXXXXX` with your actual Team ID
   - Format: `{TEAM_ID}.{BUNDLE_ID}` → `ABCD1234EF.com.riannahscloset.app`
3. Rebuild the app with `eas build` (associated domains require a native build)

### Testing
- Password suggestions appear when creating new accounts
- Saved passwords offer to autofill on login screen
- Passwords sync via iCloud Keychain across user's devices

## Account Deletion

### How It Works
1. User taps "Delete Account" button on Profile screen
2. Confirmation dialog warns about permanent data loss
3. Backend deletes user and all associated data (cascade delete)
4. Confirmation email sent via Resend
5. User is logged out automatically

### Data Removed
- User account (users table)
- All clothing items
- All outfits
- All planned outfit entries
- All password reset tokens