package com.demos.app

import android.net.Uri
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.ComponentActivity
import androidx.lifecycle.lifecycleScope
import com.solana.mobilewalletadapter.clientlib.ActivityResultSender
import com.solana.mobilewalletadapter.clientlib.ConnectionIdentity
import com.solana.mobilewalletadapter.clientlib.MobileWalletAdapter
import com.solana.mobilewalletadapter.clientlib.Solana
import com.solana.mobilewalletadapter.clientlib.TransactionResult
import kotlinx.coroutines.launch
import org.json.JSONObject

/**
 * Мост веб-версии DEMOS с Solana Mobile Wallet Adapter (24.10).
 * JS: window.DEMOSNative.mwaConnect(cb), mwaSign(cb, base64Tx), mwaDisconnect(); ответ — window.__nativeCb(cb, ok, value).
 * Сеть — Devnet (тестовая). Кошелёк только подписывает; отправляет транзакцию сама страница — в Devnet.
 */
class MwaBridge(private val activity: ComponentActivity, private val web: WebView) {

    private val sender = ActivityResultSender(activity) // создаётся в onCreate
    private val adapter = MobileWalletAdapter(
        connectionIdentity = ConnectionIdentity(
            identityUri = Uri.parse("https://marsaon0-lang.github.io/demos-app/web/"),
            iconUri = Uri.parse("icon-192.png"),
            identityName = "DEMOS"
        )
    ).apply { blockchain = Solana.Devnet }

    @JavascriptInterface
    fun mwaAvailable(): Boolean = true

    @JavascriptInterface
    fun mwaConnect(cb: String) {
        activity.lifecycleScope.launch {
            when (val r = adapter.connect(sender)) {
                is TransactionResult.Success -> {
                    val pk = r.authResult.accounts.firstOrNull()?.publicKey
                    if (pk != null) reply(cb, true, base58(pk)) else reply(cb, false, "noaccount")
                }
                is TransactionResult.NoWalletFound -> reply(cb, false, "nowallet")
                is TransactionResult.Failure -> reply(cb, false, r.e.message ?: "cancel")
            }
        }
    }

    @Suppress("DEPRECATION")
    @JavascriptInterface
    fun mwaSign(cb: String, txBase64: String) {
        val tx = Base64.decode(txBase64, Base64.NO_WRAP)
        activity.lifecycleScope.launch {
            val r = adapter.transact(sender) { signTransactions(arrayOf(tx)) }
            when (r) {
                is TransactionResult.Success -> {
                    val signed = r.successPayload?.signedPayloads?.firstOrNull()
                    if (signed != null) reply(cb, true, Base64.encodeToString(signed, Base64.NO_WRAP)) else reply(cb, false, "cancel")
                }
                is TransactionResult.NoWalletFound -> reply(cb, false, "nowallet")
                is TransactionResult.Failure -> reply(cb, false, r.e.message ?: "cancel")
            }
        }
    }

    @JavascriptInterface
    fun mwaDisconnect() {
        activity.lifecycleScope.launch { runCatching { adapter.disconnect(sender) } }
    }

    private fun reply(cb: String, ok: Boolean, value: String) {
        web.post { web.evaluateJavascript("window.__nativeCb && window.__nativeCb(${JSONObject.quote(cb)}, $ok, ${JSONObject.quote(value)})", null) }
    }

    private fun base58(input: ByteArray): String {
        val alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
        var zeros = 0
        while (zeros < input.size && input[zeros].toInt() == 0) zeros++
        val digits = ArrayList<Int>()
        for (i in zeros until input.size) {
            var carry = input[i].toInt() and 0xff
            for (j in digits.indices) { carry += digits[j] shl 8; digits[j] = carry % 58; carry /= 58 }
            while (carry > 0) { digits.add(carry % 58); carry /= 58 }
        }
        val sb = StringBuilder()
        repeat(zeros) { sb.append('1') }
        for (k in digits.indices.reversed()) sb.append(alphabet[digits[k]])
        return sb.toString()
    }
}
