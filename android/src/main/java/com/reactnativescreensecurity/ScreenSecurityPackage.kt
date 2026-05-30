package com.reactnativescreensecurity

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager

class ScreenSecurityPackage : BaseReactPackage() {

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return if (name == ScreenSecurityModule.NAME) {
            ScreenSecurityModule(reactContext)
        } else {
            null
        }
    }

    override fun createViewManagers(
        reactContext: ReactApplicationContext,
    ): List<ViewManager<in Nothing, in Nothing>> {
        return listOf(SecureWindowAnchorViewManager())
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider {
            mapOf(
                ScreenSecurityModule.NAME to ReactModuleInfo(
                    ScreenSecurityModule.NAME,
                    ScreenSecurityModule.NAME,
                    false,
                    false,
                    false,
                    true
                )
            )
        }
    }
}
