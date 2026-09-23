# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.rnscreens.** { *; }

# Expo modules
-keep class expo.modules.** { *; }

# Keep JS interface methods called via reflection
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}

# Keep native modules
-keep class com.newsblock.** { *; }

# Prevent stripping of classes used by Hermes
-keep class com.facebook.react.turbomodule.** { *; }

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Prevent obfuscation of classes with native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep annotations
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
