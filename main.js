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
    "apicalmente engrosado": "apical levemente engrosado",
    "apical mente engrosado": "apical levemente engrosado",
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
    "set total": "Set Total",
    "se total": "Set Total",
    "ser total": "Set Total",
    "cet total": "Set Total",
    "ce total": "Set Total",
    "setotal": "Set Total",
    "se-total": "Set Total",
    
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

let correctionsMeta = {};
const savedMeta = localStorage.getItem('custom_dict_meta');
if (savedMeta) {
    try {
        correctionsMeta = JSON.parse(savedMeta);
    } catch (e) {
        console.error("Error al leer la metadata del diccionario", e);
    }
}


// === GESTOR DE PLANTILLAS ===
class TemplateManager {
    constructor() {
        this.defaults = {
            'QVA': { name: 'Centro Radiológico QVA', base64: templatesBase64.QVA, isDefault: true },
            'TALCA': { name: 'Centro Radiológico TALCA', base64: templatesBase64.TALCA, isDefault: true },
            'PLANTILLA_MP': { name: 'PLANTILLA MP', base64: templatesBase64.PLANTILLA_MP, isDefault: true },
            'CENTALIS': { name: 'Centro Radiológico CENTALIS', base64: templatesBase64.CENTALIS, isDefault: true },
            'HMS': { name: 'Centro Radiológico HMS', base64: templatesBase64.HMS, isDefault: true }
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

// === GESTOR DE COSTOS REALTIME WHISPER ===
class RealtimeCostManager {
    constructor() {
        this.ratePerMinute = 0.017;
        this.loadStats();
    }

    loadStats() {
        const today = new Date().toDateString();
        let saved = {};
        try {
            const stored = localStorage.getItem('realtime_cost_stats');
            if (stored) {
                saved = JSON.parse(stored) || {};
            }
        } catch (e) {
            console.error("Error parsing realtime_cost_stats:", e);
        }
        
        if (!saved || typeof saved !== 'object' || saved.date !== today) {
            this.stats = {
                date: today,
                dailyCost: 0,
                lastSessionCost: 0
            };
            this.saveStats();
        } else {
            this.stats = {
                date: today,
                dailyCost: Number(saved.dailyCost) || 0,
                lastSessionCost: Number(saved.lastSessionCost) || 0
            };
        }
        this.updateUI(0, false);
    }

    saveStats() {
        localStorage.setItem('realtime_cost_stats', JSON.stringify(this.stats));
    }

    recordSession(durationSeconds) {
        const cost = (durationSeconds / 60) * this.ratePerMinute;
        this.stats.lastSessionCost = cost;
        this.stats.dailyCost += cost;
        this.saveStats();
        this.updateUI(0, false);
    }

    updateUI(currentElapsedSeconds = 0, isRecording = false) {
        const container = document.getElementById('realtime-cost-container');
        const lastSessionEl = document.getElementById('last-session-cost');
        const elapsedTimeEl = document.getElementById('realtime-elapsed-time');
        const dailyCostEl = document.getElementById('daily-cost');
        const engineSelect = document.getElementById('engine-select');

        if (!container) return;

        // Solo mostrar si el motor seleccionado es Realtime Whisper
        if (engineSelect && engineSelect.value === 'realtime-whisper') {
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }

        const lastSessionVal = Number(this.stats ? this.stats.lastSessionCost : 0) || 0;
        const dailyCostVal = Number(this.stats ? this.stats.dailyCost : 0) || 0;

        if (lastSessionEl) {
            if (isRecording) {
                const currentCost = (currentElapsedSeconds / 60) * this.ratePerMinute;
                lastSessionEl.innerText = `$${currentCost.toFixed(4)}`;
            } else {
                lastSessionEl.innerText = `$${lastSessionVal.toFixed(4)}`;
            }
        }

        if (elapsedTimeEl) {
            const minutes = Math.floor(currentElapsedSeconds / 60).toString().padStart(2, '0');
            const seconds = Math.floor(currentElapsedSeconds % 60).toString().padStart(2, '0');
            elapsedTimeEl.innerText = `${minutes}:${seconds}`;
        }

        if (dailyCostEl) {
            if (isRecording) {
                const currentCost = (currentElapsedSeconds / 60) * this.ratePerMinute;
                dailyCostEl.innerText = `$${(dailyCostVal + currentCost).toFixed(4)}`;
            } else {
                dailyCostEl.innerText = `$${dailyCostVal.toFixed(4)}`;
            }
        }
    }
}

const realtimeCostManager = new RealtimeCostManager();

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
            lastSystemText = savedText;
        }
    }

    // Restaurar y gestionar selección de motor
    const engineSelect = document.getElementById('engine-select');
    if (engineSelect) {
        const savedEngine = localStorage.getItem('selected_engine');
        if (savedEngine) {
            engineSelect.value = savedEngine;
        }
        
        // Inicializar UI del costo
        if (typeof realtimeCostManager !== 'undefined') {
            realtimeCostManager.updateUI(0, false);
        }
        
        engineSelect.addEventListener('change', () => {
            localStorage.setItem('selected_engine', engineSelect.value);
            if (typeof realtimeCostManager !== 'undefined') {
                realtimeCostManager.updateUI(0, false);
            }
        });
    }
});

