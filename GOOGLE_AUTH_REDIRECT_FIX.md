# Google Auth 404 Error - Redirect URI Fix Guide

## Problem
You're seeing a 404 error on `accounts.google.com` when trying to sign in with Google. This means Google doesn't recognize the redirect URI your app is using.

## Solution Steps

### Step 1: Get Your Redirect URI

1. Open your app in the iOS Simulator or device
2. Tap the "Continue with Google" button
3. You'll see:
   - An alert popup showing the redirect URI (copy this!)
   - Console logs with multiple URI options
   - The 404 error (this is expected until you complete the fix)

### Step 2: Common Redirect URI Formats

Your redirect URI will be ONE of these formats:

#### For Development Builds:
```
compfit://redirect
```
or
```
compfit://expo-development-client/?url=...
```

#### For Expo Go:
```
https://auth.expo.io/@your-username/workoutApp
```

#### For Standalone/Production:
```
com.zeeyad.compfit://redirect
```

### Step 3: Add to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (CompFit)
3. Navigate to: **APIs & Services** → **Credentials**
4. Find your iOS OAuth 2.0 Client ID
5. Click to edit it
6. Under **Authorized redirect URIs**, add your redirect URI:
   - Click "ADD URI"
   - Paste the URI you copied from the alert
   - Click "SAVE"

### Step 4: Test Again

1. Wait 1-2 minutes for Google to update
2. Close and reopen your app
3. Try the Google Sign-In button again
4. The 404 should be gone and authentication should work!

## Troubleshooting

### If you're still seeing 404:

1. **Check the console logs** - Make sure you're using the exact URI shown
2. **Try alternative URIs** - The app logs several options, try adding all of them
3. **Clear Safari cache** - Settings → Safari → Clear History and Website Data
4. **Restart the app** - Force quit and relaunch

### Common Issues:

#### Issue: "Invalid redirect URI" error
**Solution**: Make sure there are no spaces or special characters in the URI

#### Issue: "Redirect URI mismatch" error  
**Solution**: The URI must match EXACTLY - check for trailing slashes

#### Issue: Works in simulator but not device
**Solution**: Device might use a different URI format - check logs on device

## URI Format by Environment

| Environment | Typical URI Format | Example |
|------------|-------------------|---------|
| Expo Go | `https://auth.expo.io/@{username}/{slug}` | `https://auth.expo.io/@zeeyad/workoutApp` |
| Dev Build iOS | `{scheme}://redirect` | `compfit://redirect` |
| Dev Build Android | `{scheme}://redirect` | `compfit://redirect` |
| Standalone iOS | `{bundleId}://redirect` | `com.zeeyad.compfit://redirect` |
| Web | `https://localhost:19006` | N/A for this app |

## Quick Checklist

- [ ] Tapped Google Sign-In button
- [ ] Copied redirect URI from alert popup
- [ ] Added URI to Google Cloud Console
- [ ] Saved changes in Google Console
- [ ] Waited 1-2 minutes
- [ ] Tested sign-in again

## Still Having Issues?

If you've followed all steps and still see errors:

1. **Toggle USE_EXPO_PROXY** in `src/services/googleAuth.js`:
   - Set to `true` if using Expo Go
   - Set to `false` for development builds

2. **Try adding ALL these URIs** to Google Console:
   - `compfit://redirect`
   - `compfit://`
   - `com.zeeyad.compfit://redirect`
   - The Expo proxy URI from your console logs

3. **Check OAuth Client Settings**:
   - Ensure Bundle ID is: `com.zeeyad.compfit`
   - Ensure it's an iOS type client

## Notes

- Changes in Google Cloud Console can take up to 5 minutes to propagate
- The redirect URI is environment-specific - what works in Expo Go might differ from a standalone build
- Always use the URI shown in your console logs/alert for your specific environment