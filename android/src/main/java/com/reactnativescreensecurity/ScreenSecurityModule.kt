package com.reactnativescreensecurity

import android.app.Activity
import android.database.ContentObserver
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import android.provider.MediaStore
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class ScreenSecurityModule(private val reactContext: ReactApplicationContext) :
    NativeScreenSecuritySpec(reactContext) {

    companion object {
        const val NAME = "RTNScreenSecurity"
        private const val EVENT_SCREENSHOT_TAKEN = "onScreenshotTaken"
        private val SCREENSHOT_KEYWORDS = listOf(
            "screenshot", "screen_shot", "screen-shot",
            "screen_capture", "screen-capture", "screencapture",
            "bildschirmfoto", "captura", "schermata",
            "скриншот", "スクリーンショット"
        )
    }

    private var listenerCount = 0
    private var screenshotObserver: ContentObserver? = null
    private var screenCaptureCallback: Any? = null
    private var screenCaptureActivity: Activity? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    init {
        SecureWindowController.initialize(reactContext)
        SecureWindowController.activityResumedHandler = { activity ->
            reRegisterScreenCaptureCallback(activity)
        }
    }

    override fun getName(): String = NAME

    /**
     * Global window protection (ref-counted). Used for `protectionLevel: 'global'`
     * and `enableFullProtection()`. Component-level tab protection on Android is
     * handled by [SecureWindowAnchorView] + [SecureWindowController] fragment lifecycle.
     */
    override fun setSecureWindow(enable: Boolean) {
        SecureWindowController.adjustGlobalSecureRefCount(if (enable) 1 else -1)
    }

    override fun setAppSwitcherBlur(enable: Boolean, style: String) {
        // FLAG_SECURE handles app-switcher masking on Android automatically.
    }

    override fun getSecurityState(): WritableNativeMap {
        if (Looper.myLooper() == Looper.getMainLooper()) {
            return buildSecurityState()
        }
        val latch = CountDownLatch(1)
        var result: WritableNativeMap? = null
        mainHandler.post {
            result = buildSecurityState()
            latch.countDown()
        }
        latch.await(500, TimeUnit.MILLISECONDS)
        return result ?: buildSecurityState()
    }

    private fun buildSecurityState(): WritableNativeMap {
        val map = WritableNativeMap()
        map.putBoolean("secureWindowActive", SecureWindowController.isSecureWindowActive())
        map.putBoolean("appSwitcherBlurActive", false)
        return map
    }

    override fun addListener(eventName: String) {
        listenerCount++
        if (listenerCount == 1) {
            registerScreenshotObserver()
        }
    }

    override fun removeListeners(count: Double) {
        listenerCount = maxOf(listenerCount - count.toInt(), 0)
        if (listenerCount == 0) {
            unregisterScreenshotObserver()
        }
    }

    private fun registerScreenshotObserver() {
        if (Build.VERSION.SDK_INT >= 34) {
            registerScreenCaptureCallbackOn(reactContext.currentActivity)
        } else {
            registerContentObserver()
        }
    }

    private fun unregisterScreenshotObserver() {
        unregisterContentObserver()
        if (Build.VERSION.SDK_INT >= 34) {
            unregisterScreenCaptureCallback()
        }
    }

    @Suppress("NewApi")
    private fun reRegisterScreenCaptureCallback(activity: Activity) {
        if (Build.VERSION.SDK_INT < 34 || listenerCount == 0) return
        unregisterScreenCaptureCallback()
        registerScreenCaptureCallbackOn(activity)
    }

    @Suppress("NewApi")
    private fun registerScreenCaptureCallbackOn(activity: Activity?) {
        if (screenCaptureCallback != null && screenCaptureActivity === activity) return
        if (activity == null) return

        unregisterScreenCaptureCallback()

        try {
            val callback = Activity.ScreenCaptureCallback { emitScreenshotEvent() }
            activity.registerScreenCaptureCallback(
                mainHandler.looper.let { java.util.concurrent.Executor(mainHandler::post) },
                callback,
            )
            screenCaptureCallback = callback
            screenCaptureActivity = activity
        } catch (e: SecurityException) {
            // DETECT_SCREEN_CAPTURE permission missing — degrade gracefully
        }
    }

    @Suppress("NewApi")
    private fun unregisterScreenCaptureCallback() {
        val callback = screenCaptureCallback as? Activity.ScreenCaptureCallback ?: return
        screenCaptureActivity?.unregisterScreenCaptureCallback(callback)
        screenCaptureCallback = null
        screenCaptureActivity = null
    }

    private fun registerContentObserver() {
        if (screenshotObserver != null) return

        val observer = object : ContentObserver(mainHandler) {
            private var lastTimestamp = System.currentTimeMillis()

            override fun onChange(selfChange: Boolean, uri: Uri?) {
                super.onChange(selfChange, uri)
                if (uri == null) return

                val now = System.currentTimeMillis()
                if (now - lastTimestamp < 500) return

                if (isScreenshotUri(uri)) {
                    lastTimestamp = now
                    emitScreenshotEvent()
                }
            }
        }

        val contentUri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
        } else {
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI
        }

        try {
            reactContext.contentResolver.registerContentObserver(contentUri, true, observer)
            screenshotObserver = observer
        } catch (e: SecurityException) {
            // Missing READ_EXTERNAL_STORAGE on older APIs — degrade gracefully
        }
    }

    private fun unregisterContentObserver() {
        screenshotObserver?.let {
            reactContext.contentResolver.unregisterContentObserver(it)
        }
        screenshotObserver = null
    }

    private fun isScreenshotUri(uri: Uri): Boolean {
        val projection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            arrayOf(
                MediaStore.Images.Media.DISPLAY_NAME,
                MediaStore.Images.Media.RELATIVE_PATH
            )
        } else {
            arrayOf(
                MediaStore.Images.Media.DISPLAY_NAME,
                MediaStore.Images.Media.DATA
            )
        }

        return try {
            reactContext.contentResolver.query(uri, projection, null, null, null)?.use { cursor ->
                if (!cursor.moveToFirst()) return@use false

                val nameIndex = cursor.getColumnIndex(projection[0])
                val pathIndex = cursor.getColumnIndex(projection[1])

                val name = if (nameIndex >= 0) cursor.getString(nameIndex)?.lowercase() else null
                val path = if (pathIndex >= 0) cursor.getString(pathIndex)?.lowercase() else null

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val inScreenshotDir = path?.contains("screenshots") == true
                    val matchesKeyword = listOfNotNull(name, path).any { value ->
                        SCREENSHOT_KEYWORDS.any { keyword -> value.contains(keyword) }
                    }
                    return@use inScreenshotDir || matchesKeyword
                }

                val combined = listOfNotNull(name, path)
                combined.any { value ->
                    SCREENSHOT_KEYWORDS.any { keyword -> value.contains(keyword) }
                }
            } ?: false
        } catch (e: Exception) {
            false
        }
    }

    private fun emitScreenshotEvent() {
        if (reactContext.hasActiveReactInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(EVENT_SCREENSHOT_TAKEN, WritableNativeMap())
        }
    }

    override fun invalidate() {
        unregisterScreenshotObserver()
        SecureWindowController.destroy()
        listenerCount = 0
        super.invalidate()
    }
}
