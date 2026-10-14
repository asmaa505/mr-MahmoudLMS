package com.mrmahmoud.lms

import android.os.Bundle
import android.view.WindowManager
import com.getcapacitor.BridgeActivity

/**
 * Android Native Security Enforcement for Mr. Mahmoud LMS
 * 
 * Sets FLAG_SECURE on window initialization.
 * Result:
 * 1. Blocks ALL screenshots (Volume Down + Power Button shows "Can't take screenshot due to security policy").
 * 2. Blocks ALL screen recording apps (OBS, AZ Screen Recorder, built-in OS screen recorders render a pitch black screen).
 * 3. Hides window content in Android Recent Apps overview (multitasking switcher).
 */
class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Enforce FLAG_SECURE hardware protection
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        )
    }

    override fun onResume() {
        super.onResume()
        // Re-enforce FLAG_SECURE whenever app returns to foreground
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        )
    }
}
