package com.reactnativescreensecurity

import android.view.View
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentManager

internal object FragmentFinder {

    /**
     * Finds the [Fragment] that owns [view] by walking up the view hierarchy.
     * Works with react-native-screens (ScreenFragment) and standard AndroidX fragments.
     */
    fun findFragment(view: View): Fragment? {
        var current: View? = view
        while (current != null) {
            try {
                val fragment = FragmentManager.findFragment<Fragment>(current)
                if (fragment != null) {
                    return fragment
                }
            } catch (_: IllegalStateException) {
                // View is not yet attached to a FragmentManager — keep climbing.
            }
            current = current.parent as? View
        }
        return null
    }
}
