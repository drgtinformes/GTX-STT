// Diccionario por defecto (Expandido V2)
const defaultCorrectionsDict = {
    // === ANATOMÍA GENERAL ===
    "radio lucido": "radiolúcido",
    "radio lúcido": "radiolúcido",
    "radio paco": "radiopaco",
    "radio opaco": "radiopaco",
    "ápise": "ápice",
    "peri ápice": "periápice",
    "peri apical": "periapical",
    
    // === SENOS Y ESTRUCTURAS ===
    "seno maxilar": "seno maxilar",
    "piso de seno": "piso de seno",
    "piso de ceno": "piso de seno",
    "ceno maxilar": "seno maxilar",
    "tabique nasal": "tabique nasal",
    "fosa nasal": "fosa nasal",
    
    // === REABSORCIONES ===
    "reabsorción osea": "reabsorción ósea",
    "reabsorcion osea": "reabsorción ósea",
    "reabsorción alveolar": "reabsorción alveolar",
    "reabsorción radicular": "reabsorción radicular",
    "reabsorción ósea horizontal": "reabsorción ósea horizontal",
    "reabsorción ósea vertical": "reabsorción ósea vertical",
    
    // === CARIES ===
    "caria": "caries",
    "lesión carios": "lesión cariosa",
    "lesión cariosa distal": "lesión cariosa distal",
    "caries proximal": "caries proximal",
    "caries oclusal": "caries oclusal",
    "caries cervical": "caries cervical",
    
    // === ENDODONCIA ===
    "endodoncia": "endodoncia",
    "tratamiento de conducto": "tratamiento de conducto",
    "tratamiento de conductos": "tratamiento de conducto",
    "obturación del conducto": "obturación del conducto",
    "sobreobturación": "sobreobturación",
    "subobturación": "subobturación",
    
    // === PERIODONTITIS / PERIAPICAL ===
    "periodontitis apical": "periodontitis apical",
    "periodontitis": "periodontitis apical",
    "lesión periapical": "lesión periapical",
    "granuloma periapical": "granuloma periapical",
    "absceso periapical": "absceso periapical",
    "bolsa periodontal": "bolsa periodontal",
    "pérdida ósea marginal": "pérdida ósea marginal",
    
    // === IMPLANTES ===
    "implante": "implante",
    "implantes": "implante",
    "oseointegración": "oseointegración",
    "pérdida ósea periimplantaria": "pérdida ósea periimplantaria",
    "mucosite": "mucosite",
    "periimplantitis": "periimplantitis",
    "plataforma del implante": "plataforma del implante",
    
    // === MEDICAMENTOS / MATERIALES ===
    "gutapercha": "gutapercha",
    "amalgama": "amalgama",
    "resina": "resina",
    "vidrio ionómero": "vidrio ionómero",
    "hipoclorito de sodio": "hipoclorito de sodio",
    
    // === ANOMALÍAS DEL DESARROLLO ===
    "supernumerario": "supernumerario",
    "diente supernumerario": "diente supernumerario",
    "mesiodens": "mesiodens",
    "impactado": "impactado",
    "retenido": "retenido",
    "ectópico": "ectópico",
    "transposición dentaria": "transposición dentaria",
    
    // === ANOMALÍAS ÓSEAS ===
    "osteo litico": "osteolítico",
    "osteolítico": "osteolítico",
    "osteolitico": "osteolítico",
    "osteoblástico": "osteoblástico",
    "esclerótica": "esclerótica",
    "esclerose": "esclerosis",
    "esclerosis ósea": "esclerosis ósea",
    "condensación ósea": "condensación ósea",
    
    // === LESIONES ===
    "quiste": "quiste",
    "quiste radicular": "quiste radicular",
    "quiste de erupción": "quiste de erupción",
    "queratoquiste": "queratoquiste",
    "ameloblastoma": "ameloblastoma",
    "fibroma": "fibroma",
    "lesión ósea": "lesión ósea",
    "lesión mixta": "lesión mixta",
    "lesión radiolúcida": "lesión radiolúcida",
    "lesión radiopaca": "lesión radiopaca",
    
    // === OCLUSIÓN ===
    "apiñamiento": "apiñamiento",
    "diastema": "diastema",
    "sobremordida": "sobremordida",
    "mordida cruzada": "mordida cruzada",
    "atrición": "atrición",
    "abrasión": "abrasión",
    "erosión dentaria": "erosión dentaria",
    
    // === MODALIDADES ===
    "panoramica": "panorámica",
    "periapical": "periapical",
    "bite wing": "bite-wing",
    "bitewings": "bite-wing",
    "cone beam": "cone beam",
    "con bien": "cone beam",
    "con bim": "cone beam",
    "tomografía": "tomografía",
    "resonancia magnética": "resonancia magnética",
    
    // === ANATOMÍA TEMPORO-MANDIBULAR ===
    "articulación temporo-mandibular": "articulación temporo-mandibular",
    "ATM": "ATM",
    "cóndilo mandibular": "cóndilo mandibular",
    "rama mandibular": "rama mandibular",
    "rama ascendente": "rama ascendente",
    "cuerpo mandibular": "cuerpo mandibular",
    "rama horizontal": "rama horizontal",
    "sínfisis": "sínfisis",
    "gonion": "gonion",
    "articulación": "articulación",
    
    // === PIEZAS DENTALES (Foliación) ===
    "pieza dos seis": "pieza 2.6",
    "pieza dos punto seis": "pieza 2.6",
    
    // === CORTICALES ===
    "corticales": "corticales",
    "cortical bucal": "cortical bucal",
    "cortical lingual": "cortical lingual",
    "cortical vestibular": "cortical vestibular",
    "cortical alveolar": "cortical alveolar",
};

let correctionsDict = { ...defaultCorrectionsDict };

// Cargar y FUSIONAR diccionario desde localStorage si existe
const savedDict = localStorage.getItem('custom_dict');
if (savedDict) {
    try {
        const userDict = JSON.parse(savedDict);
        // La fusión permite que los nuevos términos por defecto aparezcan 
        // junto a los que el usuario ya haya guardado.
        correctionsDict = { ...defaultCorrectionsDict, ...userDict };
    } catch (e) {
        console.error("Error al leer el diccionario", e);
    }
}

// === GESTOR DE PLANTILLAS ===
class TemplateManager {
    constructor() {
        this.defaults = {
            'QVA': { name: 'Centro Radiológico QVA', base64: templatesBase64.QVA, isDefault: true },
            'TALCA': { name: 'Centro Radiológico TALCA', base64: templatesBase64.TALCA, isDefault: true },
            'PLANTILLA_MP': { name: 'PLANTILLA MP', base64: templatesBase64.PLANTILLA_MP, isDefault: true }
        };
        this.templates = this.loadTemplates();
    }

    loadTemplates() {
        let saved = {};
        try {
            const raw = localStorage.getItem('user_templates');
            if (raw) saved = JSON.parse(raw);
        } catch (e) { console.warn('Error cargando plantillas:', e); }
        
        const merged = { ...this.defaults };
        Object.keys(saved).forEach(id => {
            if (merged[id]) {
                // Sobreescribir default con la versión personalizada
                merged[id] = { ...merged[id], ...saved[id], isModified: true };
            } else {
                // Nueva plantilla de usuario
                merged[id] = { ...saved[id], isDefault: false };
            }
        });
        return merged;
    }

    saveTemplates() {
        const toSave = {};
        Object.keys(this.templates).forEach(id => {
            const current = this.templates[id];
            const def = this.defaults[id];
            
            if (!def) {
                // Es una plantilla nueva creada por el usuario
                toSave[id] = current;
            } else {
                // Es un default. Solo guardamos si ha sido modificado (nombre o archivo)
                if (current.name !== def.name || current.base64 !== def.base64) {
                    const { isDefault, isModified, ...rest } = current;
                    toSave[id] = rest;
                }
            }
        });
        localStorage.setItem('user_templates', JSON.stringify(toSave));
    }

    async addTemplate(name, docxFile) {
        const base64 = await this.fileToBase64(docxFile);
        const id = Date.now().toString();
        this.templates[id] = {
            name: name.replace('.docx', ''),
            base64: base64,
            uploadedAt: new Date().toISOString(),
            isDefault: false
        };
        this.saveTemplates();
        return { success: true, id: id };
    }

    async updateTemplateFile(id, docxFile) {
        if (!this.templates[id]) return false;
        const base64 = await this.fileToBase64(docxFile);
        this.templates[id].base64 = base64;
        if (this.defaults[id]) this.templates[id].isModified = true;
        this.saveTemplates();
        return true;
    }

    renameTemplate(id, newName) {
        if (!this.templates[id]) return false;
        this.templates[id].name = newName;
        if (this.defaults[id]) this.templates[id].isModified = true;
        this.saveTemplates();
        return true;
    }

    deleteTemplate(id) {
        if (!this.templates[id]) return false;
        if (this.defaults[id]) {
            // Restaurar: volvemos al valor por defecto hardcodeado
            this.templates[id] = { ...this.defaults[id] };
        } else {
            // Eliminar permanente si no es default
            delete this.templates[id];
        }
        this.saveTemplates();
        return true;
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const arrayBuffer = e.target.result;
                const base64 = btoa(new Uint8Array(arrayBuffer)
                    .reduce((data, byte) => data + String.fromCharCode(byte), ''));
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    getTemplate(id) { return this.templates[id]; }
    getAllTemplates() { return this.templates; }
}

const templateManager = new TemplateManager();

// === GESTOR DE CUOTA DE TOKENS ===
class TokenQuotaManager {
    constructor() {
        this.dailyLimit = 1500; // Solicitudes por día (Gemini 1.5 Flash Free Tier)
        this.loadStats();
    }

    loadStats() {
        const today = new Date().toDateString();
        const saved = JSON.parse(localStorage.getItem('token_usage_stats')) || {};
        
        if (saved.date !== today) {
            this.stats = {
                date: today,
                dailyRequests: 0,
                dailyTokens: 0,
                lastUsage: 0
            };
            this.saveStats();
        } else {
            this.stats = saved;
        }
        this.updateUI();
    }

    saveStats() {
        localStorage.setItem('token_usage_stats', JSON.stringify(this.stats));
    }

    recordUsage(usageMetadata) {
        if (!usageMetadata) return;
        
        const total = usageMetadata.totalTokenCount || 0;
        this.stats.dailyRequests += 1;
        this.stats.dailyTokens += total;
        this.stats.lastUsage = total;
        
        this.saveStats();
        this.updateUI();
    }

    updateUI() {
        const statsEl = document.getElementById('token-stats');
        const lastEl = document.getElementById('last-token-usage');
        const dailyEl = document.getElementById('daily-token-usage');
        const remainingEl = document.getElementById('remaining-quota');

        if (this.stats.dailyRequests > 0) {
            statsEl.classList.remove('hidden');
        }

        if (lastEl) lastEl.innerText = this.stats.lastUsage.toLocaleString();
        if (dailyEl) dailyEl.innerText = this.stats.dailyTokens.toLocaleString();
        if (remainingEl) {
            const remaining = Math.max(0, this.dailyLimit - this.stats.dailyRequests);
            remainingEl.innerText = remaining.toLocaleString() + ' req';
        }
    }
}

const quotaManager = new TokenQuotaManager();

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
    alert("Tu navegador no soporta la API de Reconocimiento de Voz. Por favor, utiliza Google Chrome o Microsoft Edge.");
}

const recognition = new SpeechRecognition();
recognition.lang = 'es-CL'; // Español de Chile. Cambiar a 'es-ES' o 'es-MX' si es necesario.
recognition.continuous = true; // Sigue grabando aunque haya pausas
recognition.interimResults = true; // Muestra resultados mientras se habla

// --- AUTO-GUARDADO (Autosave) ---
const AUTOSAVE_KEY = 'dictation_autosave';

window.addEventListener('DOMContentLoaded', () => {
    const savedText = localStorage.getItem(AUTOSAVE_KEY);
    if (savedText) {
        const transcriptionArea = document.getElementById('transcription');
        if (transcriptionArea) {
            transcriptionArea.value = savedText;
            finalTranscript = savedText;
        }
    }
});

// --- ATAJOS DE TECLADO GLOBALES (Hotkeys) ---
document.addEventListener('keydown', (e) => {
    // F2 para Iniciar/Detener Dictado
    if (e.key === 'F2') {
        e.preventDefault(); 
        toggleRecording();
    }
});

// Elementos del DOM
const recordBtn = document.getElementById('record-btn');
const recordText = document.getElementById('record-text');
const statusText = document.getElementById('status-text');
const recordingPulse = document.getElementById('recording-pulse');
const transcriptionArea = document.getElementById('transcription');
const copyBtn = document.getElementById('copy-btn');
const downloadBtn = document.getElementById('download-btn');
const clearBtn = document.getElementById('clear-btn');

// Elementos de la IA y Modal
const configBtn = document.getElementById('config-btn');
const configModal = document.getElementById('config-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const apiKeyInput = document.getElementById('api-key-input');
const saveKeyBtn = document.getElementById('save-key-btn');
const aiProcessBtn = document.getElementById('ai-process-btn');

// Elementos Historial
const historyBtn = document.getElementById('history-btn');
const historyModal = document.getElementById('history-modal');
const closeHistoryBtn = document.getElementById('close-history-btn');
const historyListContainer = document.getElementById('history-list-container');


let isRecording = false;
let finalTranscript = '';
let lastDictatedText = ''; // Track engine text before manual edits

// Función para reemplazar términos según el diccionario
function applyCorrections(text) {
    let correctedText = text;
    
    // 1. Reemplazos de diccionario estándar
    for (const [wrong, right] of Object.entries(correctionsDict)) {
        const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
        correctedText = correctedText.replace(regex, right);
    }
    
    // 2. NUEVO: Convertir comas en puntos seguidos para términos que suelen iniciar oraciones en informes dentales
    // Esto ayuda a corregir el exceso de comas de Whisper
    const periodTerms = [
        "Cámara", "Cámaras", "Conducto", "Conductos", "Periápice", "Periápices", "Raíz", "Raíces", 
        "Corona", "Coronas", "Se sugiere", "Caries", "Restaurado", "Restaurada", "Restauraciones", 
        "Restauración", "Área", "Áreas", "Espacio", "Espacios", "Mucosa", "Mucosas", "Senos", 
        "Cóndilo", "Cóndilos", "Rama", "Ramas", "Apiñamiento", "Atrición", "Aplanamiento"
    ];

    periodTerms.forEach(term => {
        // Busca ", [término]" (case insensitive) y lo cambia por ". [Término]"
        const regex = new RegExp(`,\\s+(${term})`, 'gi');
        correctedText = correctedText.replace(regex, (match, p1) => `. ${p1.charAt(0).toUpperCase() + p1.slice(1)}`);
    });
    
    // 3. Auto-capitalización de la primera letra después de un punto o inicio de línea
    correctedText = correctedText.replace(/(^\s*|[.!?]\s+)([a-zñáéíóú])/g, function(match, separator, letter) {
        return separator + letter.toUpperCase();
    });

    // Especial para nombres de pacientes (primera línea siempre con mayúsculas iniciales)
    if (transcriptionArea.value.length === 0) {
        correctedText = correctedText.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    return correctedText;
}

// Eventos de Reconocimiento
recognition.onstart = () => {
    isRecording = true;
    recordBtn.classList.add('recording');
    recordText.innerText = 'Detener Dictado (F2)';
    statusText.innerText = 'Escuchando...';
    recordingPulse.classList.remove('hidden');
};

recognition.onend = () => {
    if (isRecording) {
        // Reiniciamos si se detuvo automáticamente pero el usuario no ha presionado detener
        try {
            recognition.start();
        } catch(e) {}
    } else {
        recordBtn.classList.remove('recording');
        recordText.innerText = 'Iniciar Dictado (F2)';
        statusText.innerText = 'Listo';
        recordingPulse.classList.add('hidden');
    }
};

recognition.onerror = (event) => {
    console.error("Error de reconocimiento:", event.error);
    if (event.error === 'not-allowed') {
        isRecording = false;
        alert("Debes permitir el acceso al micrófono en el navegador.");
    }
};

recognition.onresult = (event) => {
    let interimTranscript = '';
    
    // Leemos el texto actual del textarea por si el usuario editó a mano
    finalTranscript = transcriptionArea.value;

    let newFinal = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
            newFinal += event.results[i][0].transcript;
        } else {
            interimTranscript += event.results[i][0].transcript;
        }
    }

    if (newFinal) {
        // Aplicamos correcciones al texto final
        let corrected = applyCorrections(newFinal.trim());
        
        // Agregar espacio si es necesario
        if (finalTranscript.length > 0 && !finalTranscript.endsWith(' ') && !finalTranscript.endsWith('\n')) {
            finalTranscript += ' ';
        }
        
        // Mantener la primera letra en mayúscula si es el comienzo
        if (finalTranscript.length === 0 || finalTranscript.endsWith('. ') || finalTranscript.endsWith('\n')) {
            corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
        }
        
        finalTranscript += corrected + ' ';
        transcriptionArea.value = finalTranscript;
        lastDictatedText = finalTranscript;
        localStorage.setItem(AUTOSAVE_KEY, finalTranscript);
    }
    
    // Opcional: mostrar texto intermedio
    // Aquí solo actualizamos el scroll
    transcriptionArea.scrollTop = transcriptionArea.scrollHeight;
};

// Control de botones
let mediaRecorder;
let audioChunks = [];
let whisperStream = null;
let realtimeWs = null;
let audioContext = null;
let audioProcessor = null;
let realtimeStream = null;
let currentRealtimeDraft = "";
const engineSelect = document.getElementById('engine-select');

async function startWhisperRecording() {
    try {
        if (!whisperStream) {
            whisperStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        mediaRecorder = new MediaRecorder(whisperStream);
        audioChunks = [];

        mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.onstart = () => {
            isRecording = true;
            recordBtn.classList.add('recording');
            recordText.innerText = 'Detener Dictado Whisper (F2)';
            statusText.innerText = 'Grabando para Whisper...';
            recordingPulse.classList.remove('hidden');
        };

        mediaRecorder.onstop = async () => {
            isRecording = false;
            recordBtn.classList.remove('recording');
            recordText.innerText = 'Transcribiendo...';
            statusText.innerText = 'Procesando con Whisper...';
            recordingPulse.classList.add('hidden');
            
            const openaiKey = localStorage.getItem('openai_api_key');
            if (!openaiKey) {
                alert('No se ha configurado la API Key de OpenAI. Ve a configuración.');
                recordText.innerText = 'Iniciar Dictado (F2)';
                statusText.innerText = 'Listo';
                return;
            }

            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const formData = new FormData();
            // Whisper espera .webm, .mp3, .wav, etc. Le daremos un nombre falso
            formData.append('file', audioBlob, 'audio.webm');
            formData.append('model', 'whisper-1');
            formData.append('language', 'es'); // Recomendado para mayor velocidad/precisión
            formData.append('prompt', 'Informes radiológicos dentales. Diente 1.6: Restaurado. Caries distal. Periápices normales.'); // Guía de estilo para puntuación

            try {
                const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${openaiKey}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error?.message || 'Error en la API de OpenAI');
                }

                const data = await response.json();
                let transcribedText = data.text || '';
                
                if (transcribedText) {
                    // Aplicamos los diccionarios locales
                    let corrected = applyCorrections(transcribedText.trim());
                    
                    if (finalTranscript.length > 0 && !finalTranscript.endsWith(' ') && !finalTranscript.endsWith('\n')) {
                        finalTranscript += ' ';
                    }
                    if (finalTranscript.length === 0 || finalTranscript.endsWith('. ') || finalTranscript.endsWith('\n')) {
                        corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
                    }
                    
                    finalTranscript += corrected + ' ';
                    transcriptionArea.value = finalTranscript;
                    lastDictatedText = finalTranscript;
                    localStorage.setItem(AUTOSAVE_KEY, finalTranscript);
                    transcriptionArea.scrollTop = transcriptionArea.scrollHeight;
                }
            } catch (error) {
                console.error("Error en Whisper:", error);
                alert("Error con Whisper: " + error.message);
            } finally {
                recordText.innerText = 'Iniciar Dictado (F2)';
                statusText.innerText = 'Listo';
            }
        };

        mediaRecorder.start();
    } catch (e) {
        console.error("No se pudo iniciar el micrófono para Whisper:", e);
        alert("Error al acceder al micrófono.");
    }
}

function toggleRecording() {
    const isWhisper = engineSelect && engineSelect.value === 'whisper';
    const isRealtimeWhisper = engineSelect && engineSelect.value === 'realtime-whisper';
    
    if (isRecording) {
        if (isWhisper && mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        } else if (isRealtimeWhisper) {
            stopRealtimeWhisperRecording();
        } else if (!isWhisper && !isRealtimeWhisper) {
            isRecording = false;
            recognition.stop();
        }
    } else {
        if (isWhisper) {
            startWhisperRecording();
        } else if (isRealtimeWhisper) {
            startRealtimeWhisperRecording();
        } else {
            try {
                recognition.start();
            } catch (e) {
                console.error("No se pudo iniciar reconocimiento nativo:", e);
            }
        }
    }
}

// Funciones para Realtime Whisper
function base64EncodeAudio(float32Array) {
    const arrayBuffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(arrayBuffer);
    for (let i = 0; i < float32Array.length; i++) {
        let s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    let binary = '';
    const bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

async function startRealtimeWhisperRecording() {
    const openaiKey = localStorage.getItem('openai_api_key');
    if (!openaiKey) {
        alert('No se ha configurado la API Key de OpenAI. Ve a configuración.');
        return;
    }

    try {
        if (!realtimeStream) {
            realtimeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        
        const url = "wss://api.openai.com/v1/realtime?intent=transcription";
        realtimeWs = new WebSocket(url, [
            "realtime",
            "openai-insecure-api-key." + openaiKey
        ]);

        realtimeWs.onopen = () => {
            console.log("WebSocket Realtime conectado.");
            isRecording = true;
            recordBtn.classList.add('recording');
            recordText.innerText = 'Detener Whisper Realtime (F2)';
            statusText.innerText = 'Grabando (Tiempo Real)...';
            recordingPulse.classList.remove('hidden');
            currentRealtimeDraft = "";

            realtimeWs.send(JSON.stringify({
                type: "session.update",
                session: {
                    type: "transcription",
                    audio: {
                        input: {
                            format: {
                                type: "audio/pcm",
                                rate: 24000
                            },
                            transcription: {
                                model: "gpt-realtime-whisper",
                                language: "es"
                            }
                        }
                    }
                }
            }));

            audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
            const source = audioContext.createMediaStreamSource(realtimeStream);
            audioProcessor = audioContext.createScriptProcessor(4096, 1, 1);
            
            source.connect(audioProcessor);
            audioProcessor.connect(audioContext.destination);

            let silenceStart = Date.now();
            let hasSpoken = false;
            const SILENCE_THRESHOLD = 0.01;
            const SILENCE_DURATION_MS = 1000;

            audioProcessor.onaudioprocess = (e) => {
                if (!isRecording || realtimeWs.readyState !== WebSocket.OPEN) return;
                const inputData = e.inputBuffer.getChannelData(0);
                
                // VAD Local (Detector de Silencios)
                let sum = 0.0;
                for (let i = 0; i < inputData.length; i++) {
                    sum += inputData[i] * inputData[i];
                }
                let rms = Math.sqrt(sum / inputData.length);

                if (rms > SILENCE_THRESHOLD) {
                    silenceStart = Date.now();
                    hasSpoken = true;
                } else {
                    if (hasSpoken && Date.now() - silenceStart > SILENCE_DURATION_MS) {
                        realtimeWs.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
                        hasSpoken = false;
                        silenceStart = Date.now();
                    }
                }

                const base64Audio = base64EncodeAudio(inputData);
                realtimeWs.send(JSON.stringify({
                    type: "input_audio_buffer.append",
                    audio: base64Audio
                }));
            };
        };

        realtimeWs.onmessage = (message) => {
            const event = JSON.parse(message.data);
            if (event.type === "conversation.item.input_audio_transcription.delta") {
                if (event.delta) {
                    currentRealtimeDraft += event.delta;
                    transcriptionArea.value = finalTranscript + (finalTranscript.length > 0 && !finalTranscript.endsWith(' ') && !finalTranscript.endsWith('\n') ? " " : "") + currentRealtimeDraft;
                    transcriptionArea.scrollTop = transcriptionArea.scrollHeight;
                }
            } else if (event.type === "conversation.item.input_audio_transcription.completed") {
                if (event.transcript) {
                    let corrected = applyCorrections(event.transcript.trim());
                    if (finalTranscript.length > 0 && !finalTranscript.endsWith(' ') && !finalTranscript.endsWith('\n')) {
                        finalTranscript += ' ';
                    }
                    if (finalTranscript.length === 0 || finalTranscript.endsWith('. ') || finalTranscript.endsWith('\n')) {
                        corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
                    }
                    finalTranscript += corrected + ' ';
                    currentRealtimeDraft = "";
                    transcriptionArea.value = finalTranscript;
                    lastDictatedText = finalTranscript;
                    localStorage.setItem(AUTOSAVE_KEY, finalTranscript);
                    transcriptionArea.scrollTop = transcriptionArea.scrollHeight;
                }
            } else if (event.type === "error") {
                console.error("Error Realtime API:", event.error);
                if (isRecording) {
                    alert("Error de OpenAI: " + event.error.message);
                    stopRealtimeWhisperRecording(true);
                }
            }
        };

        realtimeWs.onerror = (err) => {
            console.error("WebSocket Error:", err);
            if (isRecording) stopRealtimeWhisperRecording(true);
        };

        realtimeWs.onclose = () => {
            console.log("WebSocket Realtime cerrado.");
            if (isRecording) stopRealtimeWhisperRecording(true);
        };

    } catch (e) {
        console.error("No se pudo iniciar el micrófono para Whisper Realtime:", e);
        alert("Error al acceder al micrófono.");
    }
}

function stopRealtimeWhisperRecording(immediate = false) {
    if (!isRecording) return;
    
    isRecording = false;
    recordBtn.classList.remove('recording');
    recordText.innerText = 'Iniciar Dictado (F2)';
    statusText.innerText = immediate ? 'Error o cerrado' : 'Finalizando transcripción...';
    recordingPulse.classList.add('hidden');

    if (audioProcessor) {
        audioProcessor.disconnect();
        audioProcessor = null;
    }
    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
        audioContext = null;
    }
    
    if (realtimeWs && realtimeWs.readyState === WebSocket.OPEN) {
        if (!immediate) {
            realtimeWs.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
            setTimeout(() => {
                if(realtimeWs) realtimeWs.close();
                statusText.innerText = 'Listo';
            }, 1500); // Esperar un poco a que llegue el último .completed
        } else {
            realtimeWs.close();
            statusText.innerText = 'Listo';
        }
    } else {
        statusText.innerText = 'Listo';
    }
}

recordBtn.addEventListener('click', toggleRecording);

copyBtn.addEventListener('click', () => {
    transcriptionArea.select();
    document.execCommand('copy');
    
    const originalText = copyBtn.innerHTML;
    copyBtn.innerHTML = '<i data-lucide="check"></i> Copiado!';
    lucide.createIcons();
    setTimeout(() => {
        copyBtn.innerHTML = originalText;
    }, 2000);
});

downloadBtn.addEventListener('click', () => {
    const text = transcriptionArea.value;
    if (!text.trim()) {
        alert("No hay texto para descargar.");
        return;
    }

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    
    const now = new Date();
    const dateStr = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;
    a.download = `informe_dictado_${dateStr}.txt`;
    
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// Guardar texto al escribir manualmente
transcriptionArea.addEventListener('input', () => {
    finalTranscript = transcriptionArea.value;
    localStorage.setItem(AUTOSAVE_KEY, transcriptionArea.value);
});

clearBtn.addEventListener('click', () => {
    if (confirm("¿Estás seguro de que deseas borrar todo el texto? Esta acción no se puede deshacer.")) {
        transcriptionArea.value = '';
        finalTranscript = '';
        localStorage.removeItem(AUTOSAVE_KEY);
    }
});

// === Lógica de Configuración y Modal ===
const openaiKeyInput = document.getElementById('openai-key-input');

// Cargar API Keys si existen
const savedApiKey = localStorage.getItem('gemini_api_key');
const savedOpenAIKey = localStorage.getItem('openai_api_key');
if (savedApiKey && apiKeyInput) apiKeyInput.value = savedApiKey;
if (savedOpenAIKey && openaiKeyInput) openaiKeyInput.value = savedOpenAIKey;

configBtn.addEventListener('click', () => {
    configModal.classList.remove('hidden');
});

closeModalBtn.addEventListener('click', () => {
    configModal.classList.add('hidden');
});

saveKeyBtn.addEventListener('click', () => {
    const geminiKey = apiKeyInput.value.trim();
    const openaiKey = openaiKeyInput ? openaiKeyInput.value.trim() : '';
    
    if (geminiKey) localStorage.setItem('gemini_api_key', geminiKey);
    if (openaiKey) localStorage.setItem('openai_api_key', openaiKey);
    
    alert('Claves de API guardadas exitosamente.');
    configModal.classList.add('hidden');
});

// Cierra modal si se hace clic fuera del contenido
window.addEventListener('click', (e) => {
    if (e.target === configModal) {
        configModal.classList.add('hidden');
    }
    if (e.target === document.getElementById('dict-modal')) {
        document.getElementById('dict-modal').classList.add('hidden');
    }
    if (e.target === historyModal) {
        historyModal.classList.add('hidden');
    }
});

// === Lógica de Diccionario Interactivo ===
const dictBtn = document.getElementById('dict-btn');
const dictModal = document.getElementById('dict-modal');
const closeDictBtn = document.getElementById('close-dict-btn');
const dictListBody = document.getElementById('dict-list-body');
const dictWrongInput = document.getElementById('dict-wrong');
const dictRightInput = document.getElementById('dict-right');
const addDictBtn = document.getElementById('add-dict-btn');

function renderDict() {
    dictListBody.innerHTML = '';
    for (const [wrong, right] of Object.entries(correctionsDict)) {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--glass-border)';
        
        tr.innerHTML = `
            <td style="padding: 8px;">${wrong}</td>
            <td style="padding: 8px;">${right}</td>
            <td style="padding: 8px; text-align: center;">
                <button class="icon-btn delete-word-btn" data-word="${wrong}" style="font-size: 1rem; color: #ef4444;" title="Eliminar"><i data-lucide="trash-2"></i></button>
            </td>
        `;
        dictListBody.appendChild(tr);
    }
    
    lucide.createIcons();

    // Agregar eventos de eliminar
    document.querySelectorAll('.delete-word-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const wordToRemove = e.currentTarget.getAttribute('data-word');
            delete correctionsDict[wordToRemove];
            localStorage.setItem('custom_dict', JSON.stringify(correctionsDict));
            renderDict();
        });
    });
}

dictBtn.addEventListener('click', () => {
    renderDict();
    dictModal.classList.remove('hidden');
});

closeDictBtn.addEventListener('click', () => {
    dictModal.classList.add('hidden');
});

addDictBtn.addEventListener('click', () => {
    const wrong = dictWrongInput.value.trim().toLowerCase();
    const right = dictRightInput.value.trim();

    if (!wrong || !right) {
        alert('Por favor llena ambos campos.');
        return;
    }

    correctionsDict[wrong] = right;
    localStorage.setItem('custom_dict', JSON.stringify(correctionsDict));
    
    dictWrongInput.value = '';
    dictRightInput.value = '';
    renderDict();
});

const exportDictBtn = document.getElementById('export-dict-btn');
const importDictBtn = document.getElementById('import-dict-btn');
const importFile = document.getElementById('import-file');

exportDictBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(correctionsDict));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "diccionario_radiologico.json");
    dlAnchorElem.click();
});

importDictBtn.addEventListener('click', () => {
    importFile.click();
});

importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const importedDict = JSON.parse(event.target.result);
            correctionsDict = { ...correctionsDict, ...importedDict };
            localStorage.setItem('custom_dict', JSON.stringify(correctionsDict));
            renderDict();
            alert("Diccionario importado y fusionado correctamente.");
        } catch (error) {
            alert("El archivo no es un diccionario válido.");
        }
    };
    reader.readAsText(file);
    importFile.value = ''; // Reset input
});

// === Lógica de Historial ===
let dictationHistory = JSON.parse(localStorage.getItem('dictationHistory')) || [];

function saveToHistory(text) {
    if (!text.trim()) return;
    
    // Obtener la primera línea como nombre del paciente (o usar "Paciente sin nombre")
    const lines = text.split('\n').filter(l => l.trim() !== '');
    const patientName = lines.length > 0 ? lines[0].trim() : "Paciente sin nombre";
    
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const historyItem = {
        id: Date.now().toString(),
        date: dateStr,
        patientName: patientName,
        text: text
    };
    
    dictationHistory.unshift(historyItem);
    
    // Limitar a los últimos 50 informes
    if (dictationHistory.length > 50) {
        dictationHistory = dictationHistory.slice(0, 50);
    }
    
    localStorage.setItem('dictationHistory', JSON.stringify(dictationHistory));
}

function renderHistory() {
    historyListContainer.innerHTML = '';
    
    if (dictationHistory.length === 0) {
        historyListContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No hay informes guardados aún.</p>';
        return;
    }
    
    dictationHistory.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.style.background = 'rgba(15, 23, 42, 0.6)';
        itemDiv.style.border = '1px solid var(--glass-border)';
        itemDiv.style.borderRadius = '8px';
        itemDiv.style.padding = '12px';
        itemDiv.style.display = 'flex';
        itemDiv.style.justifyContent = 'space-between';
        itemDiv.style.alignItems = 'center';
        itemDiv.style.gap = '10px';
        
        const infoDiv = document.createElement('div');
        infoDiv.innerHTML = `
            <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">${item.patientName}</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);"><i data-lucide="clock" style="width: 12px; height: 12px; display: inline-block; vertical-align: text-top;"></i> ${item.date}</div>
        `;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.style.display = 'flex';
        actionsDiv.style.gap = '5px';
        
        const restoreBtn = document.createElement('button');
        restoreBtn.className = 'btn primary-btn';
        restoreBtn.style.padding = '6px 10px';
        restoreBtn.style.fontSize = '0.8rem';
        restoreBtn.innerHTML = '<i data-lucide="arrow-up-circle"></i> Restaurar';
        restoreBtn.title = "Cargar al editor principal";
        restoreBtn.onclick = () => {
            transcriptionArea.value = item.text;
            finalTranscript = item.text;
            historyModal.classList.add('hidden');
        };
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn danger-btn';
        deleteBtn.style.padding = '6px 10px';
        deleteBtn.style.fontSize = '0.8rem';
        deleteBtn.innerHTML = '<i data-lucide="trash-2"></i>';
        deleteBtn.onclick = () => {
            dictationHistory = dictationHistory.filter(h => h.id !== item.id);
            localStorage.setItem('dictationHistory', JSON.stringify(dictationHistory));
            renderHistory();
        };
        
        actionsDiv.appendChild(restoreBtn);
        actionsDiv.appendChild(deleteBtn);
        
        itemDiv.appendChild(infoDiv);
        itemDiv.appendChild(actionsDiv);
        
        historyListContainer.appendChild(itemDiv);
    });
    
    lucide.createIcons();
}

historyBtn.addEventListener('click', () => {
    renderHistory();
    historyModal.classList.remove('hidden');
});

closeHistoryBtn.addEventListener('click', () => {
    historyModal.classList.add('hidden');
});


// === Lógica de Procesamiento con IA (Google Gemini) ===
aiProcessBtn.addEventListener('click', async () => {
    const textToProcess = transcriptionArea.value.trim();
    const apiKey = localStorage.getItem('gemini_api_key');

    if (!textToProcess) {
        alert('No hay texto para procesar. Por favor dicta algo primero.');
        return;
    }

    if (!apiKey) {
        alert('Debes configurar tu API Key de Gemini primero haciendo clic en el icono de configuración (engranaje).');
        configModal.classList.remove('hidden');
        return;
    }

    const originalBtnText = aiProcessBtn.innerHTML;
    aiProcessBtn.innerHTML = '<span class="pulse" style="display:inline-block; margin-right:8px;"></span> Procesando...';
    aiProcessBtn.disabled = true;

    try {
        // 1. Obtener la lista de modelos disponibles para esta API Key
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!listRes.ok) throw new Error("API Key inválida o no se pudo contactar al servidor de Google.");
        
        const listData = await listRes.json();
        
        // 2. Filtrar y Priorizar Modelos
        // Solo modelos que soportan generación de contenido
        let availableModels = listData.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
        
        // Excluir modelos restringidos o no aptos para este uso (como computer-use-preview que da cuota 0)
        availableModels = availableModels.filter(m => !m.name.toLowerCase().includes('computer-use'));

        // Priorizar modelos 1.5 (especialmente Flash por su mayor cuota gratuita)
        const priorityOrder = [
            'gemini-1.5-flash-latest',
            'gemini-1.5-flash',
            'gemini-1.5-flash-8b',
            'gemini-1.5-pro-latest',
            'gemini-1.5-pro'
        ];

        let validModels = [];
        
        // Primero agregamos los de prioridad en orden
        priorityOrder.forEach(pName => {
            const found = availableModels.find(m => m.name.endsWith(pName));
            if (found) validModels.push(found);
        });

        // Luego agregamos el resto que sean modernos (1.5 o superior) pero no estén en la prioridad
        availableModels.forEach(m => {
            const isModern = m.name.includes('1.5') || m.name.includes('2.0') || m.name.includes('2.5');
            if (isModern && !validModels.find(vm => vm.name === m.name)) {
                validModels.push(m);
            }
        });

        if (validModels.length === 0) throw new Error("Tu cuenta no tiene modelos estables (1.5+) habilitados o disponibles.");

        const payload = {
            systemInstruction: {
                parts: [{ text: typeof SYSTEM_PROMPT !== 'undefined' ? SYSTEM_PROMPT : 'Eres un formateador estricto.' }]
            },
            contents: [
                {
                    role: "user",
                    parts: [{ text: `DICTADO DEL USUARIO A FORMATEAR (Aplica tus reglas estrictamente, sin saludos ni formato markdown):\n\n${textToProcess}` }]
                }
            ],
            generationConfig: { temperature: 0.2 } // Temperatura baja pero no cero para evitar bucles de repetición
        };

        let successResponse = null;
        let lastErrorMsg = "";

        // 3. Probar los modelos uno por uno hasta encontrar el que tiene cuota gratuita disponible
        for (const model of validModels) {
            const modelName = model.name.replace('models/', '');
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (response.ok) {
                    successResponse = await response.json();
                    break; // ¡Funcionó! Salimos del bucle.
                } else {
                    const errData = await response.json();
                    lastErrorMsg = errData.error?.message || "Error desconocido";
                    // Si es error de cuota (429) o no soportado, intentamos el siguiente
                    continue;
                }
            } catch (err) {
                lastErrorMsg = err.message;
            }
        }

        if (!successResponse) {
            if (lastErrorMsg.toLowerCase().includes("quota") || lastErrorMsg.toLowerCase().includes("limit")) {
                throw new Error(`Has agotado el límite de uso gratuito por ahora. Por favor, espera 1 o 2 minutos e intenta nuevamente. (Error: ${lastErrorMsg})`);
            }
            throw new Error(`Los modelos disponibles en tu cuenta gratuita están restringidos o sin cuota. Error: ${lastErrorMsg}`);
        }

        if (successResponse.candidates && successResponse.candidates.length > 0) {
            const resultText = successResponse.candidates[0].content.parts[0].text;
            transcriptionArea.value = resultText;
            finalTranscript = resultText;
            
            // Registrar consumo de tokens
            if (successResponse.usageMetadata) {
                quotaManager.recordUsage(successResponse.usageMetadata);
            }
            
            // Guardar en el historial
            saveToHistory(resultText);
            
        } else {
            throw new Error("No se pudo obtener respuesta de la IA.");
        }
        
    } catch (error) {
        console.error("Error al procesar con IA:", error);
        alert(`Ocurrió un error: ${error.message}`);
    } finally {
        aiProcessBtn.innerHTML = originalBtnText;
        aiProcessBtn.disabled = false;
    }
});

