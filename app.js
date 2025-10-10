// -------------------------------------------------------------
// EKSEKUSI CLASS
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const trx = new tree(); 
    if (navigator.onLine) setTimeout(() => {
            document.querySelector("#loader").classList.add("dis-none")
            trx.pingStart()
        }, 2000);
    else STATIC.loaderRun("OFFLINE")
});
 


class tree {
    constructor () {
        this.request = new RequestManager()

        this.elements = {
            Nama        : document.getElementById('nama'),
            Usia        : document.getElementById('usia'),
            Diameter    : document.getElementById('diameter'),
            Tajuk       : document.getElementById('tajuk'), 
            Koordinat   : document.getElementById('koordinat'),
            Keterangan  : document.getElementById('keterangan')
        };
        this.coordLoader = document.getElementById('loader-koordinat')
        this.getCoord = document.getElementById('getCoord')
        this.coordProscess = false
        this.loaderContent = document.querySelector("#loader-content")
        this.pingInterval = null
        this.pingParam = true
        this.pingLimit = 10000
        this.pingElement = document.getElementById("ping")
        this.recoveryInterval = null
        this.Submit = document.querySelector('button')
        this.reRoad = document.querySelector('i.fa-retweet');
        this.radios = document.querySelectorAll("input[name='lokasi_jalan']")
        //this.autoDetectLocation()
        this.eventListener()
        this.autoRecovery()
        //this.pingStart()
    }
    eventListener(){
        if (this.Submit) {
            this.Submit.addEventListener('click', (e) => {
                e.preventDefault(); 
                this.handleSubmit();
            });
        }
        this.reRoad.onclick = () => {
            this.radios.forEach(el => {
                el.checked = false
                el.disabled = false
                el.classList.remove("opacity-50")
            })
        }  
        this.getCoord.onclick = () => {
            console.log("clicked")
            if (this.coordProscess) return
            this.coordLoader.classList.remove("dis-none")
            this.elements.Koordinat.placeholder = "Mendeteksi lokasi..."
            this.coordProscess = true
            this.autoDetectLocation()
            setTimeout(() => {
                this.coordLoader.classList.add("dis-none")
                this.coordProscess = false
            }, 2000)
        }

        window.addEventListener('online', (event) => {
            console.log("🎉 Koneksi pulih! Browser sekarang ONLINE.");
            // Di sini Anda bisa melanjutkan ping atau sinkronisasi data
            this.loaderContent.classList.remove("off")
            STATIC.loaderRun("CONNECTING")
            setTimeout(() => {
                STATIC.loaderStop()
                this.pingStart()
            }, 2500);
        });
        window.addEventListener('offline', (event) => {
            console.log("🚨 Koneksi terputus! Browser sekarang OFFLINE.");
            // Di sini Anda harus menunda semua operasi ping eksternal
            STATIC.loaderRun("OFFLINE")
            this.loaderContent.classList.add("off")
            this.pingStop()
        });
    }
    setLokasiJalan() {
        const jalan = JSON.parse(localStorage.getItem("lokasi_jalan"));
        let selectionFound = false; // Gunakan boolean flag

        // 1. INISIALISASI DAN KUNCI PADA LOAD
        this.radios.forEach(el => {
            // Cek apakah ada pilihan tersimpan dan cocok
            if (jalan && el.value === jalan) {
                el.disabled = false;
                el.checked = true;
                el.classList.remove("opacity-50");
                selectionFound = true; // Set flag
            } else {
                el.disabled = true;
                el.classList.add("opacity-50");
            }
            
            // 2. TENTUKAN EVENT LISTENER ONCHANGE
            el.onchange = () => {
                // Kunci semua radio button kecuali yang dipilih
                this.radios.forEach(r => {
                    if (r == el) return r.disabled = false;
                    r.disabled = true;
                    r.classList.add("opacity-50");
                });
                
                // Simpan pilihan dan hilangkan opacity pada yang baru dipilih
                localStorage.setItem("lokasi_jalan", JSON.stringify(el.value));
                el.classList.remove("opacity-50");
            };
        });


        // 3. PENANGANAN JIKA TIDAK ADA PILIHAN YANG VALID
        if (!jalan || !selectionFound) return this.reRoad.click();
    }
    autoDetectLocation() {
        const latLongInput = this.elements.Koordinat;
        if (navigator.geolocation) {
            latLongInput.placeholder = "";
            const options = { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 };
            const success = (position) => this.showSuccess(position);
            const error = (err) => this.showError(err);
            navigator.geolocation.getCurrentPosition(success, error, options);
        } else {
            latLongInput.placeholder = "Geolocation tidak didukung.";
        }
    }
    showSuccess(position) {
        const lat = position.coords.latitude; 
        const lon = position.coords.longitude; 
        this.elements.Koordinat.value = `${lat} ${lon}`;
        this.elements.Koordinat.placeholder = "Lokasi terdeteksi";
        this.KoordinatData(lat, lon)
    }
    async KoordinatData(lat, lon) {
        const options   = {method: 'GET', headers: {accept: 'application/json'}};
        const response  = await fetch(`https://us1.locationiq.com/v1/reverse?lat=${lat}&lon=${lon}&key=pk.a9bd630f0a7845193817de89ad1c07ab`, options)
        const json      = this.xmlToJson(await response.text())
        const JSX = JSON.parse(json);
        if (JSX.reversegeocode) {
            const geoData = JSX.reversegeocode.result["#text"]
            document.getElementById("koordinat-text").innerHTML = geoData
            //console.log(geoData)
        }
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
        if (!this.elements.Koordinat.value) {
            this.elements.Koordinat.placeholder = pesan;
        }
    }
    collectData() {
        const selectedRadio = document.querySelector(`input[name="lokasi_jalan"]:checked`);
        const lokasiJalan = selectedRadio ? selectedRadio.value : '';
        return {
            Lokasi      : lokasiJalan,
            Koordinat   : this.elements.Koordinat.value.trim(),
            Nama        : this.elements.Nama.value.trim(),
            Usia        : this.elements.Usia.value.trim(),
            Diameter    : this.elements.Diameter.value.trim(),
            Tajuk       : this.elements.Tajuk.value.trim(),
            Keterangan  : this.elements.Keterangan.value.trim()
        };
    }
    validate(data) {
        let param = true
        Object.keys(data).forEach(key => {
            if (!data[key] || data[key].length === 0) {
                if (key == "Keterangan") return
                param = false
                const el = this.elements[key]
                if (!el) return
                el.placeholder = `[ WAJIB DIISI ] ${key}`;
            }
        })
        return param
    }
    async sendDataAsQuery(data) {

        STATIC.loaderRun("Mengirim Data...")

        try {
            const post = await this.request.post({
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
                head : "FAILED",
                text : "Error : " + "Gagal kirim data. "
            }).show()
        }
    }
    handleSubmit() {
        const data = this.collectData();
        const isValid = this.validate(data);
        if (isValid) this.sendDataAsQuery(data);
        else alert("Mohon lengkapi SEMUA kolom yang WAJIB DIISI.");
    }
    autoRecovery(){
        this.setLokasiJalan()
        const recovery = JSON.parse(localStorage.getItem("recovery"))
        if (recovery) {
            this.elements.Nama.value          = recovery.Nama  
            this.elements.Usia.value          = recovery.Usia
            this.elements.Diameter.value      = recovery.Diameter
            this.elements.Tajuk.value         = recovery.Tajuk
            this.elements.Keterangan.value    = recovery.Keterangan
        }
        setTimeout(() => {
            this.recoveryInterval = setInterval(()=> {
                localStorage.setItem("recovery", JSON.stringify(this.collectData()))
            }, 1000)
        }, 2000)

    }
    clearRecoveryInterval() {
        clearInterval(this.recoveryInterval)
        localStorage.removeItem("recovery")
    }
    xmlToJson(xmlString) {
        // Fungsi rekursif internal untuk parsing satu elemen menjadi objek JS
        const parseElement = (element) => {
            const obj = {};

            // 1. Tangani Atribut (@attributes)
            if (element.attributes.length > 0) {
                obj['@attributes'] = {};
                for (let i = 0; i < element.attributes.length; i++) {
                    const attr = element.attributes[i];
                    obj['@attributes'][attr.nodeName] = attr.nodeValue;
                }
            }

            const children = element.children;
            const textContent = element.textContent.trim(); 

            // 2. Tangani Elemen Anak (Child Elements)
            if (children.length > 0) {
                for (let i = 0; i < children.length; i++) {
                    const child = children[i];
                    const tagName = child.tagName;
                    const childObj = parseElement(child);
                    
                    if (obj[tagName]) {
                        // Jika sudah ada (array), dorong ke array
                        if (!Array.isArray(obj[tagName])) {
                            obj[tagName] = [obj[tagName]];
                        }
                        obj[tagName].push(childObj);
                    } else {
                        // Jika belum ada, tambahkan
                        obj[tagName] = childObj;
                    }
                }
            }

            // 3. Tangani Teks Konten (#text)
            if (children.length === 0 && textContent) {
                // Jika ada teks tapi tidak ada elemen anak:
                if (Object.keys(obj).length === 0) {
                    return textContent; // Jika tidak ada atribut, kembalikan langsung teks
                }
                obj['#text'] = textContent; // Jika ada atribut, tambahkan teks di bawah kunci #text
            }

            // Khusus untuk elemen yang hanya memiliki teks
            if (Object.keys(obj).length === 0 && textContent) {
                return textContent;
            }

            return obj;
        };

        // --- LOGIKA UTAMA FUNGSINYA ---
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "text/xml");
            
