package tribo.network.com.br

import android.app.Activity
import android.app.ActivityManager
import android.content.Context
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.media.MediaMuxer
import android.net.Uri
import android.os.Build
import android.view.Display
import android.view.WindowManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import okhttp3.Cache
import okhttp3.ConnectionPool
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.nio.ByteBuffer
import java.util.concurrent.TimeUnit

class TriboNativeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "TriboNativeModule"

    private val currentAct: Activity?
        get() = reactApplicationContext.currentActivity

    private val okHttpClient: OkHttpClient by lazy {
        val cacheDir = File(reactApplicationContext.cacheDir, "tribo_native_http_cache")
        val cacheSize = 100L * 1024L * 1024L // 100 MB cache
        val httpCache = try {
            Cache(cacheDir, cacheSize)
        } catch (_: Exception) {
            null
        }

        val builder = OkHttpClient.Builder()
            .connectionPool(ConnectionPool(32, 10, TimeUnit.MINUTES))
            .connectTimeout(8, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .writeTimeout(15, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .protocols(listOf(okhttp3.Protocol.HTTP_2, okhttp3.Protocol.HTTP_1_1))

        if (httpCache != null) {
            builder.cache(httpCache)
        }

        builder.build()
    }

    @ReactMethod
    fun prewarmConnection(url: String, promise: Promise) {
        Thread {
            try {
                val req = Request.Builder()
                    .url(url)
                    .head()
                    .build()
                okHttpClient.newCall(req).enqueue(object : okhttp3.Callback {
                    override fun onFailure(call: okhttp3.Call, e: java.io.IOException) {
                        promise.resolve(false)
                    }
                    override fun onResponse(call: okhttp3.Call, response: okhttp3.Response) {
                        response.close()
                        promise.resolve(true)
                    }
                })
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }.start()
    }

    @ReactMethod
    fun trimVideo(sourceUriStr: String, startSeconds: Double, endSeconds: Double, promise: Promise) {
        Thread {
            var extractor: MediaExtractor? = null
            var muxer: MediaMuxer? = null
            try {
                val startUs = (startSeconds * 1_000_000).toLong()
                val endUs = (endSeconds * 1_000_000).toLong()
                val outputFile = File(reactApplicationContext.cacheDir, "trimmed_sticker_${System.currentTimeMillis()}.mp4")

                extractor = MediaExtractor()
                val uri = Uri.parse(sourceUriStr)
                if (sourceUriStr.startsWith("content://") || sourceUriStr.startsWith("android.resource://")) {
                    extractor.setDataSource(reactApplicationContext, uri, null)
                } else if (sourceUriStr.startsWith("file://")) {
                    extractor.setDataSource(uri.path ?: sourceUriStr)
                } else {
                    extractor.setDataSource(sourceUriStr)
                }

                val trackCount = extractor.trackCount
                muxer = MediaMuxer(outputFile.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
                val indexMap = HashMap<Int, Int>()
                var bufferSize = 1024 * 1024

                for (i in 0 until trackCount) {
                    val format = extractor.getTrackFormat(i)
                    val mime = format.getString(MediaFormat.KEY_MIME) ?: ""
                    if (mime.startsWith("video/") || mime.startsWith("audio/")) {
                        extractor.selectTrack(i)
                        val dstIndex = muxer.addTrack(format)
                        indexMap[i] = dstIndex
                        if (format.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)) {
                            val size = format.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE)
                            if (size > bufferSize) bufferSize = size
                        }
                    }
                }

                muxer.start()
                val buffer = ByteBuffer.allocate(bufferSize)
                val bufferInfo = MediaCodec.BufferInfo()

                for ((srcIndex, dstIndex) in indexMap) {
                    extractor.seekTo(startUs, MediaExtractor.SEEK_TO_CLOSEST_SYNC)
                    while (true) {
                        bufferInfo.size = extractor.readSampleData(buffer, 0)
                        if (bufferInfo.size < 0) {
                            break
                        }
                        val sampleTime = extractor.sampleTime
                        if (sampleTime > endUs) {
                            break
                        }
                        if (extractor.sampleTrackIndex == srcIndex) {
                            bufferInfo.presentationTimeUs = Math.max(0, sampleTime - startUs)
                            bufferInfo.flags = extractor.sampleFlags
                            muxer.writeSampleData(dstIndex, buffer, bufferInfo)
                        }
                        extractor.advance()
                    }
                }

                muxer.stop()
                muxer.release()
                muxer = null
                extractor.release()
                extractor = null

                val result: WritableMap = Arguments.createMap().apply {
                    putString("uri", "file://${outputFile.absolutePath}")
                    putString("path", outputFile.absolutePath)
                    putDouble("duration", endSeconds - startSeconds)
                }
                promise.resolve(result)
            } catch (e: Exception) {
                try { muxer?.release() } catch (_: Exception) {}
                try { extractor?.release() } catch (_: Exception) {}
                promise.reject("TRIM_ERROR", e.message ?: "Falha ao cortar vídeo", e)
            }
        }.start()
    }

    @ReactMethod
    fun enableScreenSecurity(promise: Promise) {
        val act = currentAct
        if (act == null) {
            promise.resolve(false)
            return
        }
        act.runOnUiThread {
            try {
                act.window?.setFlags(
                    WindowManager.LayoutParams.FLAG_SECURE,
                    WindowManager.LayoutParams.FLAG_SECURE
                )
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("SECURITY_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun disableScreenSecurity(promise: Promise) {
        val act = currentAct
        if (act == null) {
            promise.resolve(false)
            return
        }
        act.runOnUiThread {
            try {
                act.window?.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("SECURITY_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun getVideoDuration(uriString: String, promise: Promise) {
        Thread {
            val retriever = MediaMetadataRetriever()
            try {
                val uri = Uri.parse(uriString)
                if (uriString.startsWith("content://") || uriString.startsWith("android.resource://")) {
                    retriever.setDataSource(reactApplicationContext, uri)
                } else if (uriString.startsWith("file://")) {
                    retriever.setDataSource(uri.path)
                } else {
                    retriever.setDataSource(uriString, HashMap<String, String>())
                }

                val durationStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
                val durationMs = durationStr?.toLongOrNull() ?: 0L
                val durationSec = durationMs / 1000.0

                val widthStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)
                val heightStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)

                val result: WritableMap = Arguments.createMap().apply {
                    putDouble("durationSeconds", durationSec)
                    putDouble("durationMillis", durationMs.toDouble())
                    putInt("width", widthStr?.toIntOrNull() ?: 0)
                    putInt("height", heightStr?.toIntOrNull() ?: 0)
                }

                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("VIDEO_METADATA_ERROR", e.message, e)
            } finally {
                try {
                    retriever.release()
                } catch (_: Exception) {}
            }
        }.start()
    }

    @ReactMethod
    fun getPerformanceInfo(promise: Promise) {
        try {
            val actManager = reactApplicationContext.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
            val memInfo = ActivityManager.MemoryInfo()
            actManager?.getMemoryInfo(memInfo)

            val totalRamMB = (memInfo.totalMem / (1024 * 1024)).toInt()
            val availRamMB = (memInfo.availMem / (1024 * 1024)).toInt()
            val isLowRam = actManager?.isLowRamDevice ?: false
            val cpuCores = Runtime.getRuntime().availableProcessors()

            val windowManager = reactApplicationContext.getSystemService(Context.WINDOW_SERVICE) as? WindowManager
            val display = windowManager?.defaultDisplay
            val refreshRate = display?.refreshRate ?: 60f

            val result: WritableMap = Arguments.createMap().apply {
                putInt("totalRamMB", totalRamMB)
                putInt("availRamMB", availRamMB)
                putBoolean("isLowRamDevice", isLowRam)
                putInt("cpuCores", cpuCores)
                putDouble("refreshRate", refreshRate.toDouble())
                putString("deviceModel", "${Build.MANUFACTURER} ${Build.MODEL}")
                putInt("sdkVersion", Build.VERSION.SDK_INT)
            }

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("PERF_INFO_ERROR", "Falha ao obter dados de performance: ${e.message}", e)
        }
    }

    @ReactMethod
    fun enableHighRefreshRate(promise: Promise) {
        val act = currentAct
        if (act == null) {
            promise.resolve(60.0)
            return
        }
        act.runOnUiThread {
            try {
                val window = act.window
                if (window != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    val display = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        act.display
                    } else {
                        window.windowManager?.defaultDisplay
                    }

                    if (display != null) {
                        val modes = display.supportedModes
                        var bestMode: Display.Mode? = null
                        var maxRate = 60f

                        if (modes != null) {
                            for (i in 0 until modes.size) {
                                val mode = modes[i]
                                if (mode.refreshRate > maxRate) {
                                    maxRate = mode.refreshRate
                                    bestMode = mode
                                }
                            }
                        }

                        if (bestMode != null) {
                            val params = window.attributes
                            params.preferredDisplayModeId = bestMode.modeId
                            window.attributes = params
                            promise.resolve(maxRate.toDouble())
                            return@runOnUiThread
                        }
                    }
                }
                promise.resolve(60.0)
            } catch (inner: Exception) {
                promise.reject("REFRESH_RATE_ERROR", inner.message, inner)
            }
        }
    }

    @ReactMethod
    fun fastFetch(
        url: String,
        method: String,
        headers: ReadableMap?,
        body: String?,
        promise: Promise
    ) {
        Thread {
            try {
                val requestBuilder = Request.Builder().url(url)

                if (headers != null) {
                    val keyIterator = headers.keySetIterator()
                    while (keyIterator.hasNextKey()) {
                        val key = keyIterator.nextKey()
                        val value = headers.getString(key)
                        if (value != null) {
                            requestBuilder.header(key, value)
                        }
                    }
                }

                val upperMethod = method.uppercase()
                when (upperMethod) {
                    "GET" -> requestBuilder.get()
                    "DELETE" -> {
                        if (body != null) {
                            val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
                            requestBuilder.delete(body.toRequestBody(mediaType))
                        } else {
                            requestBuilder.delete()
                        }
                    }
                    "POST", "PUT", "PATCH" -> {
                        val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
                        val requestBody = (body ?: "{}").toRequestBody(mediaType)
                        requestBuilder.method(upperMethod, requestBody)
                    }
                    else -> requestBuilder.get()
                }

                val response = okHttpClient.newCall(requestBuilder.build()).execute()
                val responseBody = response.body?.string() ?: ""
                val statusCode = response.code

                val resultMap: WritableMap = Arguments.createMap().apply {
                    putInt("status", statusCode)
                    putString("data", responseBody)
                    putBoolean("ok", response.isSuccessful)
                }

                promise.resolve(resultMap)
            } catch (e: Exception) {
                promise.reject("NATIVE_FETCH_ERROR", e.message ?: "Erro de rede nativa", e)
            }
        }.start()
    }

    @ReactMethod
    fun prefetchUrls(urls: ReadableArray, promise: Promise) {
        Thread {
            try {
                for (i in 0 until urls.size()) {
                    val url = urls.getString(i)
                    if (!url.isNullOrBlank() && (url.startsWith("http://") || url.startsWith("https://"))) {
                        try {
                            val req = Request.Builder().url(url).head().build()
                            okHttpClient.newCall(req).enqueue(object : okhttp3.Callback {
                                override fun onFailure(call: okhttp3.Call, e: java.io.IOException) {}
                                override fun onResponse(call: okhttp3.Call, response: okhttp3.Response) {
                                    response.close()
                                }
                            })
                        } catch (_: Exception) {}
                    }
                }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }.start()
    }

    @ReactMethod
    fun prefetchReelsMedia(videoIds: ReadableArray, promise: Promise) {
        Thread {
            try {
                for (i in 0 until videoIds.size()) {
                    val vId = videoIds.getString(i)
                    if (!vId.isNullOrBlank()) {
                        val thumbUrl = "https://i.ytimg.com/vi/$vId/hqdefault.jpg"
                        val embedUrl = "https://www.youtube.com/embed/$vId"
                        listOf(thumbUrl, embedUrl).forEach { url ->
                            try {
                                val req = Request.Builder().url(url).head().build()
                                okHttpClient.newCall(req).enqueue(object : okhttp3.Callback {
                                    override fun onFailure(call: okhttp3.Call, e: java.io.IOException) {}
                                    override fun onResponse(call: okhttp3.Call, response: okhttp3.Response) {
                                        response.close()
                                    }
                                })
                            } catch (_: Exception) {}
                        }
                    }
                }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }.start()
    }

    @ReactMethod
    fun clearNativeCache(promise: Promise) {
        Thread {
            try {
                var deletedBytes: Long = 0
                val cacheDir = reactApplicationContext.cacheDir
                deletedBytes += deleteDir(cacheDir)

                val externalCache = reactApplicationContext.externalCacheDir
                if (externalCache != null) {
                    deletedBytes += deleteDir(externalCache)
                }

                try {
                    okHttpClient.cache?.evictAll()
                } catch (_: Exception) {}

                val result: WritableMap = Arguments.createMap().apply {
                    putBoolean("success", true)
                    putDouble("freedMB", (deletedBytes / (1024.0 * 1024.0)))
                }
                promise.resolve(result)
            } catch (err: Exception) {
                promise.reject("CLEAR_CACHE_ERROR", err.message, err)
            }
        }.start()
    }

    private fun deleteDir(dir: File?): Long {
        var bytes: Long = 0
        if (dir != null && dir.isDirectory) {
            val children = dir.listFiles() ?: return 0
            for (child in children) {
                if (child.isDirectory) {
                    bytes += deleteDir(child)
                } else {
                    val len = child.length()
                    if (child.delete()) {
                        bytes += len
                    }
                }
            }
        }
        return bytes
    }
}
