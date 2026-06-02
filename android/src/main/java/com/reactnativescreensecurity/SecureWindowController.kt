package com.reactnativescreensecurity

import android.app.Activity
import android.app.Application
import android.os.Handler
import android.os.Looper
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
 * 2. Activity-scoped ref-count — fallback when no Fragment is found.
 * 3. Per-fragment registration — toggled when a secured fragment resumes/pauses.
 */
internal object SecureWindowController {

    private val securedFragments =
        Collections.newSetFromMap(WeakHashMap<Fragment, Boolean>())

    private var globalSecureRefCount = 0
    private var activityScopedRefCount = 0
    private var lifecycleCallbacks: FragmentManager.FragmentLifecycleCallbacks? = null
    private var registeredActivity: FragmentActivity? = null
    private var activeSecureFragment: Fragment? = null
    private var reactContextRef: WeakReference<ReactApplicationContext>? = null
    private var pendingGlobalSecure: Boolean? = null
    private var appCallbacks: Application.ActivityLifecycleCallbacks? = null

    /** Invoked on each Activity resume (e.g. re-register screenshot callback). */
    var activityResumedHandler: ((Activity) -> Unit)? = null

    fun initialize(context: ReactApplicationContext) {
        runOnMainThread {
            initializeInternal(context)
        }
    }

    private fun initializeInternal(context: ReactApplicationContext) {
        reactContextRef = WeakReference(context)
        val app = context.applicationContext as? Application ?: return
        if (appCallbacks != null) return

        val callbacks = object : Application.ActivityLifecycleCallbacks {
            override fun onActivityResumed(activity: Activity) {
                activityResumedHandler?.invoke(activity)
                val fragmentActivity = activity as? FragmentActivity ?: run {
                    updateWindowSecureState()
                    return
                }
                reRegisterFragmentCallbacks(fragmentActivity)
                updateWindowSecureState()
            }

            override fun onActivityDestroyed(activity: Activity) {
                if (registeredActivity === activity) {
                    unregisterFragmentLifecycleCallbacks()
                }
            }

            override fun onActivityCreated(activity: Activity, savedInstanceState: android.os.Bundle?) {}
            override fun onActivityStarted(activity: Activity) {}
            override fun onActivityPaused(activity: Activity) {}
            override fun onActivityStopped(activity: Activity) {}
            override fun onActivitySaveInstanceState(activity: Activity, outState: android.os.Bundle) {}
        }

        app.registerActivityLifecycleCallbacks(callbacks)
        appCallbacks = callbacks
    }

    fun destroy() {
        runOnMainThread {
            destroyInternal()
        }
    }

    private fun destroyInternal() {
        val app = reactContextRef?.get()?.applicationContext as? Application
        appCallbacks?.let { app?.unregisterActivityLifecycleCallbacks(it) }
        appCallbacks = null
        activityResumedHandler = null
        unregisterFragmentLifecycleCallbacks()
        securedFragments.clear()
        globalSecureRefCount = 0
        activityScopedRefCount = 0
        activeSecureFragment = null
        pendingGlobalSecure = null
        applySecureFlag(false)
        reactContextRef = null
    }

    fun adjustGlobalSecureRefCount(delta: Int) {
        runOnMainThread {
            val previous = globalSecureRefCount
            globalSecureRefCount = maxOf(globalSecureRefCount + delta, 0)

            if (globalSecureRefCount == 0 && previous > 0) {
                activeSecureFragment = null
            }

            updateWindowSecureState()
        }
    }

    fun adjustActivityScopedRefCount(delta: Int) {
        runOnMainThread {
            activityScopedRefCount = maxOf(activityScopedRefCount + delta, 0)
            updateWindowSecureState()
        }
    }

    fun registerSecuredFragment(fragment: Fragment) {
        runOnMainThread {
            securedFragments.add(fragment)
            ensureFragmentCallbacksRegistered()

            if (fragment.isResumed) {
                updateWindowSecureState()
            }
        }
    }

    fun unregisterSecuredFragment(fragment: Fragment) {
        runOnMainThread {
            securedFragments.remove(fragment)

            if (activeSecureFragment == fragment) {
                activeSecureFragment = null
            }

            updateWindowSecureState()
        }
    }

    fun isSecureWindowActive(): Boolean {
        if (globalSecureRefCount > 0 || activityScopedRefCount > 0) {
            return true
        }
        val activity = getFragmentActivity() ?: return securedFragments.isNotEmpty()
        return collectFragments(activity.supportFragmentManager).any {
            it.isResumed && securedFragments.contains(it)
        }
    }

    private fun reRegisterFragmentCallbacks(activity: FragmentActivity) {
        if (registeredActivity === activity && lifecycleCallbacks != null) {
            return
        }
        unregisterFragmentLifecycleCallbacks()
        registerFragmentCallbacks(activity)
    }

    private fun ensureFragmentCallbacksRegistered() {
        val activity = getFragmentActivity() ?: return
        reRegisterFragmentCallbacks(activity)
    }

    private fun registerFragmentCallbacks(activity: FragmentActivity) {
        val callbacks = object : FragmentManager.FragmentLifecycleCallbacks() {
            override fun onFragmentResumed(fm: FragmentManager, f: Fragment) {
                if (globalSecureRefCount > 0 || activityScopedRefCount > 0) {
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
                if (globalSecureRefCount > 0 || activityScopedRefCount > 0) {
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
        if (globalSecureRefCount > 0 || activityScopedRefCount > 0) {
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
        if (enable) {
            activity.window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        } else {
            activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
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

    private fun runOnMainThread(block: () -> Unit) {
        if (Looper.myLooper() == Looper.getMainLooper()) {
            block()
        } else {
            Handler(Looper.getMainLooper()).post(block)
        }
    }
}
