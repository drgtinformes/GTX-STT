# Dictation App - Project Instructions & Context

## Project Overview
Esta es mi app de dictados programada desde gemini. Importala como un nuevo proyecto.  
**Tarea**: Haz una revisión exhaustiva de esta para poder comenzar a trabajar.

---

## Memory & Important Notes

### 1. main.js Large Edit Truncation
- **Verify main.js with `node --check` after edits** — it can truncate on large edits
- Always verify syntax after significant changes

### 2. No Git Writes in Sandbox
- ⚠️ Bindfs mount corrupts the git index on commit/add
- **Solution**: Commit host-side, not in the sandbox
- Use bash commands in the shell sandbox, then commit from your host terminal

### 3. Patient Data & Anonymization
- ✅ No need to raise anonymization concerns for this project
- Patient data privacy/anonymization is not a concern for this specific work

### 4. Sandbox Limitations - ASR Models
- ❌ **Cannot download speech recognition (ASR) models in the sandbox**
- Proxy allows only PyPI/npm — external model downloads are blocked
- **Workaround**: If transcription is needed, provide the transcript externally
- The sandbox cannot actually transcribe audio

### 5. docx Report Generation
- Use docxtemplater + DEFLATE for template-based document generation
- Replicates prepareDocument functionality
- Settings: QVA=default, HMS=CBCT-only

---

## Quick Setup
1. Load the app structure and dependencies
2. Identify core modules (likely main.js, config files, API integrations with Gemini)
3. Document architecture
4. Review for:
   - Code quality & patterns
   - Security considerations
   - Dependencies & versions
   - Configuration needs
   - Potential issues or tech debt

---

## User Contact
- **Email**: diegogtn@gmail.com
- **Date**: 2026-06-18

---

## Working Directory
- **Project Folder**: `C:\Users\diego\Desktop\CLAUDE PROYECTS\dictation-app`
- **Workspace Output**: Files saved here persist after sessions
