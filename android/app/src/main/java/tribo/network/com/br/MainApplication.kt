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

  private var codePushInstance: CodePush? = null

  private fun getCodePush(): CodePush {
    if (codePushInstance == null) {
      val serverUrl = try {
        resources.getString(R.string.CodePushServerUrl)
      } catch (e: Exception) {
        null
      }
      codePushInstance = if (serverUrl != null) {
        CodePush(resources.getString(R.string.CodePushDeploymentKey), applicationContext, BuildConfig.DEBUG, serverUrl)
      } else {
        CodePush(resources.getString(R.string.CodePushDeploymentKey), applicationContext, BuildConfig.DEBUG)
      }
    }
    return codePushInstance!!
  }

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
      this,
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              add(getCodePush())
            }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getJSBundleFile(): String? {
              return try {
                  getCodePush()
                  CodePush.getJSBundleFile()
              } catch (e: Exception) {
                  null
              }
          }

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}