package tribo.network.com.br

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper
import com.microsoft.codepush.react.CodePush

class MainApplication : Application(), ReactApplication {
  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
      this,
      object : DefaultReactNativeHost(this) {
        // CodePush is supplied by the generated package list. Initializing its
        // bundle name after that list is created keeps its NativeModule aligned
        // with the binary asset without registering it twice.
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.also {
              if (BuildConfig.CODE_PUSH_ENABLED) CodePush.getJSBundleFile("index.android.bundle")
            }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getJSBundleFile(): String? {
              if (!BuildConfig.CODE_PUSH_ENABLED) return null
              return try {
                  CodePush.getJSBundleFile("index.android.bundle")
              } catch (e: Exception) {
                  null
              }
          }

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      }
  )

  override val reactHost: ReactHost?
    get() = if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)
    } else {
      null
    }

  override fun onCreate() {
    super.onCreate()
    // Required on every architecture: initializes SoLoader and React Native's
    // native feature flags before the Activity delegate is created.
    loadReactNative(this)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      DefaultNewArchitectureEntryPoint.releaseLevel = try {
        ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
      } catch (e: IllegalArgumentException) {
        ReleaseLevel.STABLE
      }
    }
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