            // Cek jika ada error parsing
            if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
                return JSON.stringify({ error: "Gagal parsing XML. Pastikan XML valid." }, null, 4);
            }

            const rootElement = xmlDoc.documentElement;
            
            // Panggil fungsi rekursif internal
            const parsedObject = parseElement(rootElement);

            // Bungkus hasilnya dengan nama root element
            const finalJson = {};
            finalJson[rootElement.tagName] = parsedObject; 

            // Konversi objek JavaScript ke string JSON yang terformat
            return JSON.stringify(finalJson, null, 4);

        } catch (e) {
            return JSON.stringify({ error: `Error saat konversi XML: ${e.message}` }, null, 4);
        }
    }
    pingStart() {
        this.pingParam = true
        //this.ping()
    }
    async ping() {
        let lastPing = 0
        while (this.pingParam) {
            const start = performance.now();
            this.pingInterval   = setInterval(() => {
                const on = performance.now();
                const diff = on - start
                if (diff >= this.pingLimit || lastPing >= this.pingLimit) {
                    this.pingElement.classList.add("red")
                    this.pingElement.classList.remove("green")
                } else {
                    this.pingElement.classList.remove("red")
                    this.pingElement.classList.add("green")
                }
            }, 500)
            await this.request.post({
                xxx : "ping"
            })
            lastPing = Math.round(performance.now() - start)
            this.pingElement.textContent = `${lastPing} ms`
            clearInterval(this.pingInterval)
        }
    }
    pingStop() {
        this.pingParam = false
        clearInterval(this.pingInterval)
        document.getElementById("ping").textContent = `-`
    }
}



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
                    document.querySelector("#verify i").className       = "fas fa-check fz-30 grid-center m-auto clr-green"
                    document.querySelector("#verify-data").className    = "align-center clr-green"
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