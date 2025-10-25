# Convert all backend files from CommonJS to ES modules

$files = Get-ChildItem -Path "pages/api" -Recurse -Filter "*.js"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Skip if already ES module
    if ($content -match "^import " -or $content -notmatch "require\(") {
        Write-Host "Skipping $($file.Name) - already ES module or no requires"
        continue
    }
    
    Write-Host "Converting $($file.FullName)"
    
    # Convert require statements to import
    $content = $content -replace "const\s+\{\s*([^}]+)\s*\}\s*=\s*require\('([^']+)'\);?", 'import { $1 } from ''$2'';'
    $content = $content -replace "const\s+(\w+)\s*=\s*require\('([^']+)'\);?", 'import $1 from ''$2'';'
    
    # Add .js extension to relative imports
    $content = $content -replace "from\s+'(\.\./[^']+)';", "from '`$1.js';"
    $content = $content -replace "from\s+'(\./[^']+)';", "from '`$1.js';"
    
    # Convert module.exports to export default
    $content = $content -replace "module\.exports\s*=\s*(\w+);?", 'export default $1;'
    
    # Write back
    Set-Content -Path $file.FullName -Value $content -NoNewline
}

Write-Host "Conversion complete!"
