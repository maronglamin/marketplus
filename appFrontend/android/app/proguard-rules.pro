# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# Strip common logging calls in release
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
    public static int i(...);
    public static int w(...);
    public static int e(...);
}

# React Native's FLog
-assumenosideeffects class com.facebook.common.logging.FLog {
    public static void v(...);
    public static void d(...);
    public static void i(...);
    public static void w(...);
    public static void e(...);
}

# --- Keep attributes commonly needed for reflection/serialization ---
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod,Exceptions,SourceFile,LineNumberTable

# --- React Native & Hermes ---
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.soloader.** { *; }

# Keep Expo modules which rely on reflection
-keep class expo.modules.** { *; }

# Keep React packages and TurboModules
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.module.** { *; }
-keep class com.facebook.react.modules.** { *; }
-keep class com.facebook.react.uimanager.** { *; }

# Avoid removing classes annotated with Keep
-keep @androidx.annotation.Keep class * { *; }
-keep class * { @androidx.annotation.Keep *; }

# --- Networking / JSON libraries ---
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**
-keep class okio.** { *; }
-dontwarn okio.**

-keep class retrofit2.** { *; }
-dontwarn retrofit2.**

-keep class com.google.gson.stream.** { *; }
-keep class com.google.gson.** { *; }
-keep class * extends com.google.gson.TypeAdapter { *; }
-keep class * implements com.google.gson.TypeAdapterFactory { *; }
-keep class * implements com.google.gson.JsonSerializer { *; }
-keep class * implements com.google.gson.JsonDeserializer { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# --- Kotlin metadata (if any Kotlin libs reflect on it) ---
-keep class kotlin.Metadata { *; }

# --- AndroidX & common warnings to ignore ---
-dontwarn org.codehaus.mojo.animal_sniffer.**
-dontwarn javax.annotation.**
-dontwarn sun.misc.**

# --- Stripe push provisioning (optional classes referenced) ---
-keep class com.reactnativestripesdk.** { *; }
-keep class com.stripe.android.pushProvisioning.** { *; }
-dontwarn com.stripe.android.pushProvisioning.**

# --- Nimbus JOSE / Tink / BouncyCastle (optional algorithms) ---
-keep class com.nimbusds.** { *; }
-dontwarn com.nimbusds.**

-keep class com.google.crypto.tink.** { *; }
-dontwarn com.google.crypto.tink.**

-keep class org.bouncycastle.** { *; }
-dontwarn org.bouncycastle.**
