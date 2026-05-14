$filePath = 'c:\Users\diego\Desktop\dictation-app\dictation-app\PLANTILLA MP.docx'
$templatesPath = 'c:\Users\diego\Desktop\dictation-app\dictation-app\templates.js'
$base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($filePath))
$jsLine = "`r`ntemplatesBase64['PLANTILLA_MP'] = `"$base64`";"
Add-Content $templatesPath $jsLine