// === Lógica de Generación de Archivo Word (.docx) ===

// Función para decodificar base64 a ArrayBuffer
function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

// === Lógica para Generar Word (.docx) ===
const generateWordBtn = document.getElementById('generate-word-btn');
const templateSelect = document.getElementById('template-select');

// Elementos del Gestor de Plantillas
const manageTemplatesBtn = document.getElementById('manage-templates-btn');
const templateModal = document.getElementById('template-modal');
const closeTemplateBtn = document.getElementById('close-template-btn');
const uploadTemplateBtn = document.getElementById('upload-template-btn');
const templateFileInput = document.getElementById('template-file-input');
const templateListBody = document.getElementById('template-list-body');

function updateTemplateUI() {
    // Actualizar Select
    const currentVal = templateSelect.value;
    templateSelect.innerHTML = '';
    const templates = templateManager.getAllTemplates();
    
    Object.entries(templates).forEach(([id, data]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = data.name + (data.isModified ? ' (Modificada)' : '');
        templateSelect.appendChild(option);
    });
    if (currentVal && templates[currentVal]) {
        templateSelect.value = currentVal;
    }

    // Actualizar Lista en Modal
    templateListBody.innerHTML = '';
    Object.entries(templates).forEach(([id, data]) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--glass-border)';
        tr.innerHTML = `
            <td style="padding: 8px;">
                <span id="name-text-${id}">${data.name}</span>
                ${data.isDefault ? `<span style="font-size: 0.7rem; opacity: 0.6; margin-left: 5px;">${data.isModified ? '(Modificada)' : '(Protegida)'}</span>` : ''}
            </td>
            <td style="padding: 8px; text-align: center; display: flex; gap: 8px; justify-content: center;">
                <button class="icon-btn rename-template-btn" data-id="${id}" title="Renombrar" style="color: #60a5fa;"><i data-lucide="edit-2"></i></button>
                <button class="icon-btn update-file-btn" data-id="${id}" title="Actualizar Archivo" style="color: #a78bfa;"><i data-lucide="upload"></i></button>
                ${data.isDefault ? 
                    (data.isModified ? `<button class="icon-btn delete-template-btn" data-id="${id}" title="Restaurar Original" style="color: #fbbf24;"><i data-lucide="rotate-ccw"></i></button>` : '') 
                    : `<button class="icon-btn delete-template-btn" data-id="${id}" title="Eliminar" style="color: #ef4444;"><i data-lucide="trash-2"></i></button>`
                }
            </td>
        `;
        templateListBody.appendChild(tr);
    });
    
    lucide.createIcons();

    // Eventos de Renombrar
    document.querySelectorAll('.rename-template-btn').forEach(btn => {
        btn.onclick = () => {
            const id = btn.getAttribute('data-id');
            const template = templateManager.getTemplate(id);
            const newName = prompt('Nuevo nombre para la plantilla:', template.name);
            if (newName && newName.trim()) {
                templateManager.renameTemplate(id, newName.trim());
                updateTemplateUI();
            }
        };
    });

    // Eventos de Actualizar Archivo
    const replaceInput = document.getElementById('replace-template-input');
    let currentReplaceId = null;

    document.querySelectorAll('.update-file-btn').forEach(btn => {
        btn.onclick = () => {
            currentReplaceId = btn.getAttribute('data-id');
            replaceInput.click();
        };
    });

    replaceInput.onchange = async (e) => {
        if (!currentReplaceId || !e.target.files[0]) return;
        try {
            await templateManager.updateTemplateFile(currentReplaceId, e.target.files[0]);
            alert('Archivo actualizado correctamente.');
            updateTemplateUI();
        } catch (err) {
            alert('Error al actualizar archivo: ' + err.message);
        }
        replaceInput.value = '';
        currentReplaceId = null;
    };

    // Eventos de Eliminar/Restaurar
    document.querySelectorAll('.delete-template-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const id = e.currentTarget.getAttribute('data-id');
            const template = templateManager.getTemplate(id);
            const action = template.isDefault ? 'restaurar la versión original de' : 'eliminar';
            
            if (confirm(`¿Estás seguro de ${action} "${template.name}"?`)) {
                templateManager.deleteTemplate(id);
                updateTemplateUI();
            }
        };
    });

    if (typeof togglePdfButton === 'function') togglePdfButton();
}

if (manageTemplatesBtn) {
    manageTemplatesBtn.onclick = () => {
        updateTemplateUI();
        templateModal.classList.remove('hidden');
    };
}

if (closeTemplateBtn) closeTemplateBtn.onclick = () => templateModal.classList.add('hidden');
if (uploadTemplateBtn) uploadTemplateBtn.onclick = () => templateFileInput.click();

if (templateFileInput) {
    templateFileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            await templateManager.addTemplate(file.name, file);
            updateTemplateUI();
            alert('Plantilla subida con éxito.');
        } catch (err) {
            alert('Error al subir plantilla: ' + err.message);
        }
        templateFileInput.value = '';
    };
}

// === Lógica de Generación de Documentos ===
const generatePdfBtn = document.getElementById('generate-pdf-btn');

function togglePdfButton() {
    const templateId = templateSelect.value;
    const templateData = templateManager.getTemplate(templateId);
    if (templateData && templateData.name.toUpperCase().includes("PLANTILLA MP")) {
        generatePdfBtn.style.display = 'flex';
    } else {
        generatePdfBtn.style.display = 'none';
    }
}

templateSelect.addEventListener('change', togglePdfButton);

// Función común para preparar el documento procesado
async function prepareDocument() {
    const text = transcriptionArea.value.trim();
    if (!text) {
        alert("Primero dicta o escribe un informe.");
        return null;
    }

    const templateId = templateSelect.value;
    const templateData = templateManager.getTemplate(templateId);
    
    if (!templateData) {
        alert("Selecciona una plantilla válida.");
        return null;
    }

    // Estructura de datos para la plantilla
    const dictValues = {
        PACIENTE: "Paciente",
        EDAD: "",
        DOCTOR: "",
        FECHA: "",
        ANTECEDENTES: "Sin antecedentes entregados",
        MOTIVO: "Sin antecedentes entregados",
        ESTUDIO: "",
        DIAGNOSTICO: text,
        INFORME: text      
    };

    const lines = text.split('\n').map(l => l.trim());
    const headerLines = [];
    for (const line of lines) {
        if (!line) continue;
        if (line.match(/^ANT\.\s*CLÍNICOS/i) || line.match(/^QUE DESEA SABER/i) || line.match(/^TIPO DE ESTUDIO/i)) {
            break;
        }
        headerLines.push(line);
    }

    if (headerLines.length > 0) {
        // Primera línea siempre es el paciente
        let rawName = headerLines[0].toLowerCase();
        dictValues.PACIENTE = rawName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        
        // Procesar las líneas restantes buscando patrones (Edad, Doctor, Fecha)
        const remainingLines = headerLines.slice(1);
        remainingLines.forEach((line, index) => {
            const l = line.toLowerCase();
            // Detectar Fecha: busca meses o formato de fecha
            const isDate = l.match(/\d{1,2}\s+de\s+[a-z]+/i) || 
                           l.match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/) || 
                           l.match(/enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre/i);
            
            // Detectar Edad: busca "años" o "meses"
            const isAge = l.includes('años') || l.includes('meses') || l.match(/^\d+\s*(años|meses)/i);
            
            // Detectar Doctor: busca Dr, Dra o Tratante
            const isDoctor = l.includes('dr') || l.includes('dra') || l.includes('tratante');

            if (isDate && !dictValues.FECHA) {
                dictValues.FECHA = line;
            } else if (isAge && !dictValues.EDAD) {
                dictValues.EDAD = line;
            } else if (isDoctor && !dictValues.DOCTOR) {
                dictValues.DOCTOR = line;
            } else {
                // Fallback por posición si no se detectó nada específico
                if (index === 0 && !dictValues.EDAD) dictValues.EDAD = line;
                else if (index === 1 && !dictValues.DOCTOR) dictValues.DOCTOR = line;
                else if (index === 2 && !dictValues.FECHA) dictValues.FECHA = line;
            }
        });
    }

    // Fallback: Si no se detectó fecha en el dictado, usar la fecha de hoy
    if (!dictValues.FECHA) {
        const now = new Date();
        const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
        dictValues.FECHA = `${now.getDate()} de ${months[now.getMonth()]} del ${now.getFullYear()}`;
    }

    // Extraer bloques de texto (ahora multilínea para capturar parámetros de exposición, etc.)
    const antMatch = text.match(/ANT\. CLÍNICOS\s*:\s*([\s\S]+?)(?=\nQUE DESEA SABER|\nTIPO DE ESTUDIO|\nEn base a las imágenes|$)/i);
    if (antMatch && antMatch[1]) dictValues.ANTECEDENTES = antMatch[1].trim();

    const motivoMatch = text.match(/QUE DESEA SABER\s*:\s*([\s\S]+?)(?=\nTIPO DE ESTUDIO|\nEn base a las imágenes|$)/i);
    if (motivoMatch && motivoMatch[1]) dictValues.MOTIVO = motivoMatch[1].trim();

    const estudioMatch = text.match(/TIPO DE ESTUDIO\s*:\s*([\s\S]+?)(?=\nEn base a las imágenes|$)/i);
    if (estudioMatch && estudioMatch[1]) dictValues.ESTUDIO = estudioMatch[1].trim();

    const diagMatch = text.split(/impresión diagnóstica es la siguiente:/i);
    if (diagMatch.length > 1) {
        const diagText = diagMatch.slice(1).join("impresión diagnóstica es la siguiente:").trim();
        dictValues.DIAGNOSTICO = diagText;
        dictValues.INFORME = diagText;
    }

    try {
        const arrayBuffer = base64ToArrayBuffer(templateData.base64);
        const zip = new PizZip(arrayBuffer);
        const doc = new docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });
        
        doc.render(dictValues);
        
        const out = doc.getZip().generate({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
        
        const safePatientName = dictValues.PACIENTE.replace(/[^a-z0-9áéíóúñ -]/gi, '').trim() || 'Informe';
        let fileNameBase = safePatientName;

        if (templateData.name.toUpperCase().includes("PLANTILLA MP")) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            fileNameBase = `${year}_${month}_${day}_${dictValues.PACIENTE.toUpperCase()}`;
        }
        
        return { blob: out, fileNameBase: fileNameBase, patientName: dictValues.PACIENTE };
        
    } catch (error) {
        console.error("Error al preparar documento", error);
        alert("Hubo un error técnico al procesar la plantilla:\n" + error.message);
        return null;
    }
}

// Inicializar UI
updateTemplateUI();
if (typeof togglePdfButton === 'function') togglePdfButton();

if (generateWordBtn) {
    generateWordBtn.addEventListener('click', async () => {
        const docData = await prepareDocument();
        if (docData) {
            window.saveAs(docData.blob, docData.fileNameBase + ".docx");
        }
        
        // Aprender correcciones en segundo plano al generar el Word
        const textToProcess = transcriptionArea.value.trim();
        const apiKey = localStorage.getItem('gemini_api_key');
        if (apiKey && lastDictatedText.trim() && textToProcess !== lastDictatedText.trim()) {
            learnCorrections(lastDictatedText.trim(), textToProcess, apiKey);
        }
        lastDictatedText = textToProcess;
    });
}

if (generatePdfBtn) generatePdfBtn.addEventListener('click', async () => {
    const docData = await prepareDocument();
    if (!docData) return;

    try {
        // Mostrar feedback de carga ya que el PDF puede tardar un poco
        const originalText = generatePdfBtn.innerHTML;
        generatePdfBtn.innerHTML = '<i class="loader"></i> Generando...';
        generatePdfBtn.disabled = true;

        const arrayBuffer = await docData.blob.arrayBuffer();
        
        // Estilo personalizado para el HTML convertido a PDF
        const options = {
            styleMap: [
                "p => p:fresh",
                "h1 => h1:fresh",
                "table => table.pdf-table"
            ]
        };

        const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer }, options);
        const htmlContent = result.value;

        // Crear un contenedor temporal con estilos para el PDF
        const container = document.createElement('div');
        container.style.padding = '40px';
        container.style.color = '#000';
        container.style.background = '#fff';
        container.style.fontFamily = 'Arial, sans-serif';
        container.style.lineHeight = '1.5';
        container.innerHTML = htmlContent;

        // Configuración de html2pdf
        const opt = {
            margin: [15, 15, 15, 15],
            filename: docData.fileNameBase + '.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Generar y guardar PDF
        await html2pdf().set(opt).from(container).save();

        // Restaurar botón
        generatePdfBtn.innerHTML = originalText;
        generatePdfBtn.disabled = false;

    } catch (err) {
        console.error("Error al generar PDF", err);
        alert("Error al generar PDF: " + err.message);
        generatePdfBtn.disabled = false;
    }
});


// === MEJORAS: VALIDADOR FDI ===


// Función para detectar y validar números de dientes en el texto
function validateFDINomenclature(text) {
    // Patrón para capturar potenciales piezas FDI X.Y
    const fdiPattern = /\b([1-4])\.(\d)\b/g;
    
    let issues = [];
    let matches = text.matchAll(fdiPattern);
    
    for (const match of matches) {
        const fullNumber = match[1] + '.' + match[2];
        // Validación básica: segundo dígito no puede ser 0 o 9
        if (match[2] === '0' || match[2] === '9') {
            issues.push({
                number: fullNumber,
                error: `Diente ${fullNumber} no existe. ¿Quisiste decir ${match[1]}.8?`,
                type: 'invalid_fdi'
            });
        }
    }
    
    return {
        isValid: issues.length === 0,
        issues: issues
    };
}

// Agregar indicador visual al textarea
function addFDIValidator() {
    const transcriptionArea = document.getElementById('transcription');
    if (!transcriptionArea) return;

    const validationDiv = document.createElement('div');
    validationDiv.id = 'fdi-validation-display';
    validationDiv.style.cssText = `
        margin-top: 10px;
        padding: 10px;
        border-radius: 8px;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        color: #fca5a5;
        font-size: 0.85rem;
        display: none;
        animation: fadeIn 0.3s ease;
    `;
    
    transcriptionArea.parentNode.insertBefore(validationDiv, transcriptionArea.nextSibling);
    
    // Validar en tiempo real (input) y también al cargar
    const checkValidation = () => {
        const validation = validateFDINomenclature(transcriptionArea.value);
        
        if (!validation.isValid) {
            validationDiv.innerHTML = '<strong>⚠️ Advertencia de Nomenclatura FDI:</strong><br>' +
                validation.issues.map(issue => `• ${issue.error}`).join('<br>');
            validationDiv.style.display = 'block';
        } else {
            validationDiv.style.display = 'none';
        }
    };

    transcriptionArea.addEventListener('input', checkValidation);
    // También validamos si ya hay texto (ej. después de procesar con IA)
    const observer = new MutationObserver(checkValidation);
    observer.observe(transcriptionArea, { childList: true, characterData: true, subtree: true });
    
    // El evento 'input' no siempre se dispara cuando se cambia el .value por JS
    // así que agregamos un intervalo pequeño o lo llamamos desde los procesos de IA
    setInterval(checkValidation, 1000);
}

// Inicializar mejoras cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addFDIValidator);
} else {
    addFDIValidator();
}


// =============================================================
// === SISTEMA DE MACROS / FRASES PREDEFINIDAS               ===
// =============================================================

const defaultMacros = [
    {
        id: 'default_1',
        name: 'Apertura de informe',
        trigger: 'macro apertura',
        text: 'En base a las imágenes obtenidas y según lo solicitado, la impresión diagnóstica es la siguiente:',
        isDefault: true
    },
    {
        id: 'default_2',
        name: 'Cóndilos normal',
        trigger: 'macro cóndilos normal',
        text: 'Cóndilos y ramas mandibulares de anatomía conservada.',
        isDefault: true
    },
    {
        id: 'default_3',
        name: 'Senos maxilares normal',
        trigger: 'macro senos normal',
        text: 'Senos maxilares de radiotransparencia de aspecto normal.',
        isDefault: true
    },
    {
        id: 'default_4',
        name: 'Periápices normales',
        trigger: 'macro periápices normales',
        text: 'Cámara y conductos permeables. Periápices normales.',
        isDefault: true
    },
    {
        id: 'default_5',
        name: 'Sugerir Bite-Wing',
        trigger: 'macro bite wing',
        text: 'Se sugiere complementar con radiografías Bite-Wing para evaluación precisa de presencia de caries proximales.',
        isDefault: true
    },
    {
        id: 'default_6',
        name: 'Sugerir Cone Beam',
        trigger: 'macro cone beam',
        text: 'Se sugiere complementar con Tomografía Computarizada Cone Beam para evaluación volumétrica.',
        isDefault: true
    },
    {
        id: 'default_7',
        name: 'Anatomía normal maxilar',
        trigger: 'macro maxilar normal',
        text: 'Senos maxilares de radiotransparencia de aspecto normal.',
        isDefault: true
    },
    {
        id: 'default_8',
        name: 'Sin hallazgos evidentes',
        trigger: 'macro sin hallazgos',
        text: 'No se observan hallazgos de relevancia clínica en las imágenes obtenidas.',
        isDefault: true
    }
];

class MacroManager {
    constructor() {
        this.macros = this.loadMacros();
    }

    loadMacros() {
        let userMacros = [];
        try {
            const raw = localStorage.getItem('user_macros');
            if (raw) userMacros = JSON.parse(raw);
        } catch (e) {
            console.warn('Error al leer macros:', e);
        }

        // Fusionar: defaults primero, luego los del usuario (por si editó IDs)
        const userIds = userMacros.map(m => m.id);
        const merged = [
            ...defaultMacros.filter(d => !userIds.includes(d.id)),
            ...userMacros
        ];
        return merged;
    }

    saveMacros() {
        // Solo guardar los NO-default o los que el usuario haya tocado
        const toSave = this.macros.filter(m => !m.isDefault);
        localStorage.setItem('user_macros', JSON.stringify(toSave));
    }

    addMacro(name, trigger, text) {
        const newMacro = {
            id: 'user_' + Date.now(),
            name: name.trim(),
            trigger: trigger.trim().toLowerCase(),
            text: text.trim(),
            isDefault: false
        };
        this.macros.push(newMacro);
        this.saveMacros();
        return newMacro;
    }

    deleteMacro(id) {
        const macro = this.macros.find(m => m.id === id);
        if (!macro) return false;
        this.macros = this.macros.filter(m => m.id !== id);
        this.saveMacros();
        return true;
    }

    getAllMacros() {
        return this.macros;
    }

    /**
     * Busca si el texto dictado contiene algún disparador.
     * Devuelve { found: true, trigger, replacement } o { found: false }
     */
    findByTrigger(spokenText) {
        const lower = spokenText.toLowerCase();
        for (const macro of this.macros) {
            if (lower.includes(macro.trigger)) {
                return {
                    found: true,
                    trigger: macro.trigger,
                    replacement: macro.text,
                    originalSpoken: spokenText
                };
            }
        }
        return { found: false };
    }
}

const macroManager = new MacroManager();

// ---- Insertar texto en la posición actual del cursor ----
function insertTextAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;

    // Agregar espacio antes si es necesario
    const prefix = (start > 0 && current[start - 1] !== '\n' && current[start - 1] !== ' ') ? ' ' : '';
    const suffix = (end < current.length && current[end] !== '\n' && current[end] !== ' ') ? ' ' : '';

    const newValue = current.substring(0, start) + prefix + text + suffix + current.substring(end);
    textarea.value = newValue;
    finalTranscript = newValue;

    // Mover cursor al final del texto insertado
    const newPos = start + prefix.length + text.length + suffix.length;
    textarea.selectionStart = newPos;
    textarea.selectionEnd = newPos;
    textarea.focus();

}


