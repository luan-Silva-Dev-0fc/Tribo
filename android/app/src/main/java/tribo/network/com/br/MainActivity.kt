package tribo.network.com.br

import android.graphics.Color
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.view.Display
import android.view.View
import android.view.WindowManager
import androidx.core.view.WindowCompat

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    setTheme(R.style.AppTheme)
    super.onCreate(null)

    // Hardware Acceleration flag
    window.setFlags(
      WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
      WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
    )

    // Direciona teclas de volume para controlar mídia de áudio e vídeo
    volumeControlStream = AudioManager.STREAM_MUSIC

    // Fundo preto puro para evitar qualquer piscada de tela
    window.decorView.setBackgroundColor(Color.BLACK)

    // Configura a barra de navegação transparente Edge-to-Edge
    window.navigationBarColor = Color.TRANSPARENT
    WindowCompat.setDecorFitsSystemWindows(window, false)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      window.isNavigationBarContrastEnforced = false
    }

    // Ativa taxa de atualização alta (90Hz / 120Hz) nativamente para rolagem fluida
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      try {
        val display = window.windowManager.defaultDisplay
        val modes = display.supportedModes
        var bestMode: Display.Mode? = null
        var maxRate = 60f

        for (mode in modes) {
          if (mode.refreshRate > maxRate) {
            maxRate = mode.refreshRate
            bestMode = mode
          }
        }

        if (bestMode != null) {
          val params = window.attributes
          params.preferredDisplayModeId = bestMode.modeId
          window.attributes = params
        }
      } catch (_: Exception) {}
    }
  }

  override fun getMainComponentName(): String = "main"

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              super.invokeDefaultOnBackPressed()
          }
          return
      }
      super.invokeDefaultOnBackPressed()
  }
}
