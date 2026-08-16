# Mobile App TODO

## Remaining mobile parity work

### High priority
- Improve business mobile payments screen to match web detail level:
  - transaction status colors
  - refunded amount display
  - provider payment id display
  - better filtering/grouping
- Improve business mobile analytics screen to match web depth:
  - revenue trend chart
  - popular services ranking polish
  - staff performance details
  - peak-hour insights if needed
- Improve business mobile appointments quick booking UX:
  - replace free-text datetime with mobile-friendly date/time picker
  - add success/error feedback UI
  - add slot-based selection instead of raw manual time entry when possible
- Add mobile confirmations for destructive actions:
  - service deactivate
  - staff deactivate
  - coupon deactivate

### Medium priority
- Add edit/create polish for business mobile forms:
  - field validation messages
  - loading states per button
  - better empty states
- Add business mobile review filtering and summary cards
- Add salon switcher polish in business mobile shell
- Add role-based hiding for business mobile tabs/actions where needed

### Nice to have
- Add charts to business mobile overview/analytics with native-friendly rendering
- Add search/filter in business mobile appointments and customers
- Add customer detail drill-down polish in business mobile customers history

## Build blockers for installable app

### Current blockers on this machine
- Android cloud build still fails in EAS during Gradle (`Run gradlew`) with unknown error; needs detailed Gradle phase log fix.
- No local iOS signing/export configuration is available for IPA generation.
- `apps/mobile` full workspace typecheck still has pre-existing React Native / TypeScript ambient-lib conflicts unrelated to the newly added business files.

### Progress completed in this session
- Java/JDK 17 installed and verified (`openjdk version "17.0.20"`).
- EAS account login completed and verified (`akajith555`).
- EAS project auto-created and linked (`@akajith555/glowbook`, projectId `d6d5d868-3b1c-417b-8f60-b80a35034c94`).
- Android keystore generated and stored in Expo credentials.
- Initial EAS prebuild blocker fixed by removing missing mobile asset references from `apps/mobile/app.json`.
- Android build now reaches Gradle phase but fails there (no APK artifact yet).

## What is already done
- Role-aware mobile routing for customer vs admin/owner/staff
- Business mobile shell with tabs
- Business mobile overview
- Business mobile appointments
- Business mobile quick booking
- Business mobile calendar
- Business mobile customers with visit history
- Business mobile services management
- Business mobile staff management
- Business mobile offers management
- Business mobile reviews screen
- Business mobile payments screen with status filtering, refund details, and provider payment IDs
- Business mobile analytics screen

## Installable build next steps

### Android
1. Java/JDK local requirement is done for this machine.
2. Run `npm run -w apps/mobile start` for Expo local testing.
3. For cloud APK build after login (use explicit CLI entry that works on this machine):
   - `cd apps/mobile`
  - `npm_config_cache="$TMPDIR/npm-cache" npx --yes eas-cli login`
  - `npm_config_cache="$TMPDIR/npm-cache" npx --yes eas-cli build -p android --profile preview --clear-cache`
4. If build fails again, open Expo build logs and copy the first `Run gradlew` failure block.

### iPhone
1. Sign in to Apple developer account / configure signing.
2. Use EAS cloud build:
   - `cd apps/mobile`
   - `npx eas login`
   - `npx eas build -p ios --profile production`
