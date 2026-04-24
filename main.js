// Diccionario por defecto
const defaultCorrectionsDict = {
    "radio lúcido": "radiolúcido",
    "radio lucido": "radiolúcido",
    "radio paco": "radiopaco",
    "ápise": "ápice",
    "corticales": "corticales", 
    "osteo litico": "osteolítico",
    "osteolitico": "osteolítico",
    "peri apical": "periapical",
    "piso de ceno": "piso de seno",
    "ceno maxilar": "seno maxilar",
    "seno maxilar derecho": "seno maxilar derecho",
    "reabsorción osea": "reabsorción ósea",
    "reabsorcion osea": "reabsorción ósea",
    "pieza dos seis": "pieza 2.6",
    "pieza dos punto seis": "pieza 2.6",
    "endodoncia": "endodoncia",
    "periodontitis": "periodontitis apical",
    "lesión carios": "lesión cariosa",
    "caria": "caries"
};

let correctionsDict = { ...defaultCorrectionsDict };

// Cargar diccionario desde localStorage si existe
const savedDict = localStorage.getItem('custom_dict');
if (savedDict) {
    try {
        correctionsDict = JSON.parse(savedDict);
    } catch (e) {
        console.error("Error al leer el diccionario", e);
    }
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
    alert("Tu navegador no soporta la API de Reconocimiento de Voz. Por favor, utiliza Google Chrome o Microsoft Edge.");
}

const recognition = new SpeechRecognition();
recognition.lang = 'es-CL'; // Español de Chile. Cambiar a 'es-ES' o 'es-MX' si es necesario.
recognition.continuous = true; // Sigue grabando aunque haya pausas
recognition.interimResults = true; // Muestra resultados mientras se habla

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

// Función para reemplazar términos según el diccionario
function applyCorrections(text) {
    let correctedText = text;
    for (const [wrong, right] of Object.entries(correctionsDict)) {
        const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
        // Para respetar mayúsculas iniciales, se podría hacer un replace con función,
        // pero por simplicidad de uso médico, un reemplazo directo suele bastar.
        correctedText = correctedText.replace(regex, right);
    }
    
    // Auto-capitalización de la primera letra después de un punto
    correctedText = correctedText.replace(/(^\s*|[.!?]\s+)([a-z])/g, function(match, separator, letter) {
        return separator + letter.toUpperCase();
    });

    return correctedText;
}

// Eventos de Reconocimiento
recognition.onstart = () => {
    isRecording = true;
    recordBtn.classList.add('recording');
    recordText.innerText = 'Detener Dictado';
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
        recordText.innerText = 'Iniciar Dictado';
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
    }
    
    // Opcional: mostrar texto intermedio
    // Aquí solo actualizamos el scroll
    transcriptionArea.scrollTop = transcriptionArea.scrollHeight;
};

// Control de botones
recordBtn.addEventListener('click', () => {
    if (isRecording) {
        isRecording = false;
        recognition.stop();
    } else {
        try {
            recognition.start();
        } catch (e) {
            console.error("No se pudo iniciar:", e);
        }
    }
});

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

clearBtn.addEventListener('click', () => {
    if (confirm("¿Estás seguro de que deseas borrar todo el texto? Esta acción no se puede deshacer.")) {
        transcriptionArea.value = '';
        finalTranscript = '';
    }
});

// === Lógica de Configuración y Modal ===
// Cargar API Key si existe
const savedApiKey = localStorage.getItem('gemini_api_key');
if (savedApiKey) {
    apiKeyInput.value = savedApiKey;
}

configBtn.addEventListener('click', () => {
    configModal.classList.remove('hidden');
});

closeModalBtn.addEventListener('click', () => {
    configModal.classList.add('hidden');
});

saveKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        localStorage.setItem('gemini_api_key', key);
        alert('API Key guardada exitosamente en este navegador.');
        configModal.classList.add('hidden');
    } else {
        alert('Por favor ingresa una clave válida.');
    }
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
        
        // 2. Filtrar modelos que soportan generación de texto
        let validModels = listData.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
        
        // Filtrar agresivamente para usar SOLO modelos modernos (1.5 o superior)
        // Los modelos antiguos (1.0) alucinan y no soportan systemInstruction
        const modernModels = validModels.filter(m => m.name.includes('1.5') || m.name.includes('2.0') || m.name.includes('2.5'));
        if (modernModels.length > 0) {
            validModels = modernModels;
        }

        if (validModels.length === 0) throw new Error("Tu cuenta no tiene modelos modernos (1.5+) habilitados.");

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
            throw new Error(`Los modelos disponibles en tu cuenta gratuita están sin cuota o restringidos. Último error de Google: ${lastErrorMsg}`);
        }

        if (successResponse.candidates && successResponse.candidates.length > 0) {
            const resultText = successResponse.candidates[0].content.parts[0].text;
            transcriptionArea.value = resultText;
            finalTranscript = resultText;
            
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
const generateWordBtn = document.getElementById('generate-word-btn');
const templateSelect = document.getElementById('template-select');

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

generateWordBtn.addEventListener('click', () => {
    const selectedTemplateKey = templateSelect.value;
    const base64Template = templatesBase64[selectedTemplateKey];
    
    if (!base64Template) {
        alert("No se encontró la plantilla seleccionada. Asegúrate de tener templates.js configurado.");
        return;
    }

    const text = transcriptionArea.value.trim();
    if (!text) {
        alert("No hay informe para generar. Dicta o procesa con IA primero.");
        return;
    }
    
    // === Extracción Avanzada de Datos ===
    let dictValues = {
        PACIENTE: "Paciente",
        EDAD: "",
        DOCTOR: "",
        FECHA: "",
        ANTECEDENTES: "Sin antecedentes entregados",
        MOTIVO: "Sin antecedentes entregados",
        ESTUDIO: "",
        DIAGNOSTICO: text, // Por defecto todo el texto
        INFORME: text      // Soporte retrocompatible
    };

    const lines = text.split('\n').map(l => l.trim());
    
    // Extraer campos superiores de forma segura (todo lo que esté antes de ANT. CLÍNICOS)
    const headerLines = [];
    for (const line of lines) {
        if (!line) continue;
        // Si detecta el inicio de las secciones médicas, dejamos de leer el encabezado
        if (line.match(/^ANT\.\s*CLÍNICOS/i) || line.match(/^QUE DESEA SABER/i) || line.match(/^TIPO DE ESTUDIO/i)) {
            break;
        }
        headerLines.push(line);
    }

    if (headerLines.length > 0) {
        // Convertir el nombre a Title Case (cada palabra con mayúscula inicial)
        let rawName = headerLines[0].toLowerCase();
        dictValues.PACIENTE = rawName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
    if (headerLines.length > 1) dictValues.EDAD = headerLines[1];
    if (headerLines.length > 2) dictValues.DOCTOR = headerLines[2];
    if (headerLines.length > 3) dictValues.FECHA = headerLines[3];

    // Usar Regex para extraer el resto
    const antMatch = text.match(/ANT\. CLÍNICOS\s*:\s*(.+)/i);
    if (antMatch && antMatch[1]) dictValues.ANTECEDENTES = antMatch[1].trim();

    const motivoMatch = text.match(/QUE DESEA SABER\s*:\s*(.+)/i);
    if (motivoMatch && motivoMatch[1]) dictValues.MOTIVO = motivoMatch[1].trim();

    const estudioMatch = text.match(/TIPO DE ESTUDIO\s*:\s*(.+)/i);
    if (estudioMatch && estudioMatch[1]) dictValues.ESTUDIO = estudioMatch[1].trim();

    // Extraer todo lo que está después de "la impresión diagnóstica es la siguiente:"
    const diagMatch = text.split(/impresión diagnóstica es la siguiente:/i);
    if (diagMatch.length > 1) {
        // En caso de que se use más de una vez esa frase, unimos el resto.
        const diagText = diagMatch.slice(1).join("impresión diagnóstica es la siguiente:").trim();
        dictValues.DIAGNOSTICO = diagText;
        dictValues.INFORME = diagText;
    }

    try {
        const arrayBuffer = base64ToArrayBuffer(base64Template);
        const zip = new PizZip(arrayBuffer);
        const doc = new docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });
        
        // Renderizamos TODAS las variables
        doc.render(dictValues);
        
        const out = doc.getZip().generate({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
        
        // Usar el nombre del paciente exacto para el archivo
        const safePatientName = dictValues.PACIENTE.replace(/[^a-z0-9áéíóúñ -]/gi, '').trim() || 'Informe';
        const finalFileName = `${safePatientName}.docx`;
        
        window.saveAs(out, finalFileName);
        
    } catch (error) {
        console.error("Error al generar Word", error);
        let errorMsg = error.message;
        if (error.properties && error.properties.errors instanceof Array) {
            const errorMessages = error.properties.errors.map(function (err) {
                return err.properties.explanation;
            }).join("\n");
            errorMsg += "\n" + errorMessages;
        }
        alert("Hubo un error técnico al generar el Word:\n" + errorMsg + "\n\nAsegúrate de que tu plantilla tiene las etiquetas escritas correctamente: {PACIENTE}, {EDAD}, {DOCTOR}, {FECHA}, {ANTECEDENTES}, {MOTIVO}, {ESTUDIO}, {DIAGNOSTICO}");
    }
});