// --- ATAJOS DE TECLADO GLOBALES (Hotkeys) ---
document.addEventListener('keydown', (e) => {
    // F2 para Iniciar/Detener Dictado
    if (e.key === 'F2') {
        e.preventDefault(); 
        toggleRecording();
    }
    // F3 para Pausar/Reanudar (Realtime Whisper)
    if (e.key === 'F3') {
        e.preventDefault();
        if (typeof togglePauseRealtime === 'function') togglePauseRealtime();
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
const pauseBtn = document.getElementById('pause-btn');

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
let isRealtimePaused = false;
let finalTranscript = '';
let lastDictatedText = ''; // Track engine text before manual edits
let lastSystemText = ''; // Rastrear el último texto puesto por el sistema (antes de las correcciones del usuario)
let learnDebounceTimer = null; // Temporizador para el guardado asíncrono


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
        lastSystemText = finalTranscript;
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
let realtimeStartTime = null;
let realtimeCostInterval = null;
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

// Función para armar el prompt dinámico de Whisper basándose en correcciones previas
function buildWhisperPrompt() {
    const basePrompt = 'Informes radiológicos dentales. Diente 1.6: Restaurado. Caries distal. Periápices normales.';
    if (!correctionsDict) return basePrompt;
    
    // Obtener los términos correctos del diccionario (máximo 15 términos únicos para no exceder límites)
    const customTerms = Object.values(correctionsDict)
        .filter(term => typeof term === 'string' && term.length > 2 && !term.includes(' '))
        .slice(-15)
        .join(', ');
        
    if (customTerms) {
        return `${basePrompt} Términos y nombres específicos a transcribir correctamente: ${customTerms}.`;
    }
    return basePrompt;
}

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
            formData.append('prompt', buildWhisperPrompt()); // Guía de estilo dinámica para puntuación e IA acústica

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
                    lastSystemText = finalTranscript;
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
        if (pauseBtn) pauseBtn.classList.add('hidden');
        isRealtimePaused = false;
        if (pauseBtn) {
            pauseBtn.innerHTML = '<span class="icon"><i data-lucide="pause"></i></span>';
            pauseBtn.style.backgroundColor = '';
            pauseBtn.style.borderColor = '';
        }
    } else {
        if (isWhisper) {
            startWhisperRecording();
        } else if (isRealtimeWhisper) {
            startRealtimeWhisperRecording();
            if (pauseBtn) {
                pauseBtn.classList.remove('hidden');
                lucide.createIcons();
            }
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

            // --- INICIAR TIMER Y COSTO REALTIME ---
            realtimeStartTime = Date.now();
            if (typeof realtimeCostManager !== 'undefined') {
                realtimeCostManager.updateUI(0, true);
                if (realtimeCostInterval) clearInterval(realtimeCostInterval);
                realtimeCostInterval = setInterval(() => {
                    const elapsed = (Date.now() - realtimeStartTime) / 1000;
                    realtimeCostManager.updateUI(elapsed, true);
                }, 500);
            }

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
                if (isRealtimePaused) return;
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
                    lastSystemText = finalTranscript;
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

    // --- DETENER TIMER Y GUARDAR COSTO REALTIME ---
    if (realtimeCostInterval) {
        clearInterval(realtimeCostInterval);
        realtimeCostInterval = null;
    }
    if (realtimeStartTime && typeof realtimeCostManager !== 'undefined') {
        const elapsed = (Date.now() - realtimeStartTime) / 1000;
        realtimeCostManager.recordSession(elapsed);
        realtimeStartTime = null;
    }

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

if (pauseBtn) {
    pauseBtn.addEventListener('click', togglePauseRealtime);
}

function togglePauseRealtime() {
    if (!isRecording || engineSelect.value !== 'realtime-whisper') return;
    
    isRealtimePaused = !isRealtimePaused;
    
    if (isRealtimePaused) {
        pauseBtn.innerHTML = '<span class="icon"><i data-lucide="play"></i></span>';
        pauseBtn.style.backgroundColor = 'rgba(245, 158, 11, 0.2)';
        pauseBtn.style.borderColor = '#f59e0b';
        statusText.innerText = 'Pausado (No consume tokens)...';
        recordingPulse.classList.add('hidden');
    } else {
        pauseBtn.innerHTML = '<span class="icon"><i data-lucide="pause"></i></span>';
        pauseBtn.style.backgroundColor = '';
        pauseBtn.style.borderColor = '';
        statusText.innerText = 'Grabando (Tiempo Real)...';
        recordingPulse.classList.remove('hidden');
    }
    lucide.createIcons();
}

copyBtn.addEventListener('click', () => {
    triggerCorrectionCheck(); // Comprobar aprendizaje de forma consolidada antes de copiar
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

// Guardar texto al escribir manualmente y disparar aprendizaje con debounce
transcriptionArea.addEventListener('input', () => {
    finalTranscript = transcriptionArea.value;
    localStorage.setItem(AUTOSAVE_KEY, transcriptionArea.value);

    if (learnDebounceTimer) {
        clearTimeout(learnDebounceTimer);
    }
    
    learnDebounceTimer = setTimeout(() => {
        triggerCorrectionCheck();
    }, 4000);
});

// Comprobar aprendizaje de forma inmediata al perder el foco
transcriptionArea.addEventListener('blur', () => {
    triggerCorrectionCheck();
});

clearBtn.addEventListener('click', () => {
    if (confirm("¿Estás seguro de que deseas borrar todo el texto? Esta acción no se puede deshacer.")) {
        transcriptionArea.value = '';
        finalTranscript = '';
        lastSystemText = '';
        localStorage.removeItem(AUTOSAVE_KEY);
    }
});

// === Lógica de Configuración y Modal ===
const openaiKeyInput = document.getElementById('openai-key-input');
const anthropicKeyInput = document.getElementById('anthropic-key-input');
const zaiKeyInput = document.getElementById('zai-key-input');
const formatterModelSelect = document.getElementById('formatter-model-select');

// Cargar API Keys si existen
const savedApiKey = localStorage.getItem('gemini_api_key');
const savedOpenAIKey = localStorage.getItem('openai_api_key');
const savedAnthropicKey = localStorage.getItem('anthropic_api_key');
const savedZaiKey = localStorage.getItem('zai_api_key');
// Migración: el valor del selector pasó de 'claude-4.7-opus' a 'claude-opus-4-8' (mismo destino, nombre claro)
if (localStorage.getItem('formatter_model') === 'claude-4.7-opus') localStorage.setItem('formatter_model', 'claude-opus-4-8');
const savedFormatterModel = localStorage.getItem('formatter_model') || 'auto';

if (savedApiKey && apiKeyInput) apiKeyInput.value = savedApiKey;
if (savedOpenAIKey && openaiKeyInput) openaiKeyInput.value = savedOpenAIKey;
if (savedAnthropicKey && anthropicKeyInput) anthropicKeyInput.value = savedAnthropicKey;
if (savedZaiKey && zaiKeyInput) zaiKeyInput.value = savedZaiKey;
if (savedFormatterModel && formatterModelSelect) formatterModelSelect.value = savedFormatterModel;

// Hace que el botón "Procesar con IA" muestre el modelo realmente seleccionado (Claude o Gemini).
function actualizarBotonIA() {
    if (!aiProcessBtn) return;
    const fm = localStorage.getItem('formatter_model') || 'auto';
    const NOMBRES_MODELO = { 'claude-opus-4-8': 'Claude Opus 4.8', 'claude-sonnet-5': 'Claude Sonnet 5', 'claude-sonnet-4-6': 'Claude Sonnet 4.6', 'claude-haiku-4-5': 'Claude Haiku 4.5', 'gpt-4o-mini': 'GPT-4o mini', 'glm-5.2': 'GLM-5.2' };
    const nombre = NOMBRES_MODELO[fm] || (fm.startsWith('claude') ? 'Claude' : 'Gemini');
    aiProcessBtn.innerHTML = `<span class="icon"><i data-lucide="sparkles"></i></span> Procesar con IA (${nombre})`;
    if (window.lucide && lucide.createIcons) lucide.createIcons();
}
actualizarBotonIA();
actualizarContadorUI();

configBtn.addEventListener('click', () => {
    configModal.classList.remove('hidden');
});

closeModalBtn.addEventListener('click', () => {
    configModal.classList.add('hidden');
});

saveKeyBtn.addEventListener('click', () => {
    const geminiKey = apiKeyInput.value.trim();
    const openaiKey = openaiKeyInput ? openaiKeyInput.value.trim() : '';
    const anthropicKey = anthropicKeyInput ? anthropicKeyInput.value.trim() : '';
    const zaiKey = zaiKeyInput ? zaiKeyInput.value.trim() : '';
    const formatterModel = formatterModelSelect ? formatterModelSelect.value : 'auto';

    localStorage.setItem('gemini_api_key', geminiKey);
    localStorage.setItem('openai_api_key', openaiKey);
    localStorage.setItem('anthropic_api_key', anthropicKey);
    localStorage.setItem('zai_api_key', zaiKey);
    localStorage.setItem('formatter_model', formatterModel);
    actualizarBotonIA();
    
    alert('Configuración guardada exitosamente.');
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
        
        // Comprobar si es un término aprendido automáticamente
        const meta = correctionsMeta[wrong];
        const badge = (meta && meta.auto) 
            ? `<span class="auto-badge" style="font-size: 0.7rem; background: rgba(168, 85, 247, 0.15); color: #c084fc; padding: 2px 6px; border-radius: 10px; margin-left: 6px; border: 1px solid rgba(168, 85, 247, 0.3);" title="Aprendido automáticamente de tus correcciones">Auto</span>` 
            : '';
            
        tr.innerHTML = `
            <td style="padding: 8px; display: flex; align-items: center; gap: 4px;">${wrong}${badge}</td>
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
            delete correctionsMeta[wordToRemove];
            localStorage.setItem('custom_dict', JSON.stringify(correctionsDict));
            localStorage.setItem('custom_dict_meta', JSON.stringify(correctionsMeta));
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
    delete correctionsMeta[wrong]; // Quitar marca automática si el usuario lo define a mano
    localStorage.setItem('custom_dict', JSON.stringify(correctionsDict));
    localStorage.setItem('custom_dict_meta', JSON.stringify(correctionsMeta));
    
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
            lastSystemText = item.text;
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
    triggerCorrectionCheck(); // No bloqueante: el aprendizaje corre en 2º plano (ya se dispara en input/blur). El await previo retrasaba CADA procesado.
    const textToProcess = transcriptionArea.value.trim();
    const formatterModel = localStorage.getItem('formatter_model') || 'auto';

    if (!textToProcess) {
        alert('No hay texto para procesar. Por favor dicta algo primero.');
        return;
    }

    if (formatterModel.startsWith('claude')) {
        const anthropicKey = localStorage.getItem('anthropic_api_key');
        if (!anthropicKey) {
            alert('Debes configurar tu API Key de Anthropic primero haciendo clic en el icono de configuración (engranaje).');
            configModal.classList.remove('hidden');
            return;
        }

        const originalBtnText = aiProcessBtn.innerHTML;
        aiProcessBtn.innerHTML = '<span class="pulse" style="display:inline-block; margin-right:8px;"></span> Procesando...';
        aiProcessBtn.disabled = true;

        try {
            function buildDynamicSystemPrompt() {
                let basePrompt = typeof SYSTEM_PROMPT !== 'undefined' ? SYSTEM_PROMPT : 'Eres un formateador estricto.';
                
                if (Object.keys(correctionsDict).length > 0) {
                    let customRules = "\n\n### VOCABULARIO Y REGLAS DE REEMPLAZO PERSONALIZADAS DEL USUARIO (Prioridad Máxima):\n";
                    customRules += "Aplica estrictamente las siguientes correcciones de ortografía, terminología radiológica o vocabulario específico en el informe final:\n";
                    for (const [wrong, right] of Object.entries(correctionsDict)) {
                        if (wrong.toLowerCase().trim() !== right.toLowerCase().trim()) {
                            customRules += `- Si en el dictado aparece "${wrong}" (o variaciones fonéticas parecidas), debes escribir SIEMPRE "${right}".\n`;
                        }
                    }
                    basePrompt += customRules;
                }

                // Inyectar la fecha real del sistema para que el modelo NO la invente
                const _hoy = new Date();
                const _meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
                const _fechaHoy = `${_hoy.getDate()} de ${_meses[_hoy.getMonth()]} del ${_hoy.getFullYear()}`;
                basePrompt += `\n\n### DATO DEL SISTEMA — FECHA ACTUAL (PRIORIDAD MÁXIMA):\nLa fecha de hoy es: ${_fechaHoy}.\nREGLA DE FECHA: Si el dictado NO menciona ninguna fecha, escribe EXACTAMENTE "${_fechaHoy}" en la línea de fecha del encabezado. Está ESTRICTAMENTE PROHIBIDO inventar otra fecha o copiar las fechas de los ejemplos del prompt (como "18 de marzo del 2026"). Si el dictado SÍ menciona una fecha, usa la dictada.`;

                return basePrompt;
            }

            // Prompt caching: el prompt estable (SYSTEM_PROMPT) va en un bloque cacheable
            // (se paga ~10% al reusarlo); la parte dinámica (correcciones + fecha) va aparte
            // para no invalidar la caché cuando cambia.
            const _sysFull = buildDynamicSystemPrompt();
            const _sysBase = (typeof SYSTEM_PROMPT !== 'undefined' ? SYSTEM_PROMPT : 'Eres un formateador estricto.');
            const _sysExtra = _sysFull.startsWith(_sysBase) ? _sysFull.slice(_sysBase.length) : '';
            const _systemBlocks = [{ type: "text", text: _sysBase, cache_control: { type: "ephemeral", ttl: "1h" } }];
            if (_sysExtra.trim()) _systemBlocks.push({ type: "text", text: _sysExtra });

            const payload = {
                model: formatterModel,
                max_tokens: 4096,
                system: _systemBlocks,
                messages: [
                    {
                        role: "user",
                        content: `DICTADO DEL USUARIO A FORMATEAR (Aplica tus reglas estrictamente, sin saludos ni formato markdown):\n\n${textToProcess}`
                    }
                ]
            };

            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': anthropicKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const errDetail = errData.error?.message || `HTTP ${response.status}`;
                throw new Error(errDetail);
            }

            const responseData = await response.json();

            // Diagnóstico de prompt caching (abre la consola con F12 -> pestaña Console):
            // cuando funciona, a partir del 2º informe verás "cache leida" ~13000 y "entrada nueva" baja.
            const _u = responseData.usage || {};
            console.log(`[Claude cache] entrada nueva: ${_u.input_tokens || 0} | cache escrita: ${_u.cache_creation_input_tokens || 0} | cache leida: ${_u.cache_read_input_tokens || 0} | salida: ${_u.output_tokens || 0}`);

            if (responseData.content && responseData.content.length > 0 && responseData.content[0].text) {
                let resultText = responseData.content[0].text;
                resultText = adjustHeadersForSetTotal(resultText);
                resultText = ensureCBCTParams(resultText, textToProcess);
                resultText = normalizarSaltos(resultText);
                transcriptionArea.value = resultText;
                finalTranscript = resultText;
                lastSystemText = resultText;
                saveToHistory(resultText);

                // Red de seguridad: avisar si la IA omitió algún diente del dictado
                avisarDientesOmitidos(textToProcess, resultText);
                incrementarContadorInformes();
            } else {
                throw new Error("No se pudo obtener respuesta de Claude.");
            }
        } catch (error) {
            console.error("Error al procesar con Claude:", error);
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('CORS')) {
                alert(`Error de red al conectar con Anthropic. Esto suele deberse a restricciones de CORS del navegador para llamadas directas a APIs externas.\n\nSolución: Instala y activa una extensión de CORS bypass (ej: 'Allow CORS: Access-Control-Allow-Origin') en tu navegador o configura un proxy local.`);
            } else {
                alert(`Ocurrió un error con Claude: ${error.message}`);
            }
        } finally {
            aiProcessBtn.innerHTML = originalBtnText;
            aiProcessBtn.disabled = false;
        }
        return;
    }

    // === Rama GPT-4o mini (OpenAI) ===
    if (formatterModel === 'gpt-4o-mini') {
        const openaiKey = localStorage.getItem('openai_api_key');
        if (!openaiKey) {
            alert('Debes configurar tu API Key de OpenAI primero haciendo clic en el icono de configuración (engranaje).');
            configModal.classList.remove('hidden');
            return;
        }

        const originalBtnText = aiProcessBtn.innerHTML;
        aiProcessBtn.innerHTML = '<span class="pulse" style="display:inline-block; margin-right:8px;"></span> Procesando...';
        aiProcessBtn.disabled = true;

        try {
            let systemPrompt = typeof SYSTEM_PROMPT !== 'undefined' ? SYSTEM_PROMPT : 'Eres un formateador estricto.';
            if (Object.keys(correctionsDict).length > 0) {
                let customRules = "\n\n### VOCABULARIO Y REGLAS DE REEMPLAZO PERSONALIZADAS DEL USUARIO (Prioridad Máxima):\n";
                customRules += "Aplica estrictamente las siguientes correcciones de ortografía, terminología radiológica o vocabulario específico en el informe final:\n";
                for (const [wrong, right] of Object.entries(correctionsDict)) {
                    if (wrong.toLowerCase().trim() !== right.toLowerCase().trim()) {
                        customRules += `- Si en el dictado aparece "${wrong}" (o variaciones fonéticas parecidas), debes escribir SIEMPRE "${right}".\n`;
                    }
                }
                systemPrompt += customRules;
            }
            const _hoy = new Date();
            const _meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
            const _fechaHoy = `${_hoy.getDate()} de ${_meses[_hoy.getMonth()]} del ${_hoy.getFullYear()}`;
            systemPrompt += `\n\n### DATO DEL SISTEMA — FECHA ACTUAL (PRIORIDAD MÁXIMA):\nLa fecha de hoy es: ${_fechaHoy}.\nREGLA DE FECHA: Si el dictado NO menciona ninguna fecha, escribe EXACTAMENTE "${_fechaHoy}" en la línea de fecha del encabezado. Está ESTRICTAMENTE PROHIBIDO inventar otra fecha o copiar las fechas de los ejemplos del prompt (como "18 de marzo del 2026"). Si el dictado SÍ menciona una fecha, usa la dictada.`;

            const payload = {
                model: "gpt-4o-mini",
                temperature: 0.2,
                max_tokens: 4096,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `DICTADO DEL USUARIO A FORMATEAR (Aplica tus reglas estrictamente, sin saludos ni formato markdown):\n\n${textToProcess}` }
                ]
            };

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const errDetail = (errData.error && errData.error.message) ? errData.error.message : `HTTP ${response.status}`;
                throw new Error(errDetail);
            }

            const responseData = await response.json();
            const resultRaw = (responseData.choices && responseData.choices[0] && responseData.choices[0].message) ? responseData.choices[0].message.content : '';
            if (resultRaw && resultRaw.trim()) {
                let resultText = resultRaw;
                resultText = adjustHeadersForSetTotal(resultText);
                resultText = ensureCBCTParams(resultText, textToProcess);
                resultText = normalizarSaltos(resultText);
                transcriptionArea.value = resultText;
                finalTranscript = resultText;
                lastSystemText = resultText;
                saveToHistory(resultText);
                avisarDientesOmitidos(textToProcess, resultText);
                incrementarContadorInformes();
            } else {
                throw new Error("OpenAI (GPT-4o mini) no devolvió ningún contenido.");
            }
        } catch (error) {
            console.error("Error al procesar con GPT-4o mini:", error);
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('CORS')) {
                alert(`Error de red al conectar con OpenAI. Puede deberse a restricciones de CORS del navegador.\n\nSi persiste, procesa a través de un proxy/servidor local en lugar de llamar directo desde el navegador.`);
            } else {
                alert(`Ocurrió un error con GPT-4o mini: ${error.message}`);
            }
        } finally {
            aiProcessBtn.innerHTML = originalBtnText;
            aiProcessBtn.disabled = false;
        }
        return;
    }

    // === Rama GLM-5.2 (Z.AI, endpoint compatible con OpenAI) ===
    if (formatterModel === 'glm-5.2') {
        const zaiKey = localStorage.getItem('zai_api_key');
        if (!zaiKey) {
            alert('Debes configurar tu API Key de Z.AI primero haciendo clic en el icono de configuración (engranaje).');
            configModal.classList.remove('hidden');
            return;
        }

        const originalBtnText = aiProcessBtn.innerHTML;
        aiProcessBtn.innerHTML = '<span class="pulse" style="display:inline-block; margin-right:8px;"></span> Procesando...';
        aiProcessBtn.disabled = true;

        try {
            let systemPrompt = typeof SYSTEM_PROMPT !== 'undefined' ? SYSTEM_PROMPT : 'Eres un formateador estricto.';
            if (Object.keys(correctionsDict).length > 0) {
                let customRules = "\n\n### VOCABULARIO Y REGLAS DE REEMPLAZO PERSONALIZADAS DEL USUARIO (Prioridad Máxima):\n";
                customRules += "Aplica estrictamente las siguientes correcciones de ortografía, terminología radiológica o vocabulario específico en el informe final:\n";
                for (const [wrong, right] of Object.entries(correctionsDict)) {
                    if (wrong.toLowerCase().trim() !== right.toLowerCase().trim()) {
                        customRules += `- Si en el dictado aparece "${wrong}" (o variaciones fonéticas parecidas), debes escribir SIEMPRE "${right}".\n`;
                    }
                }
                systemPrompt += customRules;
            }
            const _hoy = new Date();
            const _meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
            const _fechaHoy = `${_hoy.getDate()} de ${_meses[_hoy.getMonth()]} del ${_hoy.getFullYear()}`;
            systemPrompt += `\n\n### DATO DEL SISTEMA — FECHA ACTUAL (PRIORIDAD MÁXIMA):\nLa fecha de hoy es: ${_fechaHoy}.\nREGLA DE FECHA: Si el dictado NO menciona ninguna fecha, escribe EXACTAMENTE "${_fechaHoy}" en la línea de fecha del encabezado. Está ESTRICTAMENTE PROHIBIDO inventar otra fecha o copiar las fechas de los ejemplos del prompt (como "18 de marzo del 2026"). Si el dictado SÍ menciona una fecha, usa la dictada.`;

            // thinking: disabled -> respuesta directa, más rápida y determinista para el formateo estricto.
            const payload = {
                model: "glm-5.2",
                temperature: 0.2,
                max_tokens: 4096,
                thinking: { type: "disabled" },
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `DICTADO DEL USUARIO A FORMATEAR (Aplica tus reglas estrictamente, sin saludos ni formato markdown):\n\n${textToProcess}` }
                ]
            };

            const response = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${zaiKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const errDetail = (errData.error && errData.error.message) ? errData.error.message : `HTTP ${response.status}`;
                throw new Error(errDetail);
            }

            const responseData = await response.json();
            let resultRaw = (responseData.choices && responseData.choices[0] && responseData.choices[0].message) ? responseData.choices[0].message.content : '';
            // Salvaguarda: si el modelo devolviera el razonamiento embebido, se elimina el bloque <think>...</think>.
            if (resultRaw) resultRaw = resultRaw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
            if (resultRaw && resultRaw.trim()) {
                let resultText = resultRaw;
                resultText = adjustHeadersForSetTotal(resultText);
                resultText = ensureCBCTParams(resultText, textToProcess);
                resultText = normalizarSaltos(resultText);
                transcriptionArea.value = resultText;
                finalTranscript = resultText;
                lastSystemText = resultText;
                saveToHistory(resultText);
                avisarDientesOmitidos(textToProcess, resultText);
                incrementarContadorInformes();
            } else {
                throw new Error("Z.AI (GLM-5.2) no devolvió ningún contenido.");
            }
        } catch (error) {
            console.error("Error al procesar con GLM-5.2:", error);
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('CORS')) {
                alert(`Error de red al conectar con Z.AI. Puede deberse a restricciones de CORS del navegador.\n\nSi persiste, procesa a través de un proxy/servidor local en lugar de llamar directo desde el navegador.`);
            } else {
                alert(`Ocurrió un error con GLM-5.2: ${error.message}`);
            }
        } finally {
            aiProcessBtn.innerHTML = originalBtnText;
            aiProcessBtn.disabled = false;
        }
        return;
    }

    const apiKey = localStorage.getItem('gemini_api_key');
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
        let validModels = [];
        try {
            // Lista de modelos cacheada 24h en localStorage (antes se pedía a Google en CADA clic)
            let listData = null;
            try {
                const _c = JSON.parse(localStorage.getItem('gemini_models_cache') || 'null');
                if (_c && _c.ts && (Date.now() - _c.ts) < 86400000 && _c.data) listData = _c.data;
            } catch (e) {}
            if (!listData) {
                const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                if (listRes.ok) {
                    listData = await listRes.json();
                    try { localStorage.setItem('gemini_models_cache', JSON.stringify({ ts: Date.now(), data: listData })); } catch (e) {}
                }
            }
            if (listData && listData.models) {
                let availableModels = listData.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
                // Excluir modelos que NO son de texto o están descontinuados (evita caer en p.ej. gemini-robotics-er-1.5-preview)
                const MODELOS_EXCLUIDOS = ['computer-use','robotics','embedding','aqa','imagen','veo','tts','vision','thinking','learnlm','gemma'];
                availableModels = availableModels.filter(m => !MODELOS_EXCLUIDOS.some(x => m.name.toLowerCase().includes(x)));

                const priorityOrder = [];
                if (formatterModel !== 'auto' && formatterModel.startsWith('gemini-')) {
                    priorityOrder.push(formatterModel);
                }
                const defaultPriority = [
                    'gemini-3.5-flash',
                    'gemini-3-flash',
                    'gemini-flash-latest',
                    'gemini-2.5-flash',
                    'gemini-2.0-flash',
                    'gemini-2.5-flash-lite',
                    'gemini-1.5-flash-latest',
                    'gemini-1.5-flash'
                ];
                defaultPriority.forEach(pName => {
                    if (!priorityOrder.includes(pName)) {
                        priorityOrder.push(pName);
                    }
                });

                priorityOrder.forEach(pName => {
                    const found = availableModels.find(m => m.name.endsWith(pName));
                    if (found) validModels.push(found);
                });

                availableModels.forEach(m => {
                    const isModern = m.name.includes('gemini-3') || m.name.includes('2.5') || m.name.includes('2.0') || m.name.includes('1.5');
                    if (isModern && !validModels.find(vm => vm.name === m.name)) {
                        validModels.push(m);
                    }
                });
            }
        } catch (listErr) {
            console.warn("No se pudo obtener la lista de modelos de Gemini dinámicamente en formateador. Usando defaults.", listErr);
        }

        if (validModels.length === 0) {
            const fallbackModels = ['gemini-3.5-flash', 'gemini-3-flash', 'gemini-2.5-flash'];
            fallbackModels.forEach(mName => {
                validModels.push({ name: `models/${mName}` });
            });
        }

        // Función para armar el prompt de sistema dinámico incluyendo las correcciones
        function buildDynamicSystemPrompt() {
            let basePrompt = typeof SYSTEM_PROMPT !== 'undefined' ? SYSTEM_PROMPT : 'Eres un formateador estricto.';
            
            if (Object.keys(correctionsDict).length > 0) {
                let customRules = "\n\n### VOCABULARIO Y REGLAS DE REEMPLAZO PERSONALIZADAS DEL USUARIO (Prioridad Máxima):\n";
                customRules += "Aplica estrictamente las siguientes correcciones de ortografía, terminología radiológica o vocabulario específico en el informe final:\n";
                for (const [wrong, right] of Object.entries(correctionsDict)) {
                    if (wrong.toLowerCase().trim() !== right.toLowerCase().trim()) {
                        customRules += `- Si en el dictado aparece "${wrong}" (o variaciones fonéticas parecidas), debes escribir SIEMPRE "${right}".\n`;
                    }
                }
                basePrompt += customRules;
            }

            // Inyectar la fecha real del sistema para que el modelo NO la invente
            const _hoy = new Date();
            const _meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
            const _fechaHoy = `${_hoy.getDate()} de ${_meses[_hoy.getMonth()]} del ${_hoy.getFullYear()}`;
            basePrompt += `\n\n### DATO DEL SISTEMA — FECHA ACTUAL (PRIORIDAD MÁXIMA):\nLa fecha de hoy es: ${_fechaHoy}.\nREGLA DE FECHA: Si el dictado NO menciona ninguna fecha, escribe EXACTAMENTE "${_fechaHoy}" en la línea de fecha del encabezado. Está ESTRICTAMENTE PROHIBIDO inventar otra fecha o copiar las fechas de los ejemplos del prompt (como "18 de marzo del 2026"). Si el dictado SÍ menciona una fecha, usa la dictada.`;

            return basePrompt;
        }

        const payload = {
            systemInstruction: {
                parts: [{ text: buildDynamicSystemPrompt() }]
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

        // 3. Probar como máximo 3 modelos (antes recorría TODA la lista) con timeout por intento
        for (const model of validModels.slice(0, 3)) {
            const modelName = model.name.replace('models/', '');
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

            const _ctrl = new AbortController();
            const _to = setTimeout(() => _ctrl.abort(), 30000); // corta intentos colgados a los 30s
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    signal: _ctrl.signal
                });
                clearTimeout(_to);

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
                clearTimeout(_to);
                lastErrorMsg = err.name === 'AbortError' ? 'Tiempo de espera agotado (30s)' : err.message;
            }
        }

        if (!successResponse) {
            const _esCuota = /quota|limit|exhaust|rate|429|resource_exhausted/i.test(lastErrorMsg);
            // FALLBACK: si se agotó la cuota gratis de Gemini y hay clave de Anthropic,
            // procesamos este informe con Claude Haiku sin interrumpir al usuario.
            if (_esCuota && localStorage.getItem('anthropic_api_key')) {
                console.info('[fallback] Cuota de Gemini agotada -> procesando con Claude Haiku 4.5.');
                aiProcessBtn.innerHTML = '<span class="pulse" style="display:inline-block; margin-right:8px;"></span> Cuota Gemini agotada -> Haiku...';
                const _ok = await procesarConClaudeFallback(textToProcess, 'claude-haiku-4-5');
                if (_ok) return; // listo vía fallback (el finally restaura el botón)
                throw new Error('Se agotó la cuota de Gemini y el fallback a Haiku no devolvió contenido. Revisa tu clave de Anthropic.');
            }
            if (_esCuota) {
                throw new Error(`Has agotado el límite de uso gratuito por ahora. Configura tu clave de Anthropic para el fallback automático a Haiku, o espera 1-2 minutos. (Error: ${lastErrorMsg})`);
            }
            throw new Error(`Los modelos disponibles en tu cuenta gratuita están restringidos o sin cuota. Error: ${lastErrorMsg}`);
        }

        if (successResponse.candidates && successResponse.candidates.length > 0) {
            let resultText = successResponse.candidates[0].content.parts[0].text;
            resultText = adjustHeadersForSetTotal(resultText);
            resultText = ensureCBCTParams(resultText, textToProcess);
            transcriptionArea.value = resultText;
            finalTranscript = resultText;
            lastSystemText = resultText;
            
            // Guardar en el historial
            saveToHistory(resultText);
            
            // Red de seguridad: avisar si la IA omitió algún diente del dictado
            avisarDientesOmitidos(textToProcess, resultText);
            incrementarContadorInformes();

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

// === FALLBACK automático Gemini -> Claude ===
// Cuando Gemini gratis agota su cuota, procesamos ESE informe con Claude (Haiku por
// defecto), reusando el mismo system prompt + caché de 1h + post-proceso de la rama
// Claude. Devuelve true si tuvo éxito; lanza error si la llamada a Anthropic falla.
async function procesarConClaudeFallback(textToProcess, modelo) {
    const anthropicKey = localStorage.getItem('anthropic_api_key');
    if (!anthropicKey) return false;

    const basePrompt = (typeof SYSTEM_PROMPT !== 'undefined' ? SYSTEM_PROMPT : 'Eres un formateador estricto.');
    let extra = "";
    if (Object.keys(correctionsDict).length > 0) {
        extra += "\n\n### VOCABULARIO Y REGLAS DE REEMPLAZO PERSONALIZADAS DEL USUARIO (Prioridad Máxima):\n";
        extra += "Aplica estrictamente las siguientes correcciones de ortografía, terminología radiológica o vocabulario específico en el informe final:\n";
        for (const [wrong, right] of Object.entries(correctionsDict)) {
            if (wrong.toLowerCase().trim() !== right.toLowerCase().trim()) {
                extra += `- Si en el dictado aparece "${wrong}" (o variaciones fonéticas parecidas), debes escribir SIEMPRE "${right}".\n`;
            }
        }
    }
    const _hoy = new Date();
    const _meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
    const _fechaHoy = `${_hoy.getDate()} de ${_meses[_hoy.getMonth()]} del ${_hoy.getFullYear()}`;
    extra += `\n\n### DATO DEL SISTEMA — FECHA ACTUAL (PRIORIDAD MÁXIMA):\nLa fecha de hoy es: ${_fechaHoy}.\nREGLA DE FECHA: Si el dictado NO menciona ninguna fecha, escribe EXACTAMENTE "${_fechaHoy}" en la línea de fecha del encabezado. Está ESTRICTAMENTE PROHIBIDO inventar otra fecha o copiar las fechas de los ejemplos del prompt (como "18 de marzo del 2026"). Si el dictado SÍ menciona una fecha, usa la dictada.`;

    const _systemBlocks = [{ type: "text", text: basePrompt, cache_control: { type: "ephemeral", ttl: "1h" } }];
    if (extra.trim()) _systemBlocks.push({ type: "text", text: extra });

    const payload = {
        model: modelo,
        max_tokens: 4096,
        system: _systemBlocks,
        messages: [{ role: "user", content: `DICTADO DEL USUARIO A FORMATEAR (Aplica tus reglas estrictamente, sin saludos ni formato markdown):\n\n${textToProcess}` }]
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const e = await response.json().catch(() => ({}));
        throw new Error(e.error?.message || `HTTP ${response.status}`);
    }
    const data = await response.json();
    if (data.content && data.content.length > 0 && data.content[0].text) {
        let resultText = data.content[0].text;
        resultText = adjustHeadersForSetTotal(resultText);
        resultText = ensureCBCTParams(resultText, textToProcess);
        resultText = normalizarSaltos(resultText);
        transcriptionArea.value = resultText;
        finalTranscript = resultText;
        lastSystemText = resultText;
        saveToHistory(resultText);
        avisarDientesOmitidos(textToProcess, resultText);
        incrementarContadorInformes();
        return true;
    }
    return false;
}

// === Lógica de Generación de Archivo Word (.docx) ===

// Red de seguridad determinista: detecta dientes (formato FDI X.X) presentes en el
// dictado que la IA omitió en el informe, y avisa al usuario para que los revise.
function avisarDientesOmitidos(dictado, informe) {
    try {
        const re = /\b[1-8]\.[1-8]\b/g;
        const enDictado = new Set((dictado || '').match(re) || []);
        const enInforme = new Set((informe || '').match(re) || []);
        const faltantes = [...enDictado].filter(d => !enInforme.has(d)).sort();
        if (faltantes.length === 0) return;

        // Los temporales (primer dígito 5-8) son el caso crítico: Haiku tiende a
        // "normalizarlos" a su diente permanente (ej. 7.5 -> 3.5). Se destacan aparte.
        const temporales = faltantes.filter(d => /^[5-8]\./.test(d));
        let msg = "⚠️ POSIBLE OMISIÓN DE DIENTES\n\n" +
                  "Estos dientes estaban en el dictado pero NO aparecen en el informe generado:\n\n" +
                  faltantes.join(",  ");
        if (temporales.length > 0) {
            msg += "\n\n🦷 OJO con el/los diente(s) TEMPORAL(ES) " + temporales.join(", ") +
                   ": revisa que la IA no los haya cambiado por su permanente (ej. 7.5 → 3.5). " +
                   "Deben aparecer tal cual los dictaste.";
        }
        msg += "\n\nRevisa el informe o vuelve a procesar.";
        alert(msg);
    } catch (e) {
        console.warn("No se pudo verificar omisión de dientes:", e);
    }
}

// ===== Contador de informes procesados (diario y mensual, guardado en localStorage) =====
function _fechaClavesContador() {
    const d = new Date();
    const dia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { dia, mes: dia.slice(0, 7) };
}
function _leerContadorInformes() {
    let c;
    try { c = JSON.parse(localStorage.getItem('contador_informes') || '{}'); } catch (e) { c = {}; }
    const { dia, mes } = _fechaClavesContador();
    if (c.dia !== dia) { c.dia = dia; c.nDia = 0; }   // cambió el día -> reinicia el conteo diario
    if (c.mes !== mes) { c.mes = mes; c.nMes = 0; }   // cambió el mes -> reinicia el conteo mensual
    return c;
}
function actualizarContadorUI() {
    const c = _leerContadorInformes();
    localStorage.setItem('contador_informes', JSON.stringify(c));
    const ed = document.getElementById('cont-dia');
    const em = document.getElementById('cont-mes');
    if (ed) ed.textContent = c.nDia || 0;
    if (em) em.textContent = c.nMes || 0;
}
function incrementarContadorInformes() {
    const c = _leerContadorInformes();
    c.nDia = (c.nDia || 0) + 1;
    c.nMes = (c.nMes || 0) + 1;
    localStorage.setItem('contador_informes', JSON.stringify(c));
    actualizarContadorUI();
}

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

// Función común para ajustar encabezados si el estudio es Set Total y no Panorámica
function adjustHeadersForSetTotal(text) {
    if (!text) return text;
    const estudioMatch = text.match(/TIPO\s+DE\s+ESTUDIO\s*:\s*([^\n\r]+)/i);
    if (estudioMatch && estudioMatch[1]) {
        const estudio = estudioMatch[1].toLowerCase();
        if (estudio.includes("set total") && !estudio.includes("panorámica") && !estudio.includes("panoramica")) {
            text = text.replace(/^\s*maxilar\s*:/gmi, "ARCADA SUPERIOR:");
            text = text.replace(/^\s*(mandíbula|mandibula)\s*:/gmi, "ARCADA INFERIOR:");
        }
    }
    return text;
}

// === Red de seguridad CBCT: bloque de parámetros técnicos ===
// El modelo (Gemini/Claude) a veces omite el bloque de parámetros del Cone-Beam
// porque choca con las reglas de "cero alucinación / no copiar los ejemplos" del
// prompt. Como ese bloque es texto fijo del equipo, lo insertamos por código para
// garantizar que SIEMPRE aparezca. Solo se inyecta si el estudio es Cone-Beam y el
// modelo NO lo incluyó (si el modelo ya lo puso, se respeta tal cual).
//
// Si cambian los valores del equipo (FOV, vóxel, etc.), edítalos aquí:
const CBCT_PARAM_LINES = [
    "-\tParámetros de exposición: 90,0 Kv; 14,0 mA; 15,004 s; 1251 mGy x cm2.",
    "-\tTamaño de campo de visión (FOV): 80 mm x 80 mm x 50 mm.",
    "-\tTamaño de vóxel: 0,15 mm isotrópico (150 µm x 150 µm x 150 µm).",
    "-\tSe reconstruye la adquisición volumétrica mediante software Planmeca Romexis ®.",
    "-\tPanorex y cortes paraxiales",
    "-\tCortes paraxiales: espesor 1,0 mm; distanciamiento {D} mm."
];
// Distanciamiento por defecto si el dictado no menciona intervalo/distanciamiento:
const CBCT_DIST_DEFAULT = "1,0";

function ensureCBCTParams(text, dictado = "") {
    if (!text) return text;

    // 1. ¿El estudio es Cone-Beam? (se busca en la línea TIPO DE ESTUDIO)
    const estudioMatch = text.match(/TIPO\s+DE\s+ESTUDIO\s*:\s*([^\n\r]+)/i);
    if (!estudioMatch) return text;
    if (!/cone[\s-]*beam|cbct/i.test(estudioMatch[1])) return text;

    // 2. Distanciamiento: es el ÚNICO valor variable del bloque. Se toma del dictado
    //    (palabras clave "distanciamiento"/"intervalo") o el valor por defecto. Se calcula
    //    ANTES de tocar el texto, para poder leerlo aunque el modelo ya lo hubiera escrito.
    let dist = CBCT_DIST_DEFAULT;
    const distMatch = (dictado + "\n" + text).match(/(?:distanciamiento|intervalo)\s*(?:de\s*)?(\d+(?:[.,]\d+)?)\s*mm/i);
    if (distMatch) dist = distMatch[1].replace(".", ",");

    const bloque = CBCT_PARAM_LINES.map(l => l.replace("{D}", dist)).join("\n");

    // 3. Forzar el bloque completo a los valores ESTÁNDAR FIJOS del equipo. Se eliminan
    //    las líneas de parámetros que haya escrito el modelo (Haiku tiende a ponerlas como
    //    "Sin especificar"; Flash sí copiaba los valores de la plantilla) y se sustituyen
    //    por el bloque fijo. El único dato del dictado que se conserva es el distanciamiento
    //    (ya calculado). Las líneas se reconocen por su término técnico precedido de una
    //    viñeta/guion, formato que no aparece en los hallazgos clínicos.
    const isParamLine = (l) => /^\s*[-–—•*]\s*.*(par[aá]metros de exposici[oó]n|tama[ñn]o de campo de visi[oó]n|\bFOV\b|tama[ñn]o de v[oó]xel|se reconstruye la adquisici[oó]n volum[eé]trica|software\s+planmeca|romexis|panorex|cortes\s+paraxiales)/i.test(l);

    const lines = text.split("\n").filter(l => !isParamLine(l));

    // 4. Insertar el bloque estándar justo después de la línea "TIPO DE ESTUDIO".
    const idx = lines.findIndex(l => /^\s*TIPO\s+DE\s+ESTUDIO/i.test(l));
    if (idx === -1) return text;
    lines.splice(idx + 1, 0, bloque);
    console.info("[CBCT] Bloque de parámetros técnicos normalizado a los valores estándar del equipo. Verifica FOV/exposición/distanciamiento si el estudio no fue estándar.");
    return lines.join("\n");
}

// Normaliza el espaciado del informe en DOS pasos:
//  1) Colapsa TODA línea en blanco a un solo salto. Haiku tiende a meter una línea en
//     blanco entre cada hallazgo; dentro de un bloque el formato es single-spaced.
//  2) Reinserta UNA línea en blanco SOLO antes de cada encabezado de bloque mayor
//     (datos clínicos / impresión / arcadas), como en los informes de referencia y como
//     pidió el usuario. Es estructura FIJA, así que se hace por código y queda idéntico
//     con cualquier modelo (Haiku, Flash, etc.), sin depender de que el modelo lo respete.
// La verificación del eval ignora los saltos, así que esto solo cambia la presentación.
function normalizarSaltos(text) {
    if (!text) return text;
    let t = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    t = t.replace(/[ \t]+\n/g, "\n");   // quita espacios al final de cada línea
    t = t.replace(/\n{2,}/g, "\n");      // colapsa TODA línea en blanco -> un solo salto
    t = t.trim();

    // Encabezados que abren un bloque y deben llevar una línea en blanco por encima.
    // (QUE DESEA SABER y TIPO DE ESTUDIO NO van aquí: pertenecen al mismo bloque que
    // ANT. CLÍNICOS y van pegados a él.)
    const ES_ENCABEZADO_BLOQUE = /^\s*(ANT\.?\s+CL[IÍ]NICOS|EN BASE A LAS IM[AÁ]GENES|MAXILAR\s*:|MAND[IÍ]BULA\s*:|ARCADA\s+SUPERIOR\s*:|ARCADA\s+INFERIOR\s*:|ATM\s+DERECHA\s*:|ATM\s+IZQUIERDA\s*:)/i;
    const lineas = t.split("\n");
    const salida = [];
    for (let i = 0; i < lineas.length; i++) {
        if (i > 0 && ES_ENCABEZADO_BLOQUE.test(lineas[i]) && salida[salida.length - 1].trim() !== "") {
            salida.push("");   // línea en blanco de separación entre bloques
        }
        salida.push(lineas[i]);
    }
    return salida.join("\n");
}

// Función común para preparar el documento procesado
async function prepareDocument() {
    let text = transcriptionArea.value.trim();
    if (!text) {
        alert("Primero dicta o escribe un informe.");
        return null;
    }

    // Auto-ajustar encabezados si corresponde a un Set Total
    const adjustedText = adjustHeadersForSetTotal(text);
    if (adjustedText !== text) {
        text = adjustedText;
        transcriptionArea.value = text;
        finalTranscript = text;
        localStorage.setItem(AUTOSAVE_KEY, text);
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

    // Fallback: Si no se detectó doctor en el dictado, usar "Dr(a). Tratante" (nunca inventar un nombre)
    if (!dictValues.DOCTOR) {
        dictValues.DOCTOR = "Dr(a). Tratante";
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
            compression: "DEFLATE", // Comprime el .docx como lo hace Word real. Sin esto sale sin comprimir (~3x mas grande) y Gmail lo marca como "virus detectado" (falso positivo).
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
        await triggerCorrectionCheck(); // Aprender correcciones acumuladas antes de generar Word
        const docData = await prepareDocument();
        if (docData) {
            window.saveAs(docData.blob, docData.fileNameBase + ".docx");
        }
        lastDictatedText = transcriptionArea.value.trim();
    });
}

if (generatePdfBtn) generatePdfBtn.addEventListener('click', async () => {
    await triggerCorrectionCheck(); // Aprender correcciones acumuladas antes de generar PDF
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
    const fdiPattern = /\b([1-8])\.(\d)\b/g;
    
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
    lastSystemText = newValue;

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
        lastSystemText = finalTranscript;
    }

    transcriptionArea.scrollTop = transcriptionArea.scrollHeight;
};// === Lógica de Gmail (Envío Automático) ===
const sendGmailBtn = document.getElementById('send-gmail-btn');

if (sendGmailBtn) {
    sendGmailBtn.addEventListener('click', async () => {
        await triggerCorrectionCheck(); // Aprender correcciones acumuladas antes de enviar Gmail
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
// El servidor (servidor_dictado.py) es OPCIONAL. Si no está corriendo, reintentamos
// unas pocas veces con backoff y luego nos detenemos en silencio para no llenar la
// consola. Para reactivar F2: inicia el servidor y recarga, o ejecuta reconectarF2().
let ws = null;
let wsIntentos = 0;
let wsTimer = null;
let wsRendido = false;
const WS_MAX_INTENTOS = 4;      // tras esto deja de intentar (sin spam)
const WS_BASE_DELAY = 3000;     // backoff: 3s, 6s, 12s... (máx 60s)

function connectWebSocket() {
    if (wsTimer) { clearTimeout(wsTimer); wsTimer = null; }
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

    let socket;
    try {
        socket = new WebSocket('ws://localhost:8081');
    } catch (e) {
        return; // entorno sin WebSocket: salir en silencio
    }
    ws = socket;

    socket.onopen = () => {
        wsIntentos = 0;
        wsRendido = false;
        console.log('Conectado al servidor WebSocket local (F2 Global Activo)');
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.action === 'toggle_record' && typeof toggleRecording === 'function') {
                toggleRecording();
            }
        } catch (e) { /* mensaje no válido: ignorar */ }
    };

    socket.onclose = () => {
        if (wsRendido) return;
        wsIntentos++;
        if (wsIntentos >= WS_MAX_INTENTOS) {
            wsRendido = true;
            console.info('F2 global desactivado (servidor_dictado.py no detectado). ' +
                'Los atajos dentro de la pestaña siguen funcionando. ' +
                'Para activarlo: inicia el servidor y recarga, o ejecuta reconectarF2().');
            return;
        }
        const delay = Math.min(WS_BASE_DELAY * (2 ** (wsIntentos - 1)), 60000);
        wsTimer = setTimeout(connectWebSocket, delay);
    };

    // El navegador ya imprime su propio aviso al fallar; no lo duplicamos. El reintento
    // vive en onclose, que siempre se dispara tras un error de conexión.
    socket.onerror = () => { try { socket.close(); } catch (e) {} };
}

// Reactivar F2 manualmente desde la consola sin recargar.
function reconectarF2() {
    wsRendido = false;
    wsIntentos = 0;
    connectWebSocket();
}
window.reconectarF2 = reconectarF2;

// Iniciar conexión SOLO si la app corre en localhost (servidor F2 local). En GitHub
// Pages u otro host (https), el navegador bloquea el WebSocket a ws://localhost
// (contenido mixto) y solo generaría errores, así que ni lo intentamos.
const ES_LOCAL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname === '[::1]');
if (ES_LOCAL) {
    connectWebSocket();
} else {
    console.info('F2 global desactivado (la app no corre en localhost). Los atajos dentro de la pestaña funcionan igual.');
}


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
const visionModelSelect = document.getElementById('vision-model-select');

let currentVisionBase64 = null;
let currentVisionMimeType = null;
let visionModelsLoaded = false;

// Variables de control para anotador interactivo
let annotations = [];
let activeTool = 'caries';
let selectedAnnotationIndex = -1;
let draggedAnnotationIndex = -1;
let draggedHandle = null; // 'tl', 'tr', 'bl', 'br', 't', 'b', 'l', 'r', 'move'
let hoveredAnnotationIndex = -1;
let dragStartPos = { x: 0, y: 0 };
let drawingNewBox = false;
let newBoxStart = { x: 0, y: 0 };
let newBoxEnd = { x: 0, y: 0 };

let activeDrawMode = 'box'; // 'box' o 'lasso'
let drawingLasso = false;
let drawingLassoPoints = []; // [{x, y}] en coordenadas del canvas

const HANDLE_SIZE = 6;

// Prompts del sistema para diagnóstico radiológico detallado con detección de objetos en JSON estructurado
const RADIOLOGY_SYSTEM_PROMPT = `Eres un odontólogo especialista en radiología oral y maxilofacial de nivel mundial. Tu tarea es analizar de forma científica y sumamente rigurosa la imagen radiográfica dental provista (periapical, bite-wing, panorámica, CBCT) y redactar un informe clínico técnico extremadamente preciso en español, además de identificar coordenadas espaciales de sospechas clínicas.

### INSTRUCCIONES DE FORMATO OBLIGATORIAS:
Debes responder ÚNICAMENTE con un objeto JSON válido (sin envolver en markdown \`\`\`json ni nada similar, solo texto plano JSON válido) con el siguiente esquema:
{
  "reportMarkdown": "Texto largo en Markdown del informe clínico...",
  "suspicions": [
    {
      "type": "caries" o "apical" o "oseo",
      "label": "Caries" o "Lesión Apical" o "Soporte Óseo",
      "box_2d": [ymin, xmin, ymax, xmax],
      "description": "Breve descripción clínica del hallazgo con referencia a la pieza o zona (máximo 60 caracteres)"
    }
  ]
}

### EXPLICACIÓN DE COORDENADAS box_2d:
- box_2d representa la caja delimitadora del hallazgo usando coordenadas normalizadas de 0 a 1000.
- El formato es [ymin, xmin, ymax, xmax], donde [0, 0, 1000, 1000] representa la imagen completa.
- xmin y xmax corresponden al eje horizontal (izquierda a derecha de la imagen).
- ymin y ymax corresponden al eje vertical (arriba a abajo de la imagen).
- Ejemplo: si hay una caries en el centro, su caja podría ser [400, 350, 480, 420].
- Asegúrate de detectar con la mayor precisión posible la ubicación de las caries, lesiones apicales o reabsorción ósea.

### DIRECTRICES CLÍNICAS CRÍTICAS (PARA EVITAR ERRORES DE DIAGNÓSTICO):
1. **PROHIBICIÓN ESTRICTA DE ADIVINAR NÚMEROS DE DIENTES EN IMÁGENES CORTADAS**:
   - En radiografías periapicales, bite-wing o recortes donde no se aprecie toda la arcada ni la línea media, es IMPOSIBLE determinar con certeza absoluta la numeración exacta de las piezas (FDI o Universal).
   - **NUNCA inventes, presumas o asumas números específicos de dientes** (por ejemplo, no digas "#38 o #48", "#46", "#11", etc.) a menos que la imagen muestre referencias anatómicas inequívocas o el usuario lo indique explícitamente en su consulta.
   - En su lugar, describe siempre las piezas de forma descriptivo-anatómica relativa. Por ejemplo:
     * "pieza molar inferior distal al espacio edéntulo"
     * "pieza adyacente a la brecha por mesial"
     * "molar inferior remanente"
     * "premolar superior"
   - El uso de números de dientes inventados arruina la credibilidad clínica del informe. Sé humilde y profesional: si no se puede saber el número exacto, descríbelo anatómicamente. Manten esta nomenclatura descriptiva también en las descripciones de las sospechas (suspicions).

2. **IDENTIFICACIÓN DE BRECHAS EDÉNTULAS Y PIEZAS INCLINADAS**:
   - Observa con atención si faltan dientes (brechas/gaps edéntulos).
   - Si hay una brecha edéntula, analiza si las piezas vecinas se han inclinado o mesioangulado hacia el espacio vacío (hallazgo clínico muy común e importante). Reporta esto formalmente como "inclinación mesial / mesioangulación de la pieza distal a la brecha".

3. **ANÁLISIS RIGUROSO POR ESTRUCTURA Y DENSIDAD**:
   - **Coronario:** Evalúa pérdida de estructura, restauraciones (radiopacas) y presencia de lesiones de caries (zonas radiolúcidas). Especifica caras afectadas (mesial, distal, oclusal, vestibular, lingual, cervical) y profundidad (limita a esmalte, penetra dentina, o compromete/está muy próxima a la cámara pulpar).
   - **Radicular / Endodóntico:** Evalúa número de raíces, morfología, tratamientos de conducto (obturación de conductos radiopaca), indicando si son completos, subobturados, o sobreobturados. Identifica si hay conductos calcificados, instrumentos fracturados, o reabsorción radicular.
   - **Periodontal / Soporte Óseo:** Describe la altura de las crestas óseas alveolares (reabsorción ósea horizontal o vertical, especificando si es leve, moderada o severa). Evalúa el espacio del ligamento periodontal (ensanchado o conservado) y la integridad de la cortical alveolar (lámina dura).
   - **Zona Periapical / Apical:** Busca y describe detalladamente cualquier zona radiolúcida periapical (compatible con osteólisis periapical, granuloma, quiste periapical) indicando sus límites (difusos, netos, corticalizados).

4. **EVITA CONTRADICCIONES**:
   - No digas que un diente es "pieza #38 o #48" en la misma frase. Si no tienes certeza del lado (izquierdo o derecho), explícalo claramente: "Se observa pieza molar inferior en el cuadrante visible (debido al recorte de la radiografía, no es posible determinar si corresponde al tercer o cuarto cuadrante)..."

5. **TERMINOLOGÍA PROFESIONAL Y TONO**:
   - Utiliza vocabulario clínico estándar de la especialidad de Radiología Oral y Maxilofacial (ej. "radiolucidez", "radiopacidad", "brecha edéntula", "mesioangulación", "zona radiolúcida periapical de límites difusos").
   - El tono debe ser formal, estructurado y objetivo. Las conclusiones deben presentarse como hipótesis o sugerencias diagnósticas, nunca como un diagnóstico clínico definitivo (ej. "compatible con...", "sugerente de...", "correlacionar clínicamente con...").

### ESTRUCTURA OBLIGATORIA DEL REPORTE (reportMarkdown):
**1. TIPO DE IMAGEN Y REGIÓN ANATÓMICA**
- [Identificación técnica del tipo de radiografía y la región visible, p. ej. radiografía retroalveolar/periapical de zona molar inferior]

**2. HALLAZGOS RADIOGRÁFICOS DETALLADOS**
- **Área Edéntula:** [Si aplica: describir brechas edéntulas y posibles inclinaciones/migraciones de piezas vecinas]
- **Estructura Coronaria:** [Caries con caras y profundidad, restauraciones, desgastes, etc. Referenciar de forma anatómica relativa]
- **Estructura Radicular / Endodoncia:** [Tratamiento de conducto, conductos calcificados, morfología, etc.]
- **Tejidos de Soporte y Zona Apical:** [Altura ósea alveolar, ligamento periodontal, lámina dura, lesiones radiolúcidas periapicales]

**3. RELACIÓN CON ESTRUCTURAS ANATÓMICAS VECINAS**
- [Relación con el seno maxilar, conducto dentario inferior, corticales óseas, etc.]

**4. CORRELACIÓN CLÍNICA Y SUGERENCIAS DIAGNÓSTICAS**
- [Hipótesis diagnósticas en orden de probabilidad, p. ej. "Sugerente de caries profunda", "Compatible con periodontitis apical crónica". Recuerda enfatizar que el diagnóstico definitivo requiere correlación clínica presencial].`;

// Función para parsear Markdown simple a HTML en la UI
function parseMarkdownToHTML(mdText) {
    if (!mdText) return '';
    let html = mdText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Reemplazar **negrita**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Reemplazar * cursiva o viñetas simples
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    return html;
}

// Limpia bloques de código markdown de una respuesta de texto JSON
function cleanJSONString(str) {
    let clean = str.trim();
    if (clean.startsWith('```')) {
        const firstNewLine = clean.indexOf('\n');
        if (firstNewLine !== -1) {
            clean = clean.slice(firstNewLine).trim();
        }
        if (clean.endsWith('```')) {
            clean = clean.slice(0, -3).trim();
        }
    }
    if (clean.startsWith('json')) {
        clean = clean.slice(4).trim();
    }
    return clean;
}

// Mapeo bidireccional de coordenadas
function normalizedToCanvas(box, canvas) {
    const [ymin, xmin, ymax, xmax] = box;
    const cw = canvas.width || 1;
    const ch = canvas.height || 1;
    return {
        x: (xmin / 1000) * cw,
        y: (ymin / 1000) * ch,
        width: ((xmax - xmin) / 1000) * cw,
        height: ((ymax - ymin) / 1000) * ch
    };
}

function canvasToNormalized(rect, canvas) {
    const cw = canvas.width || 1;
    const ch = canvas.height || 1;
    const xmin = Math.round((rect.x / cw) * 1000);
    const ymin = Math.round((rect.y / ch) * 1000);
    const xmax = Math.round(((rect.x + rect.width) / cw) * 1000);
    const ymax = Math.round(((rect.y + rect.height) / ch) * 1000);
    
    return [
        Math.max(0, Math.min(1000, Math.min(ymin, ymax))),
        Math.max(0, Math.min(1000, Math.min(xmin, xmax))),
        Math.max(0, Math.min(1000, Math.max(ymin, ymax))),
        Math.max(0, Math.min(1000, Math.max(xmin, xmax)))
    ];
}

function scaleAnnotationPoints(ann, oldRect, newRect, canvas) {
    if (!ann.points || ann.points.length === 0) return;
    
    const oldW = oldRect.width || 1;
    const oldH = oldRect.height || 1;
    const newW = newRect.width;
    const newH = newRect.height;
    
    ann.points = ann.points.map(pt => {
        // Convert to canvas coordinates
        const canvasX = (pt.x / 1000) * canvas.width;
        const canvasY = (pt.y / 1000) * canvas.height;
        
        // Relative percentage inside old bounding box
        const pctX = (canvasX - oldRect.x) / oldW;
        const pctY = (canvasY - oldRect.y) / oldH;
        
        // Map to new bounding box coordinates
        let newX = newRect.x + pctX * newW;
        let newY = newRect.y + pctY * newH;
        
        // Clamp to canvas boundaries
        if (newX < 0) newX = 0;
        if (newX > canvas.width) newX = canvas.width;
        if (newY < 0) newY = 0;
        if (newY > canvas.height) newY = canvas.height;
        
        // Re-normalize (0-1000)
        return {
            x: (newX / canvas.width) * 1000,
            y: (newY / canvas.height) * 1000
        };
    });
}

// Colores del anotador
function getAnnotationColor(type) {
    switch (type) {
        case 'caries': return '#ef4444';
        case 'apical': return '#f59e0b';
        case 'oseo': return '#3b82f6';
        default: return '#8b5cf6';
    }
}

function getAnnotationFillColor(type, highlighted) {
    const opacity = highlighted ? '0.25' : '0.12';
    switch (type) {
        case 'caries': return `rgba(239, 68, 68, ${opacity})`;
        case 'apical': return `rgba(245, 158, 11, ${opacity})`;
        case 'oseo': return `rgba(59, 130, 246, ${opacity})`;
        default: return `rgba(139, 92, 246, ${opacity})`;
    }
}

function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Obtener coordenadas de tiradores
function getHandleCoords(x, y, width, height) {
    return {
        tl: { x: x, y: y },
        tr: { x: x + width, y: y },
        bl: { x: x, y: y + height },
        br: { x: x + width, y: y + height },
        t:  { x: x + width / 2, y: y },
        b:  { x: x + width / 2, y: y + height },
        l:  { x: x, y: y + height / 2 },
        r:  { x: x + width, y: y + height / 2 }
    };
}

// Detección de colisiones
function getHitTestResult(mx, my) {
    const canvas = document.getElementById('vision-canvas');
    if (!canvas) return { type: 'empty' };

    // 1. Check handles of selected annotation first
    if (selectedAnnotationIndex !== -1) {
        const ann = annotations[selectedAnnotationIndex];
        const { x, y, width, height } = normalizedToCanvas(ann.box_2d, canvas);
        const handles = getHandleCoords(x, y, width, height);
        
        for (const h in handles) {
            const hp = handles[h];
            if (Math.abs(mx - hp.x) <= HANDLE_SIZE && Math.abs(my - hp.y) <= HANDLE_SIZE) {
                return { type: 'handle', index: selectedAnnotationIndex, handle: h };
            }
        }
    }

    // 2. Check box hits (reverse order for top-most box)
    for (let i = annotations.length - 1; i >= 0; i--) {
        const ann = annotations[i];
        const { x, y, width, height } = normalizedToCanvas(ann.box_2d, canvas);
        if (mx >= x && mx <= x + width && my >= y && my <= y + height) {
            return { type: 'box', index: i, handle: 'move' };
        }
    }

    return { type: 'empty' };
}

// Redibujar anotaciones en el canvas
function drawAnnotations() {
    const canvas = document.getElementById('vision-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    annotations.forEach((ann, index) => {
        const { x, y, width, height } = normalizedToCanvas(ann.box_2d, canvas);
        const color = getAnnotationColor(ann.type);
        const isSelected = index === selectedAnnotationIndex;
        const isHovered = index === hoveredAnnotationIndex;

        // Borde y relleno
        ctx.fillStyle = getAnnotationFillColor(ann.type, isSelected || isHovered);
        ctx.strokeStyle = color;
        ctx.lineWidth = isSelected ? 2.5 : (isHovered ? 2 : 1.5);
        if (isSelected) {
            ctx.setLineDash([4, 4]);
        } else {
            ctx.setLineDash([]);
        }

        if (ann.points && ann.points.length > 0) {
            // Dibujar polígono del lazo
            ctx.beginPath();
            ann.points.forEach((pt, ptIdx) => {
                const ptX = (pt.x / 1000) * canvas.width;
                const ptY = (pt.y / 1000) * canvas.height;
                if (ptIdx === 0) {
                    ctx.moveTo(ptX, ptY);
                } else {
                    ctx.lineTo(ptX, ptY);
                }
            });
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else {
            // Rectángulo tradicional
            ctx.fillRect(x, y, width, height);
            ctx.strokeRect(x, y, width, height);
        }
        ctx.setLineDash([]);

        // Texto
        const labelText = ann.description || ann.label || capitalizeFirstLetter(ann.type);
        ctx.font = 'bold 10px sans-serif';
        ctx.textBaseline = 'top';
        const textWidth = ctx.measureText(labelText).width;
        
        ctx.fillStyle = color;
        const labelY = y - 14 >= 0 ? y - 14 : y;
        ctx.fillRect(x, labelY, textWidth + 8, 14);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, x + 4, labelY + 2);

        // Tiradores (caja delimitadora)
        if (isSelected) {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;

            const handles = getHandleCoords(x, y, width, height);
            for (const h in handles) {
                const hp = handles[h];
                ctx.beginPath();
                ctx.rect(hp.x - HANDLE_SIZE / 2, hp.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
                ctx.fill();
                ctx.stroke();
            }
        }
    });

    // Caja temporal al dibujar
    if (drawingNewBox && newBoxStart && newBoxEnd) {
        const x = Math.min(newBoxStart.x, newBoxEnd.x);
        const y = Math.min(newBoxStart.y, newBoxEnd.y);
        const w = Math.abs(newBoxEnd.x - newBoxStart.x);
        const h = Math.abs(newBoxEnd.y - newBoxStart.y);
        const color = getAnnotationColor(activeTool);
        
        ctx.fillStyle = getAnnotationFillColor(activeTool, true);
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
    }

    // Lazo temporal al dibujar
    if (drawingLasso && drawingLassoPoints.length > 0) {
        const color = getAnnotationColor(activeTool);
        ctx.fillStyle = getAnnotationFillColor(activeTool, true);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        drawingLassoPoints.forEach((pt, ptIdx) => {
            if (ptIdx === 0) {
                ctx.moveTo(pt.x, pt.y);
            } else {
                ctx.lineTo(pt.x, pt.y);
            }
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
}

// Redimensionar tamaño físico del Canvas interactivo
function resizeCanvas() {
    const canvas = document.getElementById('vision-canvas');
    const img = document.getElementById('vision-preview-img');
    const container = document.getElementById('vision-canvas-container');
    if (!canvas || !img || !container) return;
    
    if (img.clientWidth > 0 && img.clientHeight > 0) {
        canvas.width = img.clientWidth;
        canvas.height = img.clientHeight;
        container.style.width = img.clientWidth + 'px';
        container.style.height = img.clientHeight + 'px';
        drawAnnotations();
    }
}

// Actualizar cursor del canvas
function updateCursorAndHover(e) {
    const canvas = document.getElementById('vision-canvas');
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const hit = getHitTestResult(mx, my);
    
    let prevHovered = hoveredAnnotationIndex;
    if (hit.type === 'box') {
        hoveredAnnotationIndex = hit.index;
    } else {
        hoveredAnnotationIndex = -1;
    }

    if (prevHovered !== hoveredAnnotationIndex) {
        drawAnnotations();
        updateAnnotationsHighlightInList();
    }

    if (hit.type === 'handle') {
        const h = hit.handle;
        if (h === 'tl' || h === 'br') canvas.style.cursor = 'nwse-resize';
        else if (h === 'tr' || h === 'bl') canvas.style.cursor = 'nesw-resize';
        else if (h === 't' || h === 'b') canvas.style.cursor = 'ns-resize';
        else if (h === 'l' || h === 'r') canvas.style.cursor = 'ew-resize';
    } else if (hit.type === 'box') {
        canvas.style.cursor = 'move';
    } else {
        canvas.style.cursor = 'crosshair';
    }
}

// Sincronizar listado lateral de hallazgos
function updateAnnotationsList() {
    const listContainer = document.getElementById('annotations-list-container');
    const divider = document.getElementById('annotations-divider');
    const list = document.getElementById('annotations-list');
    
    if (!listContainer || !list) return;

    if (annotations.length === 0) {
        listContainer.classList.add('hidden');
        if (divider) divider.classList.add('hidden');
        list.innerHTML = '';
        return;
    }

    listContainer.classList.remove('hidden');
    if (divider) divider.classList.remove('hidden');

    list.innerHTML = annotations.map((ann, idx) => {
        const color = getAnnotationColor(ann.type);
        const labelText = ann.description || ann.label || capitalizeFirstLetter(ann.type);
        const isSelected = idx === selectedAnnotationIndex;
        const highlightClass = isSelected ? 'highlighted' : '';
        
        return `
            <div class="annotation-item ${highlightClass}" data-id="${ann.id}" data-index="${idx}"
                 onmouseenter="highlightAnnotation(${ann.id})" 
                 onmouseleave="unhighlightAnnotation(${ann.id})"
                 onclick="selectAnnotationFromList(${ann.id})">
                <span class="annotation-item-color-bullet" style="background: ${color};"></span>
                <input type="text" class="annotation-item-input" value="${labelText}" 
                       oninput="updateAnnotationLabel(${ann.id}, this.value)"
                       onclick="event.stopPropagation()">
                <button class="annotation-item-delete-btn" onclick="event.stopPropagation(); deleteAnnotation(${ann.id})" title="Eliminar hallazgo">
                    <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                </button>
            </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function updateAnnotationsHighlightInList() {
    const items = document.querySelectorAll('.annotation-item');
    items.forEach(item => {
        const idx = parseInt(item.getAttribute('data-index'));
        if (idx === selectedAnnotationIndex || idx === hoveredAnnotationIndex) {
            item.classList.add('highlighted');
        } else {
            item.classList.remove('highlighted');
        }
    });
}

// Definición de funciones globales asociadas a controles de la vista
window.selectAnnotationTool = function(type) {
    activeTool = type;
    const buttons = document.querySelectorAll('#vision-annotation-toolbar .tool-btn');
    buttons.forEach(btn => {
        if (btn.getAttribute('data-type') === type) {
            btn.classList.add('active');
            if (type === 'caries') {
                btn.style.background = 'rgba(239, 68, 68, 0.2)';
                btn.style.borderColor = '#ef4444';
                btn.style.color = '#fca5a5';
            } else if (type === 'apical') {
                btn.style.background = 'rgba(245, 158, 11, 0.2)';
                btn.style.borderColor = '#f59e0b';
                btn.style.color = '#fde047';
            } else if (type === 'oseo') {
                btn.style.background = 'rgba(59, 130, 246, 0.2)';
                btn.style.borderColor = '#3b82f6';
                btn.style.color = '#93c5fd';
            }
        } else {
            btn.classList.remove('active');
            const btnType = btn.getAttribute('data-type');
            if (btnType === 'caries') {
                btn.style.background = 'rgba(239, 68, 68, 0.1)';
                btn.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                btn.style.color = '#fca5a5';
            } else if (btnType === 'apical') {
                btn.style.background = 'rgba(245, 158, 11, 0.1)';
                btn.style.borderColor = 'rgba(245, 158, 11, 0.4)';
                btn.style.color = '#fde047';
            } else if (btnType === 'oseo') {
                btn.style.background = 'rgba(59, 130, 246, 0.1)';
                btn.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                btn.style.color = '#93c5fd';
            }
        }
    });
};

window.setDrawMode = function(mode) {
    activeDrawMode = mode;
    const boxBtn = document.getElementById('draw-mode-box');
    const lassoBtn = document.getElementById('draw-mode-lasso');
    if (!boxBtn || !lassoBtn) return;
    
    if (mode === 'box') {
        boxBtn.classList.add('active');
        boxBtn.style.background = 'rgba(168, 85, 247, 0.2)';
        boxBtn.style.borderColor = '#a855f7';
        boxBtn.style.color = '#e9d5ff';
        
        lassoBtn.classList.remove('active');
        lassoBtn.style.background = 'rgba(255, 255, 255, 0.05)';
        lassoBtn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        lassoBtn.style.color = 'var(--text-secondary)';
    } else {
        lassoBtn.classList.add('active');
        lassoBtn.style.background = 'rgba(168, 85, 247, 0.2)';
        lassoBtn.style.borderColor = '#a855f7';
        lassoBtn.style.color = '#e9d5ff';
        
        boxBtn.classList.remove('active');
        boxBtn.style.background = 'rgba(255, 255, 255, 0.05)';
        boxBtn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        boxBtn.style.color = 'var(--text-secondary)';
    }
};

window.clearAllAnnotations = function() {
    if (confirm('¿Seguro que deseas eliminar todas las anotaciones?')) {
        annotations = [];
        selectedAnnotationIndex = -1;
        hoveredAnnotationIndex = -1;
        updateAnnotationsList();
        drawAnnotations();
    }
};

window.deleteAnnotation = function(id) {
    const index = annotations.findIndex(ann => ann.id === id);
    if (index !== -1) {
        annotations.splice(index, 1);
        if (selectedAnnotationIndex === index) {
            selectedAnnotationIndex = -1;
        } else if (selectedAnnotationIndex > index) {
            selectedAnnotationIndex--;
        }
        
        if (hoveredAnnotationIndex === index) {
            hoveredAnnotationIndex = -1;
        } else if (hoveredAnnotationIndex > index) {
            hoveredAnnotationIndex--;
        }

        updateAnnotationsList();
        drawAnnotations();
    }
};

window.updateAnnotationLabel = function(id, text) {
    const ann = annotations.find(ann => ann.id === id);
    if (ann) {
        ann.description = text;
        drawAnnotations();
    }
};

window.highlightAnnotation = function(id) {
    const index = annotations.findIndex(ann => ann.id === id);
    if (index !== -1) {
        hoveredAnnotationIndex = index;
        drawAnnotations();
        const el = document.querySelector(`.annotation-item[data-id="${id}"]`);
        if (el) el.classList.add('highlighted');
    }
};

window.unhighlightAnnotation = function(id) {
    const index = annotations.findIndex(ann => ann.id === id);
    if (index !== -1 && hoveredAnnotationIndex === index) {
        hoveredAnnotationIndex = -1;
        drawAnnotations();
        const el = document.querySelector(`.annotation-item[data-id="${id}"]`);
        if (el) el.classList.remove('highlighted');
    }
};

window.selectAnnotationFromList = function(id) {
    const index = annotations.findIndex(ann => ann.id === id);
    if (index !== -1) {
        selectedAnnotationIndex = index;
        drawAnnotations();
        updateAnnotationsHighlightInList();
    }
};

// Fusionar imagen de fondo y anotaciones a alta resolución y descargar
window.exportAnnotatedImage = function() {
    const img = document.getElementById('vision-preview-img');
    if (!img || !img.src || annotations.length === 0) {
        alert('Carga una imagen y realiza anotaciones antes de guardar.');
        return;
    }

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = img.naturalWidth;
    exportCanvas.height = img.naturalHeight;
    const ctx = exportCanvas.getContext('2d');

    // Pintar fondo original
    ctx.drawImage(img, 0, 0);

    // Pintar anotaciones escaladas
    annotations.forEach(ann => {
        const [ymin, xmin, ymax, xmax] = ann.box_2d;
        const x = (xmin / 1000) * img.naturalWidth;
        const y = (ymin / 1000) * img.naturalHeight;
        const w = ((xmax - xmin) / 1000) * img.naturalWidth;
        const h = ((ymax - ymin) / 1000) * img.naturalHeight;
        const color = getAnnotationColor(ann.type);
        const lineWidth = Math.max(2, Math.round(img.naturalWidth / 400));

        ctx.fillStyle = getAnnotationFillColor(ann.type, false);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;

        if (ann.points && ann.points.length > 0) {
            // Pintar polígono del lazo escalado
            ctx.beginPath();
            ann.points.forEach((pt, ptIdx) => {
                const ptX = (pt.x / 1000) * img.naturalWidth;
                const ptY = (pt.y / 1000) * img.naturalHeight;
                if (ptIdx === 0) {
                    ctx.moveTo(ptX, ptY);
                } else {
                    ctx.lineTo(ptX, ptY);
                }
            });
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else {
            // Relleno y borde rectangular tradicional
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
        }

        // Etiqueta de texto
        const labelText = ann.description || ann.label || capitalizeFirstLetter(ann.type);
        const fontSize = Math.max(12, Math.round(img.naturalWidth / 60));
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textBaseline = 'top';
        const textWidth = ctx.measureText(labelText).width;
        
        const labelHeight = fontSize + 6;
        const labelY = y - labelHeight >= 0 ? y - labelHeight : y;

        // Fondo de etiqueta
        ctx.fillStyle = color;
        ctx.fillRect(x, labelY, textWidth + 10, labelHeight);

        // Texto de etiqueta
        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, x + 5, labelY + 3);
    });

    const link = document.createElement('a');
    link.download = 'radiografia_anotada.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
};

// Inicializar eventos de ratón en Canvas
function initCanvasEvents() {
    const canvas = document.getElementById('vision-canvas');
    if (!canvas) return;

    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        let mx = e.clientX - rect.left;
        let my = e.clientY - rect.top;
        if (mx < 0) mx = 0;
        if (mx > canvas.width) mx = canvas.width;
        if (my < 0) my = 0;
        if (my > canvas.height) my = canvas.height;

        const hit = getHitTestResult(mx, my);
        dragStartPos = { x: mx, y: my };

        if (hit.type === 'handle') {
            draggedAnnotationIndex = hit.index;
            draggedHandle = hit.handle;
        } else if (hit.type === 'box') {
            draggedAnnotationIndex = hit.index;
            draggedHandle = 'move';
            selectedAnnotationIndex = hit.index;
            updateAnnotationsList();
        } else {
            if (activeDrawMode === 'lasso') {
                drawingLasso = true;
                drawingLassoPoints = [{ x: mx, y: my }];
                selectedAnnotationIndex = -1;
                updateAnnotationsList();
            } else {
                drawingNewBox = true;
                newBoxStart = { x: mx, y: my };
                newBoxEnd = { x: mx, y: my };
                selectedAnnotationIndex = -1;
                updateAnnotationsList();
            }
        }
        drawAnnotations();
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        let mx = e.clientX - rect.left;
        let my = e.clientY - rect.top;
        if (mx < 0) mx = 0;
        if (mx > canvas.width) mx = canvas.width;
        if (my < 0) my = 0;
        if (my > canvas.height) my = canvas.height;

        if (drawingLasso) {
            // Solo registrar si el punto es diferente del último para evitar duplicados
            const lastPt = drawingLassoPoints[drawingLassoPoints.length - 1];
            if (!lastPt || Math.abs(lastPt.x - mx) > 1 || Math.abs(lastPt.y - my) > 1) {
                drawingLassoPoints.push({ x: mx, y: my });
            }
            drawAnnotations();
        } else if (drawingNewBox) {
            newBoxEnd = { x: mx, y: my };
            drawAnnotations();
        } else if (draggedAnnotationIndex !== -1) {
            const dx = mx - dragStartPos.x;
            const dy = my - dragStartPos.y;
            
            const ann = annotations[draggedAnnotationIndex];
            let canvasRect = normalizedToCanvas(ann.box_2d, canvas);
            let oldCanvasRect = { ...canvasRect };

            if (draggedHandle === 'move') {
                canvasRect.x += dx;
                canvasRect.y += dy;
                
                // Limitar al canvas
                if (canvasRect.x < 0) canvasRect.x = 0;
                if (canvasRect.y < 0) canvasRect.y = 0;
                if (canvasRect.x + canvasRect.width > canvas.width) canvasRect.x = canvas.width - canvasRect.width;
                if (canvasRect.y + canvasRect.height > canvas.height) canvasRect.y = canvas.height - canvasRect.height;
            } else {
                // Redimensión
                const h = draggedHandle;
                if (h.includes('t')) {
                    canvasRect.y += dy;
                    canvasRect.height -= dy;
                }
                if (h.includes('b')) {
                    canvasRect.height += dy;
                }
                if (h.includes('l')) {
                    canvasRect.x += dx;
                    canvasRect.width -= dx;
                }
                if (h.includes('r')) {
                    canvasRect.width += dx;
                }

                // Dimensiones mínimas
                const minDim = 6;
                if (canvasRect.width < minDim) {
                    if (h.includes('l')) {
                        const right = canvasRect.x + canvasRect.width;
                        canvasRect.x = right - minDim;
                        canvasRect.width = minDim;
                    } else if (h.includes('r')) {
                        canvasRect.width = minDim;
                    }
                }
                if (canvasRect.height < minDim) {
                    if (h.includes('t')) {
                        const bottom = canvasRect.y + canvasRect.height;
                        canvasRect.y = bottom - minDim;
                        canvasRect.height = minDim;
                    } else if (h.includes('b')) {
                        canvasRect.height = minDim;
                    }
                }

                // Limitar al canvas
                if (canvasRect.x < 0) {
                    canvasRect.width += canvasRect.x;
                    canvasRect.x = 0;
                }
                if (canvasRect.y < 0) {
                    canvasRect.height += canvasRect.y;
                    canvasRect.y = 0;
                }
                if (canvasRect.x + canvasRect.width > canvas.width) {
                    canvasRect.width = canvas.width - canvasRect.x;
                }
                if (canvasRect.y + canvasRect.height > canvas.height) {
                    canvasRect.height = canvas.height - canvasRect.y;
                }
            }

            // Escalar puntos del lazo correspondientemente al mover/redimensionar la caja
            if (ann.points && ann.points.length > 0) {
                scaleAnnotationPoints(ann, oldCanvasRect, canvasRect, canvas);
            }

            ann.box_2d = canvasToNormalized(canvasRect, canvas);
            dragStartPos = { x: mx, y: my };
            drawAnnotations();
            updateAnnotationsHighlightInList();
        } else {
            updateCursorAndHover(e);
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        const rect = canvas.getBoundingClientRect();
        let mx = e.clientX - rect.left;
        let my = e.clientY - rect.top;
        if (mx < 0) mx = 0;
        if (mx > canvas.width) mx = canvas.width;
        if (my < 0) my = 0;
        if (my > canvas.height) my = canvas.height;

        if (drawingLasso) {
            drawingLasso = false;
            if (drawingLassoPoints.length >= 3) {
                let minX = Infinity;
                let maxX = -Infinity;
                let minY = Infinity;
                let maxY = -Infinity;
                
                drawingLassoPoints.forEach(pt => {
                    if (pt.x < minX) minX = pt.x;
                    if (pt.x > maxX) maxX = pt.x;
                    if (pt.y < minY) minY = pt.y;
                    if (pt.y > maxY) maxY = pt.y;
                });
                
                const w = maxX - minX;
                const h = maxY - minY;
                
                if (w > 4 && h > 4) {
                    const normalizedPoints = drawingLassoPoints.map(pt => ({
                        x: (pt.x / canvas.width) * 1000,
                        y: (pt.y / canvas.height) * 1000
                    }));
                    
                    const boxRect = {
                        x: minX,
                        y: minY,
                        width: w,
                        height: h
                    };
                    const box_2d = canvasToNormalized(boxRect, canvas);
                    
                    const newAnn = {
                        id: Date.now(),
                        type: activeTool,
                        box_2d: box_2d,
                        points: normalizedPoints,
                        description: capitalizeFirstLetter(activeTool)
                    };
                    annotations.push(newAnn);
                    selectedAnnotationIndex = annotations.length - 1;
                    updateAnnotationsList();
                }
            }
            drawingLassoPoints = [];
        } else if (drawingNewBox) {
            drawingNewBox = false;
            const w = Math.abs(mx - newBoxStart.x);
            const h = Math.abs(my - newBoxStart.y);
            
            if (w > 6 && h > 6) {
                const boxRect = {
                    x: Math.min(newBoxStart.x, mx),
                    y: Math.min(newBoxStart.y, my),
                    width: w,
                    height: h
                };
                const box_2d = canvasToNormalized(boxRect, canvas);
                const newAnn = {
                    id: Date.now(),
                    type: activeTool,
                    box_2d: box_2d,
                    description: capitalizeFirstLetter(activeTool)
                };
                annotations.push(newAnn);
                selectedAnnotationIndex = annotations.length - 1;
                updateAnnotationsList();
            }
        }
        
        draggedAnnotationIndex = -1;
        draggedHandle = null;
        drawAnnotations();
    });
}

// Carga dinámica de modelos de Gemini
async function loadVisionModels() {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey || visionModelsLoaded) return;
    try {
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!listRes.ok) return;
        const listData = await listRes.json();
        
        let availableModels = listData.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
        const MODELOS_EXCLUIDOS = ['computer-use','robotics','embedding','aqa','imagen','veo','tts','vision','thinking','learnlm','gemma'];
        availableModels = availableModels.filter(m => !MODELOS_EXCLUIDOS.some(x => m.name.toLowerCase().includes(x)));

        const isModernModel = (name) => {
            const n = name.toLowerCase();
            return n.includes('1.5') || n.includes('2.0') || n.includes('2.5') || n.includes('pro') || n.includes('flash');
        };
        availableModels = availableModels.filter(m => isModernModel(m.name));

        if (visionModelSelect && availableModels.length > 0) {
            // Limpiar excepto auto y opciones Claude (Opus 4.8 / Sonnet 5)
            visionModelSelect.innerHTML = `
                <option value="auto">🔍 Selección Automática (Mejor disponible)</option>
                <option value="claude-opus-4-8">Claude Opus 4.8 (Anthropic)</option>
                <option value="claude-sonnet-5">Claude Sonnet 5 (Anthropic)</option>
            `;
            
            // Priorización: 1) Pro, 2) Flash 2.x, 3) Flash 1.5
            const getPriority = (name) => {
                const n = name.toLowerCase();
                if (n.includes('gemini-3')) return 4;
                if (n.includes('2.5-pro') || n.includes('1.5-pro')) return 3;
                if (n.includes('2.5-flash') || n.includes('2.0-flash')) return 2;
                if (n.includes('1.5-flash')) return 1;
                return 0;
            };
            availableModels.sort((a, b) => getPriority(b.name) - getPriority(a.name));

            availableModels.forEach(model => {
                const mName = model.name.replace('models/', '');
                const option = document.createElement('option');
                option.value = mName;
                
                let displayName = mName;
                if (mName.includes('1.5-pro')) displayName = 'Gemini 1.5 Pro (Alta Precisión)';
                else if (mName.includes('2.0-flash-exp')) displayName = 'Gemini 2.0 Flash (Experimental)';
                else if (mName.includes('2.0-flash')) displayName = 'Gemini 2.0 Flash (Rápido y Preciso)';
                else if (mName.includes('1.5-flash-8b')) displayName = 'Gemini 1.5 Flash 8B (Ligero)';
                else if (mName.includes('1.5-flash')) displayName = 'Gemini 1.5 Flash (Rápido)';
                
                option.textContent = displayName;
                visionModelSelect.appendChild(option);
            });
            visionModelsLoaded = true;
        }
    } catch (err) {
        console.error("Error al cargar modelos de visión:", err);
    }
}

if (visionBtn) {
    visionBtn.addEventListener('click', () => {
        visionModal.classList.remove('hidden');
        loadVisionModels();
        setTimeout(resizeCanvas, 100);
    });
}
if (closeVisionBtn) {
    closeVisionBtn.addEventListener('click', () => visionModal.classList.add('hidden'));
}

window.addEventListener('resize', resizeCanvas);

// Definir la función de chips de prompt globalmente
window.selectPresetChip = function(chip) {
    const presetChips = document.querySelectorAll('.preset-chip');
    presetChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const visionPromptInput = document.getElementById('vision-prompt-input');
    if (visionPromptInput) {
        visionPromptInput.value = chip.getAttribute('data-prompt');
        visionPromptInput.focus();
    }
};

// Configurar interactividad de los chips de presets (dinámico)
const presetChips = document.querySelectorAll('.preset-chip');
presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
        window.selectPresetChip(chip);
    });
});

if (visionPromptInput) {
    visionPromptInput.addEventListener('input', () => {
        let matched = false;
        presetChips.forEach(chip => {
            if (visionPromptInput.value === chip.getAttribute('data-prompt')) {
                chip.classList.add('active');
                matched = true;
            } else {
                chip.classList.remove('active');
            }
        });
    });
}

// Iniciar escuchas para canvas
initCanvasEvents();

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
                    visionPreviewImg.onload = () => {
                        resizeCanvas();
                        const toolbar = document.getElementById('vision-annotation-toolbar');
                        if (toolbar) toolbar.classList.remove('hidden');
                    };
                    visionPreviewImg.src = dataUrl;
                    visionPreviewImg.classList.remove('hidden');
                }
                const container = document.getElementById('vision-canvas-container');
                if (container) container.classList.remove('hidden');
                
                const placeholder = document.querySelector('.paste-placeholder');
                if (placeholder) placeholder.style.display = 'none';
                
                currentVisionBase64 = dataUrl.split(',')[1];
                
                // Limpiar anotaciones al cargar una nueva imagen
                annotations = [];
                selectedAnnotationIndex = -1;
                hoveredAnnotationIndex = -1;
                updateAnnotationsList();
                
                setTimeout(() => { if (visionPromptInput) visionPromptInput.focus(); }, 100);
            };
            reader.readAsDataURL(blob);
        }
    });
}

// Drag & Drop de imagen
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
                        visionPreviewImg.onload = () => {
                            resizeCanvas();
                            const toolbar = document.getElementById('vision-annotation-toolbar');
                            if (toolbar) toolbar.classList.remove('hidden');
                        };
                        visionPreviewImg.src = dataUrl;
                        visionPreviewImg.classList.remove('hidden');
                    }
                    const container = document.getElementById('vision-canvas-container');
                    if (container) container.classList.remove('hidden');
                    
                    const placeholder = document.querySelector('.paste-placeholder');
                    if (placeholder) placeholder.style.display = 'none';
                    
                    currentVisionBase64 = dataUrl.split(',')[1];
                    
                    // Limpiar anotaciones al cargar una nueva imagen
                    annotations = [];
                    selectedAnnotationIndex = -1;
                    hoveredAnnotationIndex = -1;
                    updateAnnotationsList();
                    
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
        const selectedModelValue = visionModelSelect ? visionModelSelect.value : 'auto';
        let apiKey = null;

        if (selectedModelValue.startsWith('claude')) {
            const anthropicKey = localStorage.getItem('anthropic_api_key');
            if (!anthropicKey) {
                alert('Debes configurar tu API Key de Anthropic primero en la configuración.');
                return;
            }
        } else {
            apiKey = localStorage.getItem('gemini_api_key');
            if (!apiKey) {
                alert('Debes configurar tu API Key de Gemini primero en la configuración.');
                return;
            }
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
            let successResponse = null;
            let lastErrorMsg = "";

            if (selectedModelValue.startsWith('claude')) {
                const anthropicKey = localStorage.getItem('anthropic_api_key');
                const payload = {
                    model: selectedModelValue,
                    max_tokens: 4096,
                    system: RADIOLOGY_SYSTEM_PROMPT,
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "image",
                                    source: {
                                        type: "base64",
                                        media_type: currentVisionMimeType,
                                        data: currentVisionBase64
                                    }
                                },
                                {
                                    type: "text",
                                    text: userPrompt
                                }
                            ]
                        }
                    ]
                };

                try {
                    const response = await fetch('https://api.anthropic.com/v1/messages', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-api-key': anthropicKey,
                            'anthropic-version': '2023-06-01',
                            'anthropic-dangerous-direct-browser-access': 'true'
                        },
                        body: JSON.stringify(payload)
                    });

                    if (response.ok) {
                        const responseData = await response.json();
                        if (responseData.content && responseData.content.length > 0 && responseData.content[0].text) {
                            const resultText = responseData.content[0].text;
                            successResponse = {
                                candidates: [
                                    {
                                        content: {
                                            parts: [
                                                { text: resultText }
                                            ]
                                        }
                                    }
                                ]
                            };
                        } else {
                            lastErrorMsg = "No se pudo obtener respuesta de Claude.";
                        }
                    } else {
                        const errData = await response.json().catch(() => ({}));
                        lastErrorMsg = errData.error?.message || `HTTP ${response.status}`;
                    }
                } catch (err) {
                    console.error("Error al consultar Anthropic:", err);
                    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('CORS')) {
                        throw new Error(`Error de red al conectar con Anthropic. Esto suele deberse a restricciones de CORS del navegador para llamadas directas a APIs externas.\n\nSolución: Instala y activa una extensión de CORS bypass (ej: 'Allow CORS: Access-Control-Allow-Origin') en tu navegador o configura un proxy local.`);
                    } else {
                        throw err;
                    }
                }
            } else {
                let validModels = [];
                let availableModels = [];

            try {
                const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                if (listRes.ok) {
                    const listData = await listRes.json();
                    availableModels = listData.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
                    availableModels = availableModels.filter(m => !m.name.toLowerCase().includes('computer-use'));
                }
            } catch (listErr) {
                console.warn("No se pudo obtener la lista de modelos de Gemini dinámicamente en visión. Usando fallbacks.", listErr);
            }

            if (availableModels.length > 0) {
                if (selectedModelValue !== 'auto') {
                    const found = availableModels.find(m => m.name.endsWith(selectedModelValue));
                    if (found) validModels.push(found);
                }

                const priorityOrder = [
                    'gemini-2.5-flash',
                    'gemini-2.0-flash',
                    'gemini-2.0-flash-exp',
                    'gemini-1.5-pro',
                    'gemini-1.5-pro-latest',
                    'gemini-1.5-flash',
                    'gemini-1.5-flash-latest',
                    'gemini-1.5-flash-8b'
                ];

                priorityOrder.forEach(pName => {
                    const found = availableModels.find(m => m.name.endsWith(pName));
                    if (found && !validModels.find(vm => vm.name === found.name)) {
                        validModels.push(found);
                    }
                });

                availableModels.forEach(m => {
                    const isModern = m.name.includes('1.5') || m.name.includes('2.0') || m.name.includes('2.5') || m.name.includes('pro') || m.name.includes('flash');
                    if (isModern && !validModels.find(vm => vm.name === m.name)) {
                        validModels.push(m);
                    }
                });
            }

            if (validModels.length === 0) {
                if (selectedModelValue !== 'auto') {
                    validModels.push({ name: `models/${selectedModelValue}` });
                } else {
                    const fallbackModels = ['gemini-3.5-flash', 'gemini-3-flash', 'gemini-2.5-flash'];
                    fallbackModels.forEach(mName => {
                        validModels.push({ name: `models/${mName}` });
                    });
                }
            }

            const payload = {
                systemInstruction: {
                    parts: [{ text: RADIOLOGY_SYSTEM_PROMPT }]
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
                generationConfig: { 
                    temperature: 0.2,
                    responseMimeType: "application/json"
                }
            };

            let successResponse = null;
            let lastErrorMsg = "";

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
                    }
                } catch (err) {
                    lastErrorMsg = err.message;
                }
            }
            } // Fin del bloque else para Gemini

            if (!successResponse) {
                throw new Error(`Ningún modelo procesó la imagen. Último error: ${lastErrorMsg}`);
            }

            const data = successResponse;
            
            if (data.candidates && data.candidates.length > 0) {
                const resultText = data.candidates[0].content.parts[0].text;
                
                let reportText = "";
                let parsedDetections = [];
                
                try {
                    const cleanedJSON = cleanJSONString(resultText);
                    const parsed = JSON.parse(cleanedJSON);
                    reportText = parsed.reportMarkdown || "No se devolvió texto en el reporte.";
                    parsedDetections = parsed.suspicions || [];
                } catch (e) {
                    console.error("Error al parsear JSON de la IA:", e);
                    reportText = resultText;
                    parsedDetections = [];
                }

                visionResultText.innerHTML = parseMarkdownToHTML(reportText);
                visionResultContainer.classList.remove('hidden');

                // Procesar detecciones mapeadas
                annotations = parsedDetections.map((det, index) => {
                    let type = 'caries';
                    const labelLower = (det.label || '').toLowerCase();
                    const descLower = (det.description || '').toLowerCase();
                    const typeField = (det.type || '').toLowerCase();
                    
                    if (typeField === 'apical' || labelLower.includes('apical') || descLower.includes('apical') || labelLower.includes('infecc') || descLower.includes('infecc')) {
                        type = 'apical';
                    } else if (typeField === 'oseo' || labelLower.includes('oseo') || descLower.includes('oseo') || labelLower.includes('hueso') || descLower.includes('hueso') || labelLower.includes('periodon') || descLower.includes('periodon')) {
                        type = 'oseo';
                    }
                    
                    let box = det.box_2d || [0, 0, 0, 0];
                    // Si los valores están en rango 0.0 - 1.0 (float) en vez de 0 - 1000, los reescalamos
                    if (box.some(val => val > 0 && val <= 1.0)) {
                        const maxVal = Math.max(...box);
                        if (maxVal <= 1.0) {
                            box = box.map(val => Math.round(val * 1000));
                        }
                    }
                    
                    return {
                        id: Date.now() + index + Math.random(),
                        type: type,
                        box_2d: box,
                        label: det.label || capitalizeFirstLetter(type),
                        description: det.description || det.label || capitalizeFirstLetter(type)
                    };
                }).filter(ann => {
                    const [ymin, xmin, ymax, xmax] = ann.box_2d;
                    return (ymax > ymin && xmax > xmin && ymin >= 0 && xmin >= 0 && ymax <= 1000 && xmax <= 1000);
                });

                selectedAnnotationIndex = -1;
                hoveredAnnotationIndex = -1;

                updateAnnotationsList();
                resizeCanvas();
            } else {
                throw new Error("Gemini no devolvió ningún contenido.");
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

// === GESTIÓN DE INDICADOR DE SINCRONIZACIÓN ===
function updateSyncIndicator(state) {
    const indicator = document.getElementById('ai-sync-indicator');
    if (!indicator) return;

    // Resetear clases
    indicator.className = 'ai-sync-indicator ' + state;

    const iconSpan = indicator.querySelector('.indicator-icon');
    const textSpan = indicator.querySelector('.indicator-text');

    if (state === 'idle') {
        iconSpan.innerHTML = '<i data-lucide="sparkles"></i>';
        textSpan.textContent = 'Inteligencia al día';
    } else if (state === 'learning') {
        iconSpan.innerHTML = '<i data-lucide="refresh-cw"></i>';
        textSpan.textContent = 'Sincronizando...';
    } else if (state === 'success') {
        iconSpan.innerHTML = '<i data-lucide="check-circle-2"></i>';
        textSpan.textContent = '¡Corrección aprendida!';
    }
    
    // Re-crear iconos de Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// === COMPROBACIÓN ASÍNCRONA DE APRENDIZAJE ===
// ¿'editado' parece una EDICIÓN de 'original' (mismo informe con cambios menores),
// o es un texto totalmente nuevo (un dictado nuevo)? Evita aprender de textos no relacionados
// y evita llamadas inútiles a Gemini que ralentizaban el procesado.
function _pareceEdicion(original, editado) {
    if (!original || !editado) return false;
    const a = original.trim(), b = editado.trim();
    if (!a || !b) return false;
    const lenRatio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
    if (lenRatio < 0.5) return false; // longitudes muy distintas -> es un dictado nuevo
    const setA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
    const setB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
    let inter = 0;
    for (const w of setA) if (setB.has(w)) inter++;
    const union = new Set([...setA, ...setB]).size;
    const jaccard = union ? inter / union : 0;
    return jaccard >= 0.4; // comparten suficientes palabras -> es una edición real
}

async function triggerCorrectionCheck() {
    // Si hay un temporizador activo, lo limpiamos
    if (learnDebounceTimer) {
        clearTimeout(learnDebounceTimer);
        learnDebounceTimer = null;
    }

    const currentText = transcriptionArea ? transcriptionArea.value.trim() : '';
    const cleanLastSystemText = lastSystemText.trim();
    const apiKey = localStorage.getItem('gemini_api_key');

    if (!apiKey) return;
    if (!currentText || !cleanLastSystemText) {
        lastSystemText = currentText;
        return;
    }

    if (currentText !== cleanLastSystemText) {
        // Marcamos como sincronizado para evitar ejecuciones repetidas
        lastSystemText = currentText;
        // Solo aprendemos si el texto actual parece una EDICIÓN del informe anterior.
        // Si es un dictado nuevo (texto muy distinto), evitamos una llamada inútil a Gemini
        // que además competía por la cuota gratuita con el procesado real.
        if (_pareceEdicion(cleanLastSystemText, currentText)) {
            await learnCorrections(cleanLastSystemText, currentText, apiKey);
        }
    }
}

// === APRENDIZAJE AUTOMÁTICO DE CORRECCIONES ===
async function learnCorrections(original, edited, apiKey) {
    if (!original.trim() || !edited.trim() || original.trim() === edited.trim()) {
        return;
    }

    updateSyncIndicator('learning');

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
                // Evitamos duplicados, vacíos o que sean idénticas
                if (w && r && w !== r.toLowerCase() && !correctionsDict[w]) {
                    correctionsDict[w] = r;
                    correctionsMeta[w] = { auto: true, date: new Date().toLocaleDateString() };
                    addedCount++;
                }
            }

            if (addedCount > 0) {
                localStorage.setItem('custom_dict', JSON.stringify(correctionsDict));
                localStorage.setItem('custom_dict_meta', JSON.stringify(correctionsMeta));
                if (typeof renderDict === 'function') renderDict();
                console.log(`Aprendidas ${addedCount} nuevas correcciones.`);
                updateSyncIndicator('success');
                setTimeout(() => {
                    updateSyncIndicator('idle');
                }, 3000);
            } else {
                updateSyncIndicator('idle');
            }
        } else {
            updateSyncIndicator('idle');
        }
    } catch (e) {
        console.error("Error aprendiendo correcciones:", e);
        updateSyncIndicator('idle');
    }
}
