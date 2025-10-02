class TreeFormData {
    /**
     * @param {string} formSelector - Selector CSS untuk elemen induk formulir (misalnya, '#form').
     */
    constructor(formSelector) {
        this.form = document.querySelector(formSelector);
        this.locationIntervalId = null; 
        
        // --- GANTI URL INI DENGAN URL GOOGLE APPS SCRIPT (GAS) ATAU API TUJUAN ANDA ---
        this.TARGET_GAS_URL = "https://pohon.dlhpambon2025.workers.dev/"
        if (!this.form) {
            console.error("Initialization Error: Form element not found with selector:", formSelector);
            return;
        }

        // --- REFERENSI ELEMEN ---
        this.elements = {
            nama: document.getElementById('nama'),
            usia: document.getElementById('usia'),
            diameter: document.getElementById('diameter'),
            lebarTajuk: document.getElementById('tajuk'), 
            latLong: document.getElementById('LatLong'),
            keterangan: document.getElementById('keterangan'),
            radioGroup: 'lokasi_jalan', 
            radioContainer: document.querySelector('.radio-list'),
            submitButton: this.form.querySelector('button.bolder'),
            locationIcon: document.querySelector('.flex-beetwen .blue.flex-center') 
        };

        // --- DAFTAR KOLOM WAJIB ---
        this.requiredFields = [
            { key: 'Nama', label: 'Nama Pohon', element: this.elements.nama, isInput: true },
            { key: 'Usia', label: 'Usia Pohon', element: this.elements.usia, isInput: true },
            { key: 'Diameter', label: 'Diameter Pohon', element: this.elements.diameter, isInput: true },
            { key: 'Tajuk', label: 'Lebar Tajuk', element: this.elements.lebarTajuk, isInput: true },
            { key: 'Lokasi', label: 'Lokasi Jalan', element: this.elements.radioContainer, isInput: false },
            { key: 'Koordinat', label: 'Position (LatLong)', element: this.elements.latLong, isInput: true }
        ];

        this.init();
    }

    // --- INISIALISASI & EVENT HANDLERS ---
    
    init() {
        this.attachEventListeners();
        this.autoDetectLocation(); // Mulai deteksi lokasi otomatis
    }

    attachEventListeners() {
        if (this.elements.submitButton) {
            this.elements.submitButton.addEventListener('click', (e) => {
                e.preventDefault(); 
                this.handleSubmit();
            });
        }
    }
    
    // --- LOGIKA GEOLOCATION (Sama seperti sebelumnya) ---

    autoDetectLocation() {
        const latLongInput = this.elements.latLong;
        
        if (navigator.geolocation) {
            latLongInput.placeholder = "Mencoba mendeteksi lokasi...";
            
            const options = { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 };
            const success = (position) => this.showSuccess(position);
            const error = (err) => this.showError(err);
            
            navigator.geolocation.getCurrentPosition(success, error, options);
            setInterval(() => {
                navigator.geolocation.getCurrentPosition(success, error, options);
            }, 2000); 

        } else {
            latLongInput.placeholder = "Geolocation tidak didukung.";
            this.updateLocationIcon('fail');
        }
    }

    stopLocationDetection() {

    }

    updateLocationIcon(status) {
        if (this.elements.locationIcon) {
            if (status === 'success') {
                this.elements.locationIcon.innerHTML = '&nbsp;&nbsp;<i class="fas fa-check-circle clr-green"></i>&nbsp;&nbsp;';
            } else if (status === 'fail') {
                this.elements.locationIcon.innerHTML = '&nbsp;&nbsp;<i class="fas fa-exclamation-triangle clr-red"></i>&nbsp;&nbsp;';
            }
        }
    }

    showSuccess(position) {
        this.stopLocationDetection();
        const lat = position.coords.latitude.toFixed(6); 
        const lon = position.coords.longitude.toFixed(6); 
        this.elements.latLong.value = `${lat}, ${lon}`;
        this.elements.latLong.placeholder = "Lokasi terdeteksi";
        this.updateLocationIcon('success');
    }

    showError(error) {
        let pesan;
        switch(error.code) {
            case error.PERMISSION_DENIED:
                pesan = "Akses lokasi ditolak.";
                this.stopLocationDetection();
                break;
            case error.TIMEOUT:
                pesan = "Deteksi lokasi gagal (Timeout). Mencoba lagi...";
                break;
            default:
                pesan = "Gagal mendeteksi lokasi. Mencoba lagi...";
        }
        if (!this.elements.latLong.value) {
            this.elements.latLong.placeholder = pesan;
        }
        this.updateLocationIcon('fail');
    }

    // --- DATA COLLECTION & VALIDATION LOGIC ---

    collectData() {
        const selectedRadio = document.querySelector(`input[name="${this.elements.radioGroup}"]:checked`);
        const lokasiJalan = selectedRadio ? selectedRadio.value : '';

        return {
            Lokasi      : lokasiJalan,
            Koordinat   : this.elements.latLong.value.trim(),
            Nama        : this.elements.nama.value.trim(),
            Usia        : this.elements.usia.value.trim(),
            Diameter    : this.elements.diameter.value.trim(),
            Tajuk       : this.elements.lebarTajuk.value.trim(),
            Keterangan  : this.elements.keterangan.value.trim()
        };
    }

    validateAndProvideFeedback(data) {
        console.log(data)
        let isValid = true;
        
        // 1. Reset Feedback Visual
        this.requiredFields.forEach(field => {
            if (field.element) {
                field.element.classList.remove('is-invalid');
                if (field.isInput) {
                    const defaultPlaceholder = field.element.id ? field.element.getAttribute('placeholder') : 'Jawaban Anda';
                    field.element.placeholder = defaultPlaceholder; 
                }
            }
        });

        // 2. Validasi dan Terapkan Feedback Merah
        this.requiredFields.forEach(field => {
            const value = data[field.key];
            
            if (!value || value.length === 0) { 
                console.log(value)
                const el = field.element;
                if (el) {
                    el.classList.add('is-invalid');
                    if (field.isInput && field.key != 'Koordinat') el.placeholder = `[ WAJIB DIISI ] ${field.label}`;
                }
                isValid = false;
            }
        });

        return isValid;
    }

    // --- LOGIKA FETCH (GET REQUEST) ---

    async sendDataAsQuery(data) {

        STATIC.loaderRun("Mengirim Data...")

        try {
            const post = await new RequestManager().post({
                data : data
            })
            
            if (!post.confirm) throw new Error(post.error.message)
            else if (!post.data.confirm) {
                throw new Error("Server Respon")
            }
            else if (post.data.confirm) {
                STATIC.loaderStop()
                const verify = STATIC.verifyController({
                    text : "Auto refresh in 5 seconds",
                    head : "Data Terkirim",
                }).show(async () => {
                    let counter = 5
                    const interval = setInterval(() => {
                        document.querySelector("#verify-text").textContent = "Auto refresh in " +  counter + " seconds"
                        counter --
                        if (counter <= 0) return window.location.reload()
                    }, 1000)
                })
            }

        } catch (error) {
            STATIC.loaderStop()
            STATIC.verifyController({
                status : 'denied',
                head : "Error",
                text : "Error : " + error
            })
            console.error("Fetch failed:", error);
        }
    }

    // --- HANDLE SUBMIT UTAMA ---

    handleSubmit() {
        const data = this.collectData();
        const isValid = this.validateAndProvideFeedback(data);

        if (isValid) {
            this.stopLocationDetection(); // Hentikan deteksi lokasi sebelum submit
            
            // --- KIRIM DATA MENGGUNAKAN FETCH GET ---
            this.sendDataAsQuery(data); 
            
        } else {
            alert("Mohon lengkapi SEMUA kolom yang WAJIB DIISI.");
        }
    }
}

