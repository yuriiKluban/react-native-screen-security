package com.reactnativescreensecurity

import android.content.Context
import androidx.fragment.app.Fragment
import com.facebook.react.views.view.ReactViewGroup

/**
 * Native container that binds [FLAG_SECURE] to its hosting Fragment lifecycle.
 * Used by [SecureWindowAnchorViewManager] on Android (SecureView / useScreenSecurity).
 */
class SecureWindowAnchorView(context: Context) : ReactViewGroup(context) {

    private var registeredFragment: Fragment? = null

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        val fragment = FragmentFinder.findFragment(this) ?: return
        registeredFragment = fragment
        SecureWindowController.registerSecuredFragment(fragment)
    }

    override fun onDetachedFromWindow() {
        registeredFragment?.let { SecureWindowController.unregisterSecuredFragment(it) }
        registeredFragment = null
        super.onDetachedFromWindow()
    }
}
