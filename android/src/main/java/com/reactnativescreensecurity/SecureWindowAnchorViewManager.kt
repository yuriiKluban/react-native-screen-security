package com.reactnativescreensecurity

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.viewmanagers.RTNSecureWindowAnchorManagerDelegate
import com.facebook.react.viewmanagers.RTNSecureWindowAnchorManagerInterface

class SecureWindowAnchorViewManager :
    SimpleViewManager<SecureWindowAnchorView>(),
    RTNSecureWindowAnchorManagerInterface<SecureWindowAnchorView> {

    private val delegate: RTNSecureWindowAnchorManagerDelegate<SecureWindowAnchorView, SecureWindowAnchorViewManager> =
        RTNSecureWindowAnchorManagerDelegate(this)

    override fun getDelegate() = delegate

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(reactContext: ThemedReactContext): SecureWindowAnchorView {
        return SecureWindowAnchorView(reactContext)
    }

    companion object {
        const val REACT_CLASS = "RTNSecureWindowAnchor"
    }
}