// -------------------------------------------------------------
// EKSEKUSI CLASS
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Inisialisasi class, menargetkan div utama form (id="form")
    new TreeFormData('#form'); 
    setTimeout(() => {
        document.querySelector("#loader").classList.add("dis-none")
    }, 2000);
});



class RequestManager {
    constructor(main) {
        this.maxRetries         = 3;
        this.retryDelay         = 1000;      // ms
        this.timeoutMs          = 60000;    // ms
        this.deferWhenHidden    = false;
        this.maxHiddenDeferMs   = 4000;
        this.appCTRL            = {
            baseURL : "https://pohon.dlhpambon2025.workers.dev/?"
        };
        this.baseURL            = (typeof STATIC !== "undefined" && STATIC.URL) ? STATIC.URL : "https://pohon.dlhpambon2025.workers.dev/?";
        var self = this;
        if (!Object.getOwnPropertyDescriptor(this, "URL")) {
            Object.defineProperty(this, "URL", {
                enumerable   : true,
                configurable : false,
                get          : function () {
                    var raw = (self.appCTRL && self.appCTRL.baseURL) ? self.appCTRL.baseURL : self.baseURL;
                    return self._normalizeBaseURL(raw);
                }
            });
        }
    }

    // ====== PUBLIC ======
    async isOnline() {
        return await this.appCTRL.connect.isOnLine();
    }

