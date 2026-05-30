package com.reactnativescreensecurity

import android.view.WindowManager
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity
import androidx.fragment.app.FragmentManager
import com.facebook.react.bridge.ReactApplicationContext
import java.lang.ref.WeakReference
import java.util.Collections
import java.util.WeakHashMap

/**
 * Orchestrates window-level [FLAG_SECURE] based on:
 * 1. Global ref-count ([adjustGlobalSecureRefCount]) — app-wide protection.
 * 2. Per-fragment registration — toggled when a secured fragment resumes/pauses.
 */
internal object SecureWindowController {

    private val securedFragments =
        Collections.newSetFromMap(WeakHashMap<Fragment, Boolean>())

    private var globalSecureRefCount = 0
    private var lifecycleCallbacks: FragmentManager.FragmentLifecycleCallbacks? = null
    private var registeredActivity: FragmentActivity? = null
    private var activeSecureFragment: Fragment? = null
    private var reactContextRef: WeakReference<ReactApplicationContext>? = null
    private var pendingGlobalSecure: Boolean? = null

    fun initialize(context: ReactApplicationContext) {
        reactContextRef = WeakReference(context)
    }

    fun destroy() {
        unregisterFragmentLifecycleCallbacks()
        securedFragments.clear()
        globalSecureRefCount = 0
        activeSecureFragment = null
        pendingGlobalSecure = null
        applySecureFlag(false)
        reactContextRef = null
    }

    fun onHostResume() {
        pendingGlobalSecure?.let { enable ->
            if (globalSecureRefCount > 0) {
                applySecureFlag(enable)
            }
            pendingGlobalSecure = null
        }
        ensureFragmentCallbacksRegistered()
        updateWindowSecureState()
    }

    fun adjustGlobalSecureRefCount(delta: Int) {
        val previous = globalSecureRefCount
        globalSecureRefCount = maxOf(globalSecureRefCount + delta, 0)

        if (globalSecureRefCount == 0 && previous > 0) {
            activeSecureFragment = null
        }

        updateWindowSecureState()
    }

    fun registerSecuredFragment(fragment: Fragment) {
        securedFragments.add(fragment)
        ensureFragmentCallbacksRegistered()

        if (fragment.isResumed) {
            updateWindowSecureState()
        }
    }

    fun unregisterSecuredFragment(fragment: Fragment) {
        securedFragments.remove(fragment)

        if (activeSecureFragment == fragment) {
            activeSecureFragment = null
        }

        updateWindowSecureState()
    }

    private fun ensureFragmentCallbacksRegistered() {
        val activity = getFragmentActivity() ?: return

        if (registeredActivity === activity && lifecycleCallbacks != null) {
            return
        }

        unregisterFragmentLifecycleCallbacks()

        val callbacks = object : FragmentManager.FragmentLifecycleCallbacks() {
            override fun onFragmentResumed(fm: FragmentManager, f: Fragment) {
                if (globalSecureRefCount > 0) {
                    applySecureFlag(true)
                    return
                }

                if (securedFragments.contains(f)) {
                    activeSecureFragment = f
                    applySecureFlag(true)
                } else if (activeSecureFragment != null && !isAnySecuredFragmentResumed(fm)) {
                    activeSecureFragment = null
                    applySecureFlag(false)
                }
            }

            override fun onFragmentPaused(fm: FragmentManager, f: Fragment) {
                if (globalSecureRefCount > 0) {
                    return
                }

                if (f == activeSecureFragment) {
                    activeSecureFragment = null
                    applySecureFlag(false)
                }
            }
        }

        activity.supportFragmentManager.registerFragmentLifecycleCallbacks(callbacks, true)
        lifecycleCallbacks = callbacks
        registeredActivity = activity
    }

    private fun isAnySecuredFragmentResumed(fm: FragmentManager): Boolean {
        return collectFragments(fm).any { it.isResumed && securedFragments.contains(it) }
    }

    private fun collectFragments(fm: FragmentManager): List<Fragment> {
        return fm.fragments.flatMap { fragment ->
            listOf(fragment) + collectFragments(fragment.childFragmentManager)
        }
    }

    private fun updateWindowSecureState() {
        if (globalSecureRefCount > 0) {
            applySecureFlag(true)
            return
        }

        val activity = getFragmentActivity() ?: return
        val fm = activity.supportFragmentManager

        val resumedSecured = collectFragments(fm).firstOrNull {
            it.isResumed && securedFragments.contains(it)
        }

        if (resumedSecured != null) {
            activeSecureFragment = resumedSecured
            applySecureFlag(true)
        } else {
            activeSecureFragment = null
            applySecureFlag(false)
        }
    }

    private fun applySecureFlag(enable: Boolean) {
        val activity = getFragmentActivity()
        if (activity == null) {
            if (globalSecureRefCount > 0) {
                pendingGlobalSecure = enable
            }
            return
        }

        pendingGlobalSecure = null
        activity.runOnUiThread {
            if (enable) {
                activity.window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
            } else {
                activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
            }
        }
    }

    private fun getFragmentActivity(): FragmentActivity? {
        val activity = reactContextRef?.get()?.currentActivity
        return activity as? FragmentActivity
    }

    private fun unregisterFragmentLifecycleCallbacks() {
        val activity = registeredActivity ?: return
        lifecycleCallbacks?.let {
            try {
                activity.supportFragmentManager.unregisterFragmentLifecycleCallbacks(it)
            } catch (_: IllegalStateException) {
                // Activity is already destroyed.
            }
        }
        lifecycleCallbacks = null
        registeredActivity = null
    }
}
