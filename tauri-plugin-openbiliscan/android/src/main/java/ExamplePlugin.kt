package com.plugin.openbiliscan

import android.app.Activity
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import app.tauri.plugin.Invoke
import android.widget.Toast
import android.content.ActivityNotFoundException
import android.net.Uri
import android.content.Intent

@InvokeArg
class PingArgs {
  var value: String? = null
}

@TauriPlugin
class ExamplePlugin(private val activity: Activity): Plugin(activity) {
    private val implementation = Example()

    @Command
    fun ping(invoke: Invoke) {
     // 打开哔站移动端扫一扫功能
        try {
            Intent(Intent.ACTION_VIEW, Uri.parse("bilibili://qrscan")).also {
                it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                activity.startActivity(it)
            }
            val args = invoke.parseArgs(PingArgs::class.java)
            Toast.makeText(activity, args.value, Toast.LENGTH_SHORT).show()
            val ret = JSObject()
            ret.put("value", implementation.pong(args.value ?: "default value :("))
            invoke.resolve(ret)
        } catch (e: ActivityNotFoundException) {
            // 处理未安装B站应用的情况
            Toast.makeText(activity, "未找到哔哩哔哩应用", Toast.LENGTH_SHORT).show()
            invoke.reject("哔哩哔哩应用未安装")
        }
    }
}