// ---- Renderizar lista en el modal de gestión ----
function renderMacroModalList() {
    const container = document.getElementById('macro-list-container');
    if (!container) return;

    container.innerHTML = '';
    const macros = macroManager.getAllMacros();

    if (macros.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 16px;">No hay macros definidos.</p>';
        return;
    }

    macros.forEach(macro => {
        const item = document.createElement('div');
        item.className = 'macro-list-item' + (macro.isDefault ? ' is-default' : '');

        const defaultBadge = macro.isDefault
            ? '<span style="font-size: 0.68rem; background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); border-radius: 4px; padding: 1px 6px; margin-left: 6px;">Default</span>'
            : '';

        item.innerHTML = `
            <div class="macro-item-info">
                <div class="macro-item-name">${macro.name}${defaultBadge}</div>
                <div class="macro-item-trigger">🎙️ Voz: "${macro.trigger}"</div>
                <div class="macro-item-text">${macro.text}</div>
            </div>
            <div class="macro-item-actions">
                <button class="macro-insert-btn" data-id="${macro.id}">⚡ Insertar</button>
                ${!macro.isDefault ? `<button class="icon-btn delete-macro-btn" data-id="${macro.id}" style="color: #ef4444; font-size: 1rem;" title="Eliminar"><i data-lucide="trash-2"></i></button>` : ''}
            </div>
        `;
        container.appendChild(item);
    });

    lucide.createIcons();

    // Eventos de insertar desde el modal
    container.querySelectorAll('.macro-insert-btn').forEach(btn => {
        btn.onclick = () => {
            const id = btn.getAttribute('data-id');
            const macro = macroManager.getAllMacros().find(m => m.id === id);
            if (macro) {
                insertTextAtCursor(transcriptionArea, macro.text);
                macrosModal.classList.add('hidden');
            }
        };
    });

    // Eventos de eliminar
    container.querySelectorAll('.delete-macro-btn').forEach(btn => {
        btn.onclick = () => {
            const id = btn.getAttribute('data-id');
            if (confirm('¿Eliminar este macro?')) {
                macroManager.deleteMacro(id);
                renderMacroModalList();
            }
        };
    });
}

// ---- Elementos del modal de macros ----
const macrosModal = document.getElementById('macros-modal');
const macrosBtn = document.getElementById('macros-btn');
const closeMacrosBtn = document.getElementById('close-macros-btn');
const manageMacrosInlineBtn = document.getElementById('manage-macros-inline-btn');
const addMacroBtn = document.getElementById('add-macro-btn');
const macroNameInput = document.getElementById('macro-name-input');
const macroTriggerInput = document.getElementById('macro-trigger-input');
const macroTextInput = document.getElementById('macro-text-input');

function openMacrosModal() {
    renderMacroModalList();
    macrosModal.classList.remove('hidden');
}

if (macrosBtn) macrosBtn.addEventListener('click', openMacrosModal);
if (manageMacrosInlineBtn) manageMacrosInlineBtn.addEventListener('click', openMacrosModal);
if (closeMacrosBtn) closeMacrosBtn.addEventListener('click', () => macrosModal.classList.add('hidden'));

// Cerrar al hacer clic fuera del modal
window.addEventListener('click', (e) => {
    if (e.target === macrosModal) macrosModal.classList.add('hidden');
});

// ---- Agregar nuevo macro ----
if (addMacroBtn) {
    addMacroBtn.addEventListener('click', () => {
        const name = macroNameInput.value.trim();
        const trigger = macroTriggerInput.value.trim();
        const text = macroTextInput.value.trim();

        if (!name || !trigger || !text) {
            alert('Por favor completa los tres campos: Nombre, Disparador de Voz y Texto.');
            return;
        }

        macroManager.addMacro(name, trigger, text);
        macroNameInput.value = '';
        macroTriggerInput.value = '';
        macroTextInput.value = '';

        renderMacroModalList();
    });
}

// ---- Exportar macros ----
const exportMacrosBtn = document.getElementById('export-macros-btn');
if (exportMacrosBtn) {
    exportMacrosBtn.addEventListener('click', () => {
        const data = macroManager.getAllMacros();
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
        const a = document.createElement('a');
        a.setAttribute('href', dataStr);
        a.setAttribute('download', 'macros_radiologicos.json');
        a.click();
    });
}

// ---- Importar macros ----
const importMacrosBtn = document.getElementById('import-macros-btn');
const importMacrosFile = document.getElementById('import-macros-file');

if (importMacrosBtn) importMacrosBtn.addEventListener('click', () => importMacrosFile.click());

if (importMacrosFile) {
    importMacrosFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            try {
                const imported = JSON.parse(ev.target.result);
                if (!Array.isArray(imported)) throw new Error('Formato inválido');
                // Agregar los macros importados que no sean default ni existan ya
                let added = 0;
                imported.forEach(m => {
                    if (m.name && m.trigger && m.text && !m.isDefault) {
                        macroManager.addMacro(m.name, m.trigger, m.text);
                        added++;
                    }
                });
                renderMacroModalList();
                alert(`${added} macro(s) importado(s) correctamente.`);
            } catch (err) {
                alert('El archivo no es un JSON de macros válido.');
            }
        };
        reader.readAsText(file);
        importMacrosFile.value = '';
    });
}

// ---- Integración con el reconocimiento de voz (detección de disparadores) ----
// Guardamos referencia al handler original de onresult para extenderlo

const _originalOnResult = recognition.onresult;

recognition.onresult = (event) => {
    let interimTranscript = '';
    finalTranscript = transcriptionArea.value;
    let newFinal = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
            newFinal += event.results[i][0].transcript;
        } else {
            interimTranscript += event.results[i][0].transcript;
        }
    }

    if (newFinal) {
        // Verificar si el texto contiene un disparador de macro
        const macroResult = macroManager.findByTrigger(newFinal);

        let textToAppend;
        if (macroResult.found) {
            // Reemplazar el disparador por el texto del macro
            const triggerRegex = new RegExp(macroResult.trigger, 'gi');
            const replaced = newFinal.replace(triggerRegex, macroResult.replacement);
            textToAppend = applyCorrections(replaced.trim());


        } else {
            textToAppend = applyCorrections(newFinal.trim());
        }

        // Agregar espacio si es necesario
        if (finalTranscript.length > 0 && !finalTranscript.endsWith(' ') && !finalTranscript.endsWith('\n')) {
            finalTranscript += ' ';
        }

        // Capitalizar inicio si aplica
        if (finalTranscript.length === 0 || finalTranscript.endsWith('. ') || finalTranscript.endsWith('\n')) {
            textToAppend = textToAppend.charAt(0).toUpperCase() + textToAppend.slice(1);
        }

        finalTranscript += textToAppend + ' ';
        transcriptionArea.value = finalTranscript;
    }

    transcriptionArea.scrollTop = transcriptionArea.scrollHeight;
};// === Lógica de Gmail (Envío Automático) ===
const sendGmailBtn = document.getElementById('send-gmail-btn');

if (sendGmailBtn) {
    sendGmailBtn.addEventListener('click', async () => {
        const originalText = sendGmailBtn.innerHTML;
        try {
            // 1. Preparar el documento (obtenemos el blob)
            const docData = await prepareDocument();
            if (!docData) return;

            sendGmailBtn.innerHTML = '<i class="lucide-loader-2 animate-spin"></i> Conectando...';
            sendGmailBtn.disabled = true;

            // 2. Autenticar
            await authenticateGmail();

            sendGmailBtn.innerHTML = '<i class="lucide-loader-2 animate-spin"></i> Buscando correo...';

            // 3. Obtener el nombre del paciente (limpio)
            const patientName = document.querySelector('#template-list-body span[id^="name-text-"]')?.textContent || ""; 
            // Nota: prepareDocument ya tiene el PACIENTE en dictValues, pero prepareDocument es asíncrono y devuelve el blob.
            // Extraeremos el nombre del área de transcripción o de lo que prepareDocument procesó.
            // Una mejor forma es que prepareDocument devuelva también el nombre procesado.
            
            // Buscamos el hilo del paciente usando su nombre completo
            const thread = await findPatientThread(docData.patientName); 

            if (!thread) {
                alert("No se encontró ningún correo reciente que coincida con el nombre del paciente.");
                sendGmailBtn.innerHTML = originalText;
                sendGmailBtn.disabled = false;
                return;
            }

            // 4. Confirmar envío con el usuario
            const lastMsg = thread.messages[thread.messages.length - 1];
            const headers = lastMsg.payload.headers;
            const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || 'Desconocido';
            
            const from = getHeader('From');
            const subject = getHeader('Subject');

            if (!confirm(`Se encontró un correo relacionado:\n\nDe: ${from}\nAsunto: ${subject}\n\n¿Quieres responder a este correo adjuntando el informe?`)) {
                sendGmailBtn.innerHTML = originalText;
                sendGmailBtn.disabled = false;
                return;
            }

            sendGmailBtn.innerHTML = '<i class="lucide-loader-2 animate-spin"></i> Enviando...';

            // 5. Enviar respuesta
            await sendReplyWithAttachment(thread, docData.blob, docData.fileNameBase + ".docx");

            alert("¡Informe enviado con éxito por Gmail!");
            sendGmailBtn.innerHTML = '<i data-lucide="check"></i> Enviado';
            setTimeout(() => {
                sendGmailBtn.innerHTML = originalText;
                sendGmailBtn.disabled = false;
                lucide.createIcons();
            }, 3000);

        } catch (err) {
            console.error("Error en flujo Gmail:", err);
            alert("Error al enviar por Gmail: " + (err.details || err.message || "Error desconocido"));
            sendGmailBtn.innerHTML = originalText;
            sendGmailBtn.disabled = false;
        }
    });
}