    _log() { 
        try { 
            var args = Array.prototype.slice.call(arguments);
            console.log.apply(console, ["[RequestManager]"].concat(args)); 
        } catch(_) {}
    }

    async post(pathOrData, dataArg, optionsArg) {
        var path = "", data = {}, options = {};
        if (typeof pathOrData === "string") {
            path = pathOrData || "";
            data = dataArg || {};
            options = optionsArg || {};
        } else {
            data = pathOrData || {};
            options = dataArg || {};
        }

        var base = this._requireBaseURL();                 // <- perbaikan utama
        var url  = this._joinURL(base, path);
        var isOnLine = true //await this.isOnline()
        //console.log(isOnLine, "BEN")
        if (!isOnLine) {
            var offlineRes = this._makeResult(false, "OFFLINE", null, {
                code: "OFFLINE",
                message: "Tidak ada koneksi internet."
            }, url, 0, 0, false);
            this._log("📴 OFFLINE:", offlineRes);
            this._safeToast("error", "Perangkat sedang offline!");
            return offlineRes;
        }
        this._log("Sending Request")

        if (this.deferWhenHidden && typeof document !== "undefined" && document.hidden) {
            this._log("⏸️ Menunda POST karena tab hidden");
            await this._waitUntilVisible(this.maxHiddenDeferMs);
        }

        var requestId = this._makeUUID();
        var headers = Object.assign({
            "Accept": "application/json, text/plain;q=0.9, */*;q=0.8",
            "Idempotency-Key": requestId
        }, options.headers || {});

        var body = null;
        var isFormData = (typeof FormData !== "undefined") && (data instanceof FormData);
        if (isFormData) {
            body = data;
            delete headers["Content-Type"];
        } else {
            headers["Content-Type"] = headers["Content-Type"] || "application/json";
            body = headers["Content-Type"].indexOf("application/json") >= 0 ? JSON.stringify(data || {}) : (data || "");
        }

        var attempt = 0;
        var retried = false;
        var startAll = this._nowMs();

        while (attempt < this.maxRetries) {
            attempt++;
            var controller = new AbortController();
            var to = setTimeout(function () { try{ controller.abort("TIMEOUT"); }catch(_){}} , this.timeoutMs);

            try {
                this._log("📤 POST attempt " + attempt + "/" + this.maxRetries, { url: url });
                var res = await fetch("https://pohon.dlhpambon2025.workers.dev/?", {
                    method: "POST",
                    headers: headers,
                    body: body,
                    signal: controller.signal
                });
                clearTimeout(to);

                var parsed = await this._smartParseResponse(res);

                if (res.ok) {
                    var okRes = this._makeResult(true, "SUCCESS", res.status, null, url, attempt, this._nowMs() - startAll, retried, requestId, parsed.data);
                    this._log("✅ Sukses:", okRes);
                    return okRes;
                }

                if (!this._shouldRetryHTTP(res) || attempt >= this.maxRetries) {
                    var failRes = this._makeResult(false, this._statusFromHttp(res.status), res.status, {
                        code: parsed.errorCode || "ERROR",
                        message: parsed.errorMessage || ("Gagal (status " + res.status + ")")
                    }, url, attempt, this._nowMs() - startAll, retried, requestId, parsed.data);
                    this._safeToast("error", failRes.error.message);
                    return failRes;
                }

                retried = true;
                await this._delay(this._computeBackoff(attempt, this.retryDelay, res));

            } catch (err) {
                clearTimeout(to);

                var code = this._classifyFetchError(err);
                if (code === "ABORTED") {
                    return this._makeResult(false, "ABORTED", null, { code: code, message: "Dibatalkan." }, url, attempt, this._nowMs() - startAll, retried, requestId);
                }

                if (attempt >= this.maxRetries) {
                    var fail = this._makeResult(false, code, null, {
                        code: code,
                        message: this._readableFetchError(err, code)
                    }, url, attempt, this._nowMs() - startAll, retried, requestId);
                    this._safeToast("error", fail.error.message);
                    return fail;
                }

                retried = true;
                await this._delay(this._computeBackoff(attempt, this.retryDelay));
            }
        }

        return this._makeResult(false, "FAILED", null, {
            code: "UNKNOWN",
            message: "Gagal tanpa alasan yang diketahui."
        }, url, attempt, this._nowMs() - startAll, retried, requestId);
    }

