package com.reactnativescreensecurity

import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager

class SecureWindowAnchorViewManager : ViewGroupManager<SecureWindowAnchorView>() {

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(reactContext: ThemedReactContext): SecureWindowAnchorView {
        return SecureWindowAnchorView(reactContext)
    }

    companion object {
        const val REACT_CLASS = "RTNSecureWindowAnchor"
    }
}
