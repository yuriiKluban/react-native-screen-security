package com.reactnativescreensecurity

import android.content.Context
import android.content.pm.ApplicationInfo
import android.util.Log
import androidx.fragment.app.Fragment
import com.facebook.react.views.view.ReactViewGroup

/**
 * Native container that binds [FLAG_SECURE] to its hosting Fragment lifecycle.
 * Falls back to Activity-scoped protection when no Fragment is found.
 */
class SecureWindowAnchorView(context: Context) : ReactViewGroup(context) {

    private var registeredFragment: Fragment? = null
    private var useActivityFallback = false

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        val fragment = FragmentFinder.findFragment(this)
        if (fragment != null) {
            registeredFragment = fragment
            SecureWindowController.registerSecuredFragment(fragment)
        } else {
            useActivityFallback = true
            SecureWindowController.adjustActivityScopedRefCount(1)
            if ((context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
                Log.w(
                    TAG,
                    "No Fragment found for SecureWindowAnchorView. " +
                        "Falling back to Activity-scoped FLAG_SECURE. " +
                        "Consider using react-native-screens for tab-safe protection.",
                )
            }
        }
    }

    override fun onDetachedFromWindow() {
        if (useActivityFallback) {
            SecureWindowController.adjustActivityScopedRefCount(-1)
        } else {
            registeredFragment?.let { SecureWindowController.unregisterSecuredFragment(it) }
        }
        registeredFragment = null
        useActivityFallback = false
        super.onDetachedFromWindow()
    }

    companion object {
        private const val TAG = "SecureWindowAnchor"
    }
}