    // ====== PRIVATE UTILS ======
    _normalizeBaseURL(u) {
        if (typeof u !== "string") return "";
        var s = u.trim();
        if (!s) return "";
        if (/^\/\//.test(s)) s = "https:" + s;
        if (!/^https?:\/\//i.test(s)) s = "https://" + s;
        s = s.replace(/\/+$/, "");
        return s;
    }
    _requireBaseURL() {
        var u = this.URL;
        console.log("Base URL:", u);
        if (!u) throw new Error("RequestManager.baseURL belum diset (AppController/baseURL kosong).");
        return u;
    }
    _nowMs() {
        try { return (typeof performance !== "undefined" && typeof performance.now === "function") ? performance.now() : Date.now(); }
        catch(_) { return Date.now(); }
    }
    _delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    _makeUUID() {
        try { return (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + "-" + Math.random().toString(16).slice(2)); }
        catch(_) { return (Date.now() + "-" + Math.random().toString(16).slice(2)); }
    }
    _joinURL(base, p) {
        if (!p) return base;
        if (base.endsWith("/") && p.startsWith("/")) return base + p.slice(1);
        if (!base.endsWith("/") && !p.startsWith("/")) return base + "/" + p;
        return base + p;
    }
    _makeResult(confirm, status, httpStatus, errorObj, url, attempt, durationMs, retried, requestId, data) {
        return {
            confirm: !!confirm,
            status : status,
            httpStatus: (typeof httpStatus === "number") ? httpStatus : null,
            data   : data || null,
            error  : errorObj || null,
            meta   : {
                requestId : requestId || this._makeUUID(),
                attempt   : attempt || 0,
                retried   : !!retried,
                durationMs: Math.max(0, Math.round(durationMs || 0)),
                url       : url
            }
        };
    }
    async _smartParseResponse(res) {
        var ct = (res.headers.get("Content-Type") || "").toLowerCase();
        var out = { data: null, errorMessage: null, errorCode: null, raw: null };
        try {
            if (ct.indexOf("application/json") >= 0) {
                out.data = await res.json();
                if (!res.ok) {
                    out.errorMessage = (out.data && (out.data.message || out.data.error || out.data.msg)) || null;
                    out.errorCode    = (out.data && (out.data.code    || out.data.errorCode)) || null;
                }
            } else if (ct.indexOf("text/") >= 0) {
                var txt = await res.text();
                out.raw = txt;
                try { out.data = JSON.parse(txt); } catch(_) { out.data = txt; }
                if (!res.ok) out.errorMessage = (typeof out.data === "string") ? out.data.slice(0, 300) : null;
            } else {
                // blob/unknown
                try { out.raw = await res.blob(); } catch(_) { out.raw = null; }
                out.data = out.raw;
            }
        } catch(_) {
            out.errorMessage = "Gagal mem-parse respons server.";
            out.errorCode = "PARSE_ERROR";
        }
        return out;
    }
    _shouldRetryHTTP(res) {
        var s = res.status;
        return (s === 408 || s === 425 || s === 429 || (s >= 500 && s <= 599));
    }
    _statusFromHttp(s) {
        if (s === 429) return "THROTTLED";
        if (s === 408) return "TIMEOUT";
        if (s >= 500) return "SERVER_ERROR";
        if (s >= 400) return "CLIENT_ERROR";
        return "FAILED";
    }
    _computeBackoff(attempt, baseDelay, res) {
        var retryAfterMs = 0;
        try {
            var ra = res && res.headers && res.headers.get && res.headers.get("Retry-After");
            if (ra) {
                var sec = parseInt(ra, 10);
                if (!isNaN(sec)) retryAfterMs = sec * 1000;
            }
        } catch(_) {}
        var expo   = Math.min(30000, Math.round(baseDelay * Math.pow(2, Math.max(0, attempt - 1))));
        var jitter = Math.floor(Math.random() * Math.min(1000, baseDelay));
        return Math.max(retryAfterMs, expo + jitter);
    }
    _classifyFetchError(err) {
        var msg = (err && (err.message || "")) || "";
        var name = (err && err.name) || "";
        if (name === "AbortError" || msg === "ABORTED") return "ABORTED";
        if (msg === "TIMEOUT") return "TIMEOUT";
        // Heuristik: kalau online tapi gagal, kemungkinan CORS; kalau offline, network error

        return (typeof navigator !== "undefined" && navigator.onLine) ? "CORS" : "NETWORK_ERROR";
    }
    _readableFetchError(err, code) {
        if (code === "TIMEOUT") return "Timeout! Periksa koneksi.";
        if (code === "CORS")    return "Permintaan diblokir oleh kebijakan CORS.";
        if (code === "NETWORK_ERROR") return "Jaringan error. Cek koneksi.";
        if (code === "ABORTED") return "Permintaan dibatalkan.";
        return (err && err.message) || "Terjadi kesalahan jaringan.";
    }
    async _waitUntilVisible(ms) {
        if (typeof document === "undefined" || !document.hidden) return;
        return new Promise(function (resolve) {
            var t = setTimeout(function () { resolve(); }, Math.max(0, ms || 0));
            function onVis() {
                if (!document.hidden) { clearTimeout(t); resolve(); }
            }
            document.addEventListener("visibilitychange", onVis, { once: true });
        });
    }
    _safeToast(type, msg) {
        try {
            if (!msg) return;
            if (typeof STATIC !== "undefined" && typeof STATIC.toast === "function") {
                STATIC.toast(msg, type || "info");
            }
        } catch(_) {}
    }
}

class STATIC {
    
    static changeContent(targetId) {
        const allSections = document.querySelectorAll(".content");
        allSections.forEach(el => el.classList.add("dis-none"));
        const target = document.getElementById(targetId);
        if (!target) return undefined
        target.classList.remove("dis-none");
        console.log("[STATIC] Change Content :", targetId)
        return true
    }
    static verifyController(data){
        return {
            show : (callback = "") => {
                STATIC.changeContent("verify")
                document.querySelector("#verify h4").innerHTML        = data.head
                document.querySelector("#verify span").innerHTML      = data.text
                if (data.status == 'denied') {
                    document.querySelector("#verify i").className       = "fas fa-x fz-30 grid-center m-auto clr-red"
                    document.querySelector("#verify-data").className    = "align-center clr-red"
                }
                else {
                    document.querySelector("#verify i").className       = "fas fa-check fz-30 grid-center m-auto clr-blue"
                    document.querySelector("#verify-data").className    = "align-center clr-blue"
                }
                if(typeof callback === "function") callback()
            },
            clear : (callback = "") => {
                document.querySelector("#verify").classList.add("dis-none")
                document.querySelector("#verify h4").innerHTML = ""
                document.querySelector("#verify span").innerHTML = ""
                document.querySelector("#verify i").className = ""
                
                if(typeof callback === "function") callback()
                else if (typeof callback === "string") this.changeContent(callback)
            }
        }
    }
    static toast(msg, type = "info") {
        const toastEl = document.getElementById("toast");
        if (!toastEl) return console.warn("Toast element not found");
        toastEl.className = `show ${type}`;
        toastEl.innerHTML = msg;
        setTimeout(() => {
            toastEl.classList.remove(`show`, `${type}`);
        }, 3000);
    }
    static async delay (ms, callback = "") {
        await new Promise(resolve => setTimeout(resolve, ms))
        if(typeof callback === "function") return callback()
    }
    static loaderRun(text = 'Sending Request') {
        try {
            document.querySelector("#loader").classList.remove("dis-none");
            document.querySelector("#the-loader").classList.remove("dis-none");
            document.querySelector("#loader-text").textContent = text;
        } catch (err) {
            console.error("[loaderRun] Gagal menampilkan loader :", err);
        }
    }
    static loaderStop(callback = "") {
        document.querySelector("#loader").classList.add("dis-none")
        document.querySelector('#loader-text').textContent = ""
        if (typeof callback === "function") return callback()
    }
}