package com.plugin.openbiliscan

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Environment
import android.widget.Toast
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import app.tauri.plugin.Invoke
import com.google.zxing.BarcodeFormat
import com.google.zxing.MultiFormatWriter
import com.google.zxing.WriterException
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import android.util.Log

@InvokeArg
class PingArgs {
    var value: String? = null
}

@TauriPlugin
class ExamplePlugin(private val activity: Activity) : Plugin(activity) {
    private val implementation = Example()

    @Command
    fun ping(invoke: Invoke) {
        try {
            val args = invoke.parseArgs(PingArgs::class.java)
            val value = args.value ?: run {
                invoke.reject("未提供链接参数")
                return
            }
            Log.i("Ping", value)

            // 生成二维码
            val bitmap = generateQRCode(value) ?: run {
                invoke.reject("生成二维码失败")
                return
            }
            Log.i("ExamplePlugin", "二维码生成成功")

            // 保存二维码图片
            val savedUri = saveImageToGallery(bitmap) ?: run {
                invoke.reject("保存图片失败")
                return
            }
            Log.i("ExamplePlugin", "图片保存成功，Uri: $savedUri")

            // 返回保存的图片路径给前端
            val ret = JSObject()
            ret.put("imageUri", savedUri.toString())
            invoke.resolve(ret)

            // 跳转哔站app扫一扫功能
            Intent(Intent.ACTION_VIEW, Uri.parse("bilibili://qrscan")).also {
                it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                activity.startActivity(it)
            }
        } catch (e: ActivityNotFoundException) {
            Toast.makeText(activity, "未找到哔哩哔哩应用", Toast.LENGTH_SHORT).show()
            invoke.reject("哔哩哔哩应用未安装")
        } catch (e: Exception) {
            Log.e("ExamplePlugin", "处理二维码时出错", e)
            invoke.reject("处理二维码时出错: ${e.message}")
        }
    }

    /**
     * 生成二维码图片
     */
    private fun generateQRCode(content: String, width: Int = 500, height: Int = 500): Bitmap? {
        try {
            val bitMatrix = MultiFormatWriter().encode(content, BarcodeFormat.QR_CODE, width, height)
            val pixels = IntArray(width * height)
            
            for (y in 0 until height) {
                val offset = y * width
                for (x in 0 until width) {
                    pixels[offset + x] = if (bitMatrix[x, y]) 0xFF000000.toInt() else 0xFFFFFFFF.toInt()
                }
            }
            
            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            bitmap.setPixels(pixels, 0, width, 0, 0, width, height)
            return bitmap
        } catch (e: WriterException) {
            Log.e("ExamplePlugin", "生成二维码失败", e)
            return null
        }
    }

    /**
     * 保存图片到相册
     */
    private fun saveImageToGallery(bitmap: Bitmap): Uri? {
        val imagesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)
        val fileName = "abiMusic_Login_QrCode.jpg"
        val file = File(imagesDir, fileName)

        try {
            FileOutputStream(file).use { outputStream ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, 100, outputStream)
                outputStream.flush()
            }

            // 通知系统更新相册
            val mediaScanIntent = Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE)
            val contentUri = Uri.fromFile(file)
            mediaScanIntent.data = contentUri
            activity.sendBroadcast(mediaScanIntent)

            return contentUri
        } catch (e: IOException) {
            Log.e("ExamplePlugin", "保存图片失败", e)
            return null
        }
    }
}    