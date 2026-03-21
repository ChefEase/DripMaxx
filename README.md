# DripMaxx

Expo React Native app for outfit scoring and style feedback.

## Prerequisites

- Node.js 20
- Java 17 for Android builds
- Android Studio with:
  - Android SDK
  - Android SDK Platform
  - Android SDK Build-Tools
  - Android SDK Platform-Tools
  - At least one emulator image, or a connected Android device

## Android Setup on Windows

Install Android Studio and confirm the SDK is installed. The default SDK path is usually:

```powershell
C:\Users\User\AppData\Local\Android\Sdk
```

Set these user environment variables:

```powershell
[Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\User\AppData\Local\Android\Sdk', 'User')
[Environment]::SetEnvironmentVariable('ANDROID_SDK_ROOT', 'C:\Users\User\AppData\Local\Android\Sdk', 'User')
```

Add platform tools and command-line tools to your user `Path`:

```powershell
$sdk = 'C:\Users\User\AppData\Local\Android\Sdk'
$path = [Environment]::GetEnvironmentVariable('Path', 'User')
$parts = @(
  "$sdk\platform-tools",
  "$sdk\emulator",
  "$sdk\cmdline-tools\latest\bin"
)
foreach ($part in $parts) {
  if ($path -notlike "*$part*") {
    $path = "$path;$part"
  }
}
[Environment]::SetEnvironmentVariable('Path', $path, 'User')
```

After reopening PowerShell, verify:

```powershell
adb version
```

Optional: if Gradle still cannot find the SDK, create `android/local.properties`:

```properties
sdk.dir=C:\\Users\\User\\AppData\\Local\\Android\\Sdk
```

## Install and Run

```powershell
npm install
npx expo prebuild
npx expo run:android
```

## Current Known Issue

If you see:

```text
Failed to resolve the Android SDK path
Error: 'adb' is not recognized
```

your machine is missing a configured Android SDK, or `platform-tools` is not on `Path`.