// --- CONEXIÓN CON SERVIDOR LOCAL PARA ATAJO F2 GLOBAL ---
let ws;
function connectWebSocket() {
    ws = new WebSocket('ws://localhost:8081');

    ws.onopen = () => {
        console.log('Conectado al servidor WebSocket local (F2 Global Activo)');
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.action === 'toggle_record') {
                console.log('Señal de F2 global recibida');
                if (typeof toggleRecording === 'function') {
                    toggleRecording();
                }
            }
        } catch (e) {
            console.error('Error procesando mensaje WebSocket:', e);
        }
    };

    ws.onclose = () => {
        console.log('Desconectado del servidor WebSocket local. Reintentando en 3s...');
        setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (error) => {
        console.error('Error en WebSocket:', error);
        ws.close();
    };
}

// Iniciar conexión
connectWebSocket();


// =============================================================
// === COPILOTO VISUAL (GEMINI VISION)                       ===
// =============================================================

const visionBtn = document.getElementById('vision-btn');
const visionModal = document.getElementById('vision-modal');
const closeVisionBtn = document.getElementById('close-vision-btn');
const visionPasteArea = document.getElementById('vision-paste-area');
const visionPreviewImg = document.getElementById('vision-preview-img');
const visionPromptInput = document.getElementById('vision-prompt-input');
const visionAnalyzeBtn = document.getElementById('vision-analyze-btn');
const visionResultContainer = document.getElementById('vision-result-container');
const visionResultText = document.getElementById('vision-result-text');
const visionCopyBtn = document.getElementById('vision-copy-btn');

let currentVisionBase64 = null;
let currentVisionMimeType = null;

if (visionBtn) visionBtn.addEventListener('click', () => visionModal.classList.remove('hidden'));
if (closeVisionBtn) closeVisionBtn.addEventListener('click', () => visionModal.classList.add('hidden'));

// Manejar pegado de imagen (Ctrl+V) en el área completa del modal
if (visionModal) {
    visionModal.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        let imageItem = null;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') === 0) {
                imageItem = items[i];
                break;
            }
        }

        if (imageItem) {
            const blob = imageItem.getAsFile();
            currentVisionMimeType = blob.type;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target.result;
                if (visionPreviewImg) {
                    visionPreviewImg.src = dataUrl;
                    visionPreviewImg.classList.remove('hidden');
                }
                const placeholder = document.querySelector('.paste-placeholder');
                if (placeholder) placeholder.style.display = 'none';
                
                // Extraer solo la parte base64 (remover data:image/png;base64,)
                currentVisionBase64 = dataUrl.split(',')[1];
                
                // Hacer focus en el input para que el usuario escriba qué quiere
                setTimeout(() => { if (visionPromptInput) visionPromptInput.focus(); }, 100);
            };
            reader.readAsDataURL(blob);
        }
    });
}

// También permitir Drag & Drop
if (visionPasteArea) {
    visionPasteArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        visionPasteArea.style.borderColor = '#8b5cf6';
        visionPasteArea.style.background = 'rgba(168, 85, 247, 0.1)';
    });

    visionPasteArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        visionPasteArea.style.borderColor = '';
        visionPasteArea.style.background = '';
    });

    visionPasteArea.addEventListener('drop', (e) => {
        e.preventDefault();
        visionPasteArea.style.borderColor = '';
        visionPasteArea.style.background = '';
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.indexOf('image') === 0) {
                currentVisionMimeType = file.type;
                const reader = new FileReader();
                reader.onload = (event) => {
                    const dataUrl = event.target.result;
                    if (visionPreviewImg) {
                        visionPreviewImg.src = dataUrl;
                        visionPreviewImg.classList.remove('hidden');
                    }
                    const placeholder = document.querySelector('.paste-placeholder');
                    if (placeholder) placeholder.style.display = 'none';
                    
                    currentVisionBase64 = dataUrl.split(',')[1];
                    setTimeout(() => { if (visionPromptInput) visionPromptInput.focus(); }, 100);
                };
                reader.readAsDataURL(file);
            } else {
                alert('Por favor, arrastra una imagen válida.');
            }
        }
    });
}

if (visionAnalyzeBtn) {
    visionAnalyzeBtn.addEventListener('click', async () => {
        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) {
            alert('Debes configurar tu API Key de Gemini primero en la configuración.');
            return;
        }

        if (!currentVisionBase64) {
            alert('Por favor pega (Ctrl+V) o arrastra una imagen primero.');
            return;
        }

        const userPrompt = visionPromptInput.value.trim() || 'Describe detalladamente los hallazgos radiográficos de esta lesión/imagen en términos técnicos odontológicos/maxilofaciales.';
        
        const originalText = visionAnalyzeBtn.innerHTML;
        visionAnalyzeBtn.innerHTML = '<span class="pulse" style="display:inline-block; margin-right:8px;"></span> Analizando imagen...';
        visionAnalyzeBtn.disabled = true;
        visionResultContainer.classList.add('hidden');

        try {
            const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            if (!listRes.ok) throw new Error("API Key inválida o no se pudo contactar al servidor de Google.");
            
            const listData = await listRes.json();
            
            // Filtrar modelos que soportan generación de contenido
            let availableModels = listData.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
            availableModels = availableModels.filter(m => !m.name.toLowerCase().includes('computer-use'));

            // Priorizar modelos 1.5 flash y pro
            const priorityOrder = [
                'gemini-1.5-flash',
                'gemini-1.5-flash-latest',
                'gemini-1.5-flash-8b',
                'gemini-1.5-pro',
                'gemini-1.5-pro-latest',
                'gemini-2.0-flash-exp'
            ];

            let validModels = [];
            priorityOrder.forEach(pName => {
                const found = availableModels.find(m => m.name.endsWith(pName));
                if (found) validModels.push(found);
            });

            // Agregar el resto
            availableModels.forEach(m => {
                const isModern = m.name.includes('1.5') || m.name.includes('2.0') || m.name.includes('2.5');
                if (isModern && !validModels.find(vm => vm.name === m.name)) {
                    validModels.push(m);
                }
            });

            if (validModels.length === 0) throw new Error("Tu cuenta no tiene modelos estables (1.5+) habilitados.");

            const payload = {
                systemInstruction: {
                    parts: [{ text: "Eres un experto radiólogo maxilofacial. Analiza la imagen proporcionada y responde a la duda del usuario utilizando terminología técnica precisa (bordes, radiolucidez, corticalización, etc.). No des un diagnóstico definitivo, sino describe radiográficamente los hallazgos para que el odontólogo pueda incorporarlos a su informe." }]
                },
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: userPrompt },
                            {
                                inlineData: {
                                    mimeType: currentVisionMimeType,
                                    data: currentVisionBase64
                                }
                            }
                        ]
                    }
                ],
                generationConfig: { temperature: 0.3 }
            };

            let successResponse = null;
            let lastErrorMsg = "";

            // Probar los modelos uno por uno
            for (const model of validModels) {
                const modelName = model.name.replace('models/', '');
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
                
                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    
                    if (response.ok) {
                        successResponse = await response.json();
                        break;
                    } else {
                        const errData = await response.json();
                        lastErrorMsg = errData.error?.message || "Error desconocido";
                        continue;
                    }
                } catch (err) {
                    lastErrorMsg = err.message;
                }
            }

            if (!successResponse) {
                throw new Error(`Ningún modelo procesó la imagen. Último error: ${lastErrorMsg}`);
            }

            const data = successResponse;
            
            if (data.candidates && data.candidates.length > 0) {
                const resultText = data.candidates[0].content.parts[0].text;
                visionResultText.innerText = resultText;
                visionResultContainer.classList.remove('hidden');
                
                // Registrar cuota si está disponible
                if (data.usageMetadata && typeof quotaManager !== 'undefined') {
                    quotaManager.recordUsage(data.usageMetadata);
                }
            } else {
                throw new Error("Gemini no devolvió ningún texto descriptivo.");
            }

        } catch (error) {
            console.error("Error en Copiloto Visual:", error);
            alert(`Ocurrió un error: ${error.message}`);
        } finally {
            visionAnalyzeBtn.innerHTML = originalText;
            visionAnalyzeBtn.disabled = false;
        }
    });
}

if (visionCopyBtn) {
    visionCopyBtn.addEventListener('click', () => {
        const text = visionResultText.innerText;
        navigator.clipboard.writeText(text).then(() => {
            const originalText = visionCopyBtn.innerHTML;
            visionCopyBtn.innerHTML = '<i data-lucide="check" style="width: 14px; height: 14px;"></i> Copiado!';
            if (typeof lucide !== 'undefined') lucide.createIcons();
            setTimeout(() => {
                visionCopyBtn.innerHTML = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Error al copiar: ', err);
            alert('Error al copiar al portapapeles');
        });
    });
}

// === Aprendizaje Automático de Correcciones ===
async function learnCorrections(original, edited, apiKey) {
    try {
        const prompt = `Compara el texto original con el texto editado por el usuario. 
El usuario ha corregido errores de dictado o términos médicos/radiológicos.
Extrae UNICAMENTE las palabras o frases cortas que fueron corregidas.
Ignora cambios de formato, mayúsculas a principio de oración, o puntuación.
Devuelve EXCLUSIVAMENTE un objeto JSON donde las claves son las palabras mal escritas (en el original) y los valores son las correcciones (en el editado).
Si no hay correcciones relevantes de palabras, devuelve {}.

Original: "${original}"
Editado: "${edited}"`;

        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            const resultText = data.candidates[0].content.parts[0].text;
            const newCorrections = JSON.parse(resultText);
            
            let addedCount = 0;
            for (const [wrong, right] of Object.entries(newCorrections)) {
                const w = wrong.toLowerCase().trim();
                const r = right.trim();
                // Avoid empty, identical or already existing ones
                if (w && r && w !== r.toLowerCase() && !correctionsDict[w]) {
                    correctionsDict[w] = r;
                    addedCount++;
                }
            }

            if (addedCount > 0) {
                localStorage.setItem('custom_dict', JSON.stringify(correctionsDict));
                if (typeof renderDict === 'function') renderDict();
                console.log(`Aprendidas ${addedCount} nuevas correcciones.`);
            }
        }
    } catch (e) {
        console.error("Error aprendiendo correcciones:", e);
    }
}
