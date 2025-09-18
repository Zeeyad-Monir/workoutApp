# Google Login Implementation for iOS

## Overview
This document describes how Google Sign-In is implemented for CompFit on iOS using Expo AuthSession and Firebase Auth.

## Implementation Approach
We use **Expo AuthSession** for a web-based OAuth flow that works in the Expo managed workflow without requiring native modules. This approach uses the system browser for authentication, then redirects back to the app.

## Configuration

### OAuth Client ID
- **iOS Client ID**: `38275586051-e0adgsng3oamnqacn1455usfu9atn60k.apps.googleusercontent.com`
- **Bundle ID**: `com.zeeyad.compfit`
- **Google iOS Scheme**: `com.googleusercontent.apps.38275586051-e0adgsng3oamnqacn1455usfu9atn60k`
- **Redirect URI**: Automatically handled by Google (no manual configuration needed)

### App Configuration
```json
{
  "expo": {
    "scheme": "com.googleusercontent.apps.38275586051-e0adgsng3oamnqacn1455usfu9atn60k",
    "ios": {
      "bundleIdentifier": "com.zeeyad.compfit"
    }
  }
}
```

### Production Setup
This configuration uses Google's iOS client-specific URL scheme, which:
- Is automatically recognized by Google OAuth
- Doesn't require manual redirect URI configuration in Google Cloud Console  
- Works in TestFlight and production builds
- Redirects to: `com.googleusercontent.apps.38275586051-e0adgsng3oamnqacn1455usfu9atn60k:/oauth2redirect`

## Architecture

### Key Components

1. **`src/services/googleAuth.js`**
   - Main Google authentication service
   - Handles OAuth flow initiation
   - Manages Firebase credential exchange
   - Handles account linking scenarios

2. **`src/components/GoogleSignInButton.js`**
   - Reusable Google Sign-In button component
   - Shows loading state during authentication
   - Consistent styling with app theme

3. **`src/screens/LoginScreen.js`**
   - Integrated Google Sign-In button
   - Handles authentication responses
   - Manages account linking flow

## Authentication Flow

1. **New User Sign-In**
   - User taps "Continue with Google"
   - System browser opens Google OAuth
   - User signs in with Google account
   - Redirect back to app with ID token
   - Exchange ID token for Firebase credential
   - Create new Firebase user and Firestore profile
   - Auto-generate username from display name

2. **Existing User Sign-In**
   - Same flow as above
   - Firebase recognizes existing user
   - User is signed in without creating new profile

3. **Account Linking (Email Already Exists)**
   - If email exists with password account
   - User is prompted to sign in with password first
   - After password sign-in, Google account is linked
   - Future sign-ins can use either method

## Account Data Structure

When a new user signs in with Google, their profile is created with:
```javascript
{
  username: "generatedUsername",  // Auto-generated from display name
  handle: "username",              // Lowercase version
  email: "user@gmail.com",
  photoURL: "google_profile_url",  // From Google account
  favouriteWorkout: "",
  wins: 0,
  totals: 0,
  friends: [],
  hasCompletedOnboarding: false,
  provider: "google",              // Indicates Google sign-in
  createdAt: "ISO_DATE"
}
```

## Error Handling

The implementation handles:
- User cancellation (returns to login screen)
- Network failures (shows retry message)
- Account exists errors (triggers linking flow)
- Generic OAuth failures (displays error message)

## Security Notes

- Google ID tokens are never stored locally
- Only Firebase session tokens are persisted
- Account linking requires password authentication first
- All authentication happens through official Google OAuth endpoints

## Testing Checklist

1. **New Google User**
   - [ ] Tap "Continue with Google"
   - [ ] Sign in with new Gmail
   - [ ] Verify Firebase user created
   - [ ] Verify Firestore profile created
   - [ ] Verify username auto-generated

2. **Existing Firebase User**
   - [ ] Sign in with same Google account
   - [ ] Verify no duplicate profiles
   - [ ] Verify session persists

3. **Account Linking**
   - [ ] Create password account with email
   - [ ] Try Google sign-in with same email
   - [ ] Verify linking prompt appears
   - [ ] Sign in with password
   - [ ] Verify Google account linked
   - [ ] Sign out and sign in with Google

4. **Edge Cases**
   - [ ] Cancel from Google OAuth screen
   - [ ] Test with airplane mode
   - [ ] Test app relaunch persistence

## Caveats & Known Issues

1. **Build Requirements**
   - After changing the scheme, rebuild the iOS app (dev client or TestFlight)
   - The new scheme must be included in Info.plist
   - This configuration is optimized for production/TestFlight builds

2. **iOS Simulator**
   - Works in simulator but redirect may be slower
   - Physical device testing recommended for production testing

3. **Username Collisions**
   - Auto-generated usernames may need numbering
   - Users can update username in profile settings

4. **Production Configuration**
   - This setup uses Google's automatically recognized redirect scheme
   - No manual redirect URI configuration needed in Google Cloud Console
   - Works without proxy (USE_EXPO_PROXY = false)

## Future Enhancements

- [ ] Add profile photo fetch from Google
- [ ] Implement refresh token handling
- [ ] Add loading indicator overlay during auth
- [ ] Implement Apple Sign-In for iOS users
- [ ] Add account unlinking option in settings

## Dependencies

- `expo-auth-session`: ^7.0.8
- `expo-web-browser`: ^15.0.7
- `expo-linking`: ^8.0.8
- `firebase`: (v8 compat mode)

## Support

For issues with Google Sign-In:
1. Check Firebase Console → Authentication → Sign-in methods
2. Verify Google provider is enabled
3. Check OAuth client ID matches configuration
4. Ensure bundle ID matches across all services