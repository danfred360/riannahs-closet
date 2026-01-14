# Riannah's Closet

## Overview

Riannah's Closet is a cloud-based wardrobe management mobile app built with Expo and React Native. It allows users to catalog clothing items, create outfit combinations, and visually plan daily looks. The app features an organic/botanical aesthetic with hand-drawn floral illustrations, targeting a "garden journal meets fashion lookbook" feel.

The app supports multi-user authentication with PostgreSQL database storage, designed for both web and mobile (iOS/Android) platforms with cloud-synced data.

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

2. **File-based navigation structure**: Each tab has its own stack navigator
   - Pattern: `client/navigation/[Feature]StackNavigator.tsx`
   - Enables deep linking and proper back navigation

3. **Path aliases**: `@/` maps to `client/`, `@shared/` maps to `shared/`
   - Configured in babel.config.js and tsconfig.json

4. **Shared types**: Core domain types (ClothingItem, Outfit, etc.) defined in `client/lib/types.ts`
   - Database schema in `shared/schema.ts` uses Drizzle ORM with Zod validation

5. **API versioning**: All API endpoints are prefixed with `/api/v1/`
   - Rationale: Ensures backward compatibility when mobile app is in App Store review
   - Pattern: Server routes and client API calls all use versioned paths
   - Future breaking changes can be introduced under `/api/v2/` while maintaining v1 for existing mobile app users

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

## External Dependencies

### Core Services
- **PostgreSQL**: Database provisioned via Replit (connection via DATABASE_URL)
- **Drizzle ORM**: Database toolkit with schema-first design

### Third-Party Libraries
- **expo-image-picker**: For capturing/selecting clothing photos
- **expo-haptics**: Tactile feedback on interactions
- **expo-blur**: Native blur effects for iOS tab bar
- **react-native-keyboard-controller**: Keyboard-aware scroll views

### Development Tools
- **Metro bundler**: Expo's JavaScript bundler
- **drizzle-kit**: Database migrations (`npm run db:push`)
- **ESLint + Prettier**: Code formatting and linting