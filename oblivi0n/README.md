# OBLIVI0N

A secure, anonymous Matrix chat client built with React Native and Expo.

## Features

- **Anonymous Communication**: Uses 2-digit PINs instead of usernames
- **Matrix Integration**: Connects to custom Matrix Synapse servers
- **Press-and-Hold Decryption**: Messages are blurred by default, decrypt by holding
- **Black & White UI**: Minimal, distraction-free interface
- **End-to-End Encryption**: All messages are encrypted using Matrix's E2EE
- **No Personal Data**: No avatars, status indicators, or personal information displayed
- **Secure Storage**: Auth tokens cached locally, no password storage

## Security Features

- Messages automatically re-blur when not being held
- No unencrypted message caching
- PIN-based contact system for anonymity
- All Matrix standard E2EE encryption
- No usernames, avatars, or read receipts visible

## Setup

### Prerequisites

- Node.js 18+
- Expo CLI
- iOS Simulator or Android Emulator (for testing)
- Matrix Synapse server

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your Matrix server:
   - Edit `src/utils/matrixClient.ts`
   - Update `MATRIX_SERVER_URL` to your Matrix server URL

4. Start the development server:
   ```bash
   npm start
   ```

5. Run on your preferred platform:
   ```bash
   npm run ios     # iOS Simulator
   npm run android # Android Emulator
   npm run web     # Web browser
   ```

## Usage

### First Time Setup

1. **Login**: Enter your Matrix User ID and PIN (acts as password)
2. **Add Contacts**: Use the "Add Contact" button to map 2-digit PINs to Matrix users
3. **Start Chatting**: Tap on any contact to begin encrypted messaging

### Chatting

- **Send Messages**: Type in the input field and tap "SEND"
- **Read Messages**: Hold down on any blurred message to decrypt and read
- **Privacy**: Messages automatically blur when you release your finger

### PIN System

- Assign 2-digit PINs (10-99) to contacts for easy identification
- PINs are only visible to you - the other person sees their own PIN system
- Use the "Generate" button to get random available PINs

## Configuration

### Matrix Server

Edit `src/utils/matrixClient.ts`:

```typescript
const MATRIX_SERVER_URL = 'https://your-matrix-domain.com';
```

### Theme Customization

Colors and styling can be modified in `src/utils/theme.ts`. The app enforces a strict black and white color scheme.

## Architecture

- **Matrix Client**: `src/utils/matrixClient.ts` - Handles Matrix protocol communication
- **PIN Mapping**: `src/utils/pinMapping.ts` - Maps PINs to Matrix User IDs
- **Theme**: `src/utils/theme.ts` - Black and white UI styling
- **Navigation**: `src/navigation/AppNavigator.tsx` - Screen navigation setup
- **Screens**: `src/screens/` - Login, Home, Chat, and Add Contact screens

## Security Notes

- **No Plaintext Storage**: Messages are never stored unencrypted
- **Minimal Metadata**: Only PINs and encrypted content are displayed
- **Auto-Blur**: Messages automatically hide content for shoulder surfing protection
- **Local PIN Mapping**: PIN assignments are stored locally only

## Dependencies

- **matrix-js-sdk**: Matrix protocol implementation
- **@react-navigation**: Screen navigation
- **@react-native-async-storage**: Secure local storage
- **react-native-gesture-handler**: Touch gesture handling for decrypt feature

## License

This project is private and proprietary.

## Support

For issues or questions, contact the development team.

---

**OBLIVI0N** - Anonymous, secure, encrypted messaging. 